import { existsSync } from 'node:fs'
import { writeFile, mkdir, rm } from 'node:fs/promises'
import { join, dirname, normalize } from 'node:path'
import chalk from 'chalk'
import { minimatch } from 'minimatch'
import prompts from 'prompts'
import { getGitDiff, parseDiff, type DiffFile } from './diff.js'
import { checkGitWorkingTree } from './repo.js'

export async function applyChanges({
	workingDir = process.cwd(),
	repo,
	key,
	commits,
	files,
	filterPatterns,
	ignorePatterns,
	instructions,
	onComplete,
}: {
	workingDir?: string
	repo: string
	key?: string
	commits: Array<{ hash: string; date: string }>
	files?: Array<string>
	filterPatterns?: Array<string>
	ignorePatterns?: Array<string>
	instructions?: string
	onComplete?: () => Promise<void>
}) {
	const firstCommit = commits[0]
	const lastCommit = commits[commits.length - 1]

	if (!firstCommit || !lastCommit) {
		throw new Error('No commits found in repository')
	}

	const diff = await getGitDiff(repo, {
		from: firstCommit.hash,
		to: lastCommit.hash,
		key,
	})

	// Parse all diffs by type
	const diffFiles = parseDiff(diff)

	// Filter files if specific files or patterns were requested
	const diffs =
		files?.length || filterPatterns?.length || ignorePatterns?.length
			? diffFiles.filter((file) => {
					const normalizedPath = normalize(file.path)

					// First check exact file matches (highest precedence)
					if (files?.length) {
						const exactMatch = files.some((pattern) => {
							const normalizedPattern = normalize(pattern)
							return (
								normalizedPath.endsWith(normalizedPattern) ||
								(file.type === 'renamed' &&
									normalize(file.oldPath || '') === normalizedPattern)
							)
						})
						if (exactMatch) return true
					}

					// Then check ignore patterns (second highest precedence)
					if (ignorePatterns?.length) {
						const shouldIgnore = ignorePatterns.some((pattern) => {
							if (pattern.includes('*')) {
								return minimatch(normalizedPath, pattern)
							}
							return normalizedPath.includes(pattern)
						})
						if (shouldIgnore) return false
					}

					// Finally check include patterns (lowest precedence)
					if (filterPatterns?.length) {
						return filterPatterns.some((pattern) => {
							if (pattern.includes('*')) {
								return minimatch(normalizedPath, pattern)
							}
							return normalizedPath.includes(pattern)
						})
					}

					// If only ignore patterns are present, include the file if it wasn't ignored
					return true
				})
			: diffFiles

	const filterCount =
		(files?.length || 0) +
		(filterPatterns?.length || 0) +
		(ignorePatterns?.length || 0)
	if (filterCount > 0) {
		console.log(
			chalk.bold('\n📋 Files matching'),
			filterPatterns?.join(', ') || '',
			files?.join(', ') || '',
			ignorePatterns?.length
				? chalk.red(`\n  Excluding: ${ignorePatterns.join(', ')}`)
				: '',
		)
	} else {
		console.log(chalk.blue(`\n📋 Files`))
	}

	if (diffs.length === 0) {
		console.log(chalk.dim('  No files to update'))
		return
	}

	const outputDir = join(workingDir, '_epicli-patches')

	// Preview the changes first
	await processFileOperations({
		dryRun: true,
		workingDir,
		outputDir,
		diffs,
		update: { commits, instructions },
		onComplete,
	})

	// Check if git working tree is clean
	const isClean = await checkGitWorkingTree(workingDir)
	if (!isClean) {
		console.log('') // line break before prompt
		const { proceed } = await prompts({
			type: 'confirm',
			name: 'proceed',
			message: chalk.yellow('Git working tree is not clean. Proceed anyway?'),
			initial: false,
		})

		if (!proceed) {
			console.log(
				chalk.blue(
					'Update canceled. Please commit or stash your changes first.',
				),
			)
			process.exit(0)
		}
	}

	// Check if patches directory already exists
	if (existsSync(outputDir)) {
		console.log('') // line break before prompt
		const { clearUpdates } = await prompts({
			type: 'confirm',
			name: 'clearUpdates',
			message: chalk.yellow(
				`Patches directory found at ${chalk.bold(outputDir)}.\nDo you want to replace the existing patches?`,
			),
			initial: false,
		})

		if (clearUpdates) {
			await rm(outputDir, { recursive: true, force: true })
		} else {
			console.log(
				chalk.blue(
					'Update canceled. Please handle the existing patches first.',
				),
			)
			process.exit(0)
		}
	} else {
		console.log('')
		// prompt user to confirm
		const { confirm } = await prompts({
			type: 'confirm',
			name: 'confirm',
			message: chalk.yellow('Are you sure you want to apply these changes?'),
			initial: false,
		})

		if (!confirm) {
			console.log(chalk.blue('Update canceled.'))
			process.exit(0)
		}
	}

	await mkdir(outputDir, { recursive: true })

	// TODO: make dry run output to a temp dir, and then this step just copies into the output dir
	// That will fix the double logging issue
	await processFileOperations({
		dryRun: false,
		workingDir,
		outputDir,
		diffs,
		update: { commits, instructions },
		onComplete,
	})
}

async function preCheckFiles({
	workingDir,
	filesToAdd,
	movedToPatch,
	dryRun,
}: {
	workingDir: string
	filesToAdd: DiffFile[]
	movedToPatch: DiffFile[]
	dryRun: boolean
}) {
	if (!dryRun) {
		for (const file of [...filesToAdd]) {
			const filePath = join(workingDir, file.path)
			if (existsSync(filePath)) {
				movedToPatch.push(file)
			}
		}
	}
	return filesToAdd.length - movedToPatch.length
}

async function processFileOperations({
	dryRun,
	workingDir,
	outputDir,
	diffs,
	update,
	onComplete,
}: {
	dryRun: boolean
	workingDir: string
	outputDir: string
	diffs: DiffFile[]
	update?: {
		commits: { hash: string; date: string }[]
		instructions?: string
	}
	onComplete?: () => Promise<void>
}) {
	const relativeUpdatesDir = outputDir.replaceAll(/^[\.//]+/g, '')

	// Group files by operation type
	const filesToAdd = diffs.filter((file) => file.type === 'added')
	const filesToModify = diffs.filter(
		(file) => file.type === 'modified' || file.type === 'renamed',
	)
	const deletedFiles = diffs.filter((file) => file.type === 'deleted')

	// Track files that were moved from additions to patches
	const movedToPatch: DiffFile[] = []

	// Pre-check for files that already exist
	const actualFilesToAdd = await preCheckFiles({
		workingDir,
		filesToAdd,
		movedToPatch,
		dryRun,
	})

	// Handle additions
	console.log(chalk.green(`${chalk.bold('Adding')} ${actualFilesToAdd}`))

	if (actualFilesToAdd > 0) {
		for (const file of filesToAdd) {
			// Skip files we already know exist
			if (movedToPatch.includes(file)) {
				continue
			}

			console.log(chalk.green('A'), file.path)

			if (!dryRun && file.content) {
				try {
					const filePath = join(workingDir, file.path)

					// Double-check in case the file was created since our pre-check
					if (existsSync(filePath)) {
						// Silently convert to patch
						const patchName = pathToFilename(file.path)
						const patchFile = join(outputDir, patchName)

						await writeFile(patchFile, file.content || '')
						movedToPatch.push(file)
						continue
					}

					// Create directory if it doesn't exist
					await mkdir(dirname(filePath), { recursive: true })

					// Extract clean file content without diff markers
					const lines = file.content.split('\n')

					// First, find where the content actually starts
					const diffHeaderEndIndex = lines.findIndex((line) =>
						line.startsWith('+++'),
					)

					// Extract all lines after the header that start with '+', but remove the '+' prefix
					const fileContent = lines
						.slice(diffHeaderEndIndex + 1) // Skip past the +++ line
						.filter((line) => line.startsWith('+')) // Only keep added lines
						.map((line) => line.substring(1)) // Remove the '+' prefix
						.join('\n')

					await writeFile(filePath, fileContent)
				} catch (error) {
					if (error instanceof Error) {
						console.log(chalk.red(`    ✗ Failed to create: ${error.message}`))
					} else {
						console.log(chalk.red(`    ✗ Failed to create: ${error}`))
					}
				}
			}
		}
	}

	// Handle deletions
	console.log(chalk.red(`${chalk.bold('Deleting')} ${deletedFiles.length}`))

	for (const file of deletedFiles) {
		console.log(chalk.red('D'), file.path)

		if (!dryRun) {
			try {
				const filePath = join(workingDir, file.path)
				await rm(filePath)
			} catch (error) {
				if (error instanceof Error) {
					console.log(chalk.red(`    ✗ Failed to delete: ${error.message}`))
				} else {
					console.log(chalk.red(`    ✗ Failed to delete: ${error}`))
				}
			}
		}
	}

	// Handle modifications
	console.log(
		chalk.cyan(
			`${chalk.bold('Modifying')} ${
				filesToModify.length + movedToPatch.length
			}`,
		),
	)

	if (filesToModify.length > 0 || movedToPatch.length > 0) {
		let writtenFiles = [] as Array<string>

		// Handle regular modifications
		for (const file of filesToModify) {
			if (file.type === 'renamed') {
				console.log(chalk.magenta('R'), file.oldPath, '→', file.path)
			} else {
				console.log(chalk.cyan('M'), file.path)
			}

			if (!dryRun) {
				// Skip creating patches for image files
				if (isImageFile(file.path)) {
					console.log(chalk.dim(`    (Skipping patch for image file)`))
					continue
				}

				// Special handling for package.json
				if (file.path === 'package.json' && file.content) {
					// Filter out epic-stack property changes
					const lines = file.content.split('\n')
					const filteredLines = lines.filter((line) => {
						const trimmedLine = line.trim()
						return (
							!trimmedLine.includes('"epic-stack"') &&
							!trimmedLine.includes('"head"') &&
							!trimmedLine.includes('"date"')
						)
					})

					// Only create a patch if there are other changes
					if (filteredLines.length < lines.length) {
						const patchName = pathToFilename(file.path)
						const patchFile = join(outputDir, patchName)
						await writeFile(patchFile, filteredLines.join('\n'))
						writtenFiles.push(patchName)
					}
					continue
				}

				const patchName = pathToFilename(file.path)
				const patchFile = join(outputDir, patchName)

				// Write the patch file for manual application by the user
				await writeFile(patchFile, file.content || '')
				writtenFiles.push(patchName)
			}
		}

		// Include files that were moved from additions to patches
		for (const file of movedToPatch) {
			console.log(chalk.cyan('M'), file.path)

			if (!dryRun) {
				// Skip creating patches for image files
				if (isImageFile(file.path)) {
					console.log(chalk.dim(`    (Skipping patch for image file)`))
					continue
				}

				const patchName = pathToFilename(file.path)
				const patchFile = join(outputDir, patchName)
				// Write the patch file for manual application by the user
				await writeFile(patchFile, file.content || '')
				writtenFiles.push(patchName)
			}
		}

		if (!dryRun) {
			if (onComplete) {
				await onComplete()
			}

			console.log(chalk.bold('\n📝 Next steps:'))
			console.log(
				'  1. Review the files that have been created. Delete any that are not needed.',
			)
			console.log(
				`  2. Using Cursor, Claude Code, or another AI editor, ask it to apply the patches in the ${chalk.bold('epicli-patches')} directory.  Here is a sample prompt:`,
			)
			console.log('\n---COPY-AND-RUN-THIS-PROMPT---')
			console.log(
				chalk.whiteBright(
					[
						`The files in ${relativeUpdatesDir} are upstream patches from a similar project and we want to apply similar changes here.`,
						`The project is a bit different so the patch might not match exactly, but do your best to apply it anyway.`,
						`For each patch, follow these steps before working on the next patch until all patches are applied:`,
						`1. If it appears the patch has not yet been applied, apply it to the matching file in ${workingDir}, otherwise continue to the next step.`,
						`2. Delete the patch file.`,
						'',
						`Once you've finished applying all the patches, delete the ${relativeUpdatesDir} directory.`,
						'',
						`Here are some general notes:`,
						`- Focus on the changed lines, not the surrounding code.`,
						`- Ignore formatting changes.`,
						`- Ignore lint/type errors.`,
						update?.instructions || '',
					].join('\n'),
				),
			)
			console.log('------------------------------\n')
		}
	}
}

function pathToFilename(path: string) {
	// .cursor.rules.avoid-use-effect.mdc.diff
	return `${path.replace(/^\./, '_.').replaceAll('/', '_')}.patch`
}

/**
 * Determines if a file is an image based on its extension
 */
function isImageFile(path: string): boolean {
	const imageExtensions = [
		'.jpg',
		'.jpeg',
		'.png',
		'.gif',
		'.svg',
		'.webp',
		'.ico',
		'.bmp',
		'.tiff',
	]
	const ext = path.substring(path.lastIndexOf('.')).toLowerCase()
	return imageExtensions.includes(ext)
}
