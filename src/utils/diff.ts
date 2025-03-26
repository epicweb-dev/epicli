import { gitUseRepo } from './repo.js'

const IGNORED_FILES = [
	'node_modules/**',
	'package-lock.json',
	'yarn.lock',
	'pnpm-lock.yaml',
	'dist/**',
	'.git/**',
	'coverage/**',
]

export interface DiffFile {
	path: string
	type: 'added' | 'deleted' | 'modified' | 'renamed'
	oldPath?: string
	content?: string
}

/**
 * Parses git diff output and categorizes changes by type
 */
export function parseDiff(diffOutput: string): DiffFile[] {
	const files: DiffFile[] = []
	const diffSections = diffOutput.split('diff --git ')

	// Skip the first empty section if it exists
	for (let i = diffSections[0] ? 0 : 1; i < diffSections.length; i++) {
		const section = diffSections[i]
		if (!section?.trim()) continue

		const lines = section.split('\n')
		const fileHeaderLine = lines[0]
		if (!fileHeaderLine) continue

		// Parse file names from diff header
		const [a, b] = fileHeaderLine.match(/a\/(.+) b\/(.+)/)?.slice(1) || []
		if (!a || !b) continue

		const isDeleted = lines.some((line) => line.startsWith('deleted file mode'))
		const isNew = lines.some((line) => line.startsWith('new file mode'))
		const isRename = lines.some((line) => line.startsWith('rename from'))
		const hasChanges = lines.some(
			(line) =>
				(line.startsWith('+') && !line.startsWith('+++')) ||
				(line.startsWith('-') && !line.startsWith('---')),
		)

		let file: DiffFile

		if (isNew) {
			file = { path: b, type: 'added' }
		} else if (isDeleted) {
			file = { path: a, type: 'deleted' }
		} else if (isRename) {
			// Find rename from and to lines
			const fromLine = lines.find((line) => line.startsWith('rename from'))
			const toLine = lines.find((line) => line.startsWith('rename to'))
			const oldPath = fromLine?.replace('rename from ', '')
			const newPath = toLine?.replace('rename to ', '')

			file = {
				path: newPath || b,
				oldPath: oldPath || a,
				type: hasChanges ? 'modified' : 'renamed',
			}
		} else {
			file = { path: b, type: 'modified' }
		}

		// Store diff content based on file type
		if (isNew) {
			// For new files, include the header and +++ line to help identify it as a new file
			// But the actual content extraction will happen in the commands.ts file
			const headerLines = [
				`diff --git a/${a} b/${b}`,
				lines.find((line) => line.startsWith('new file mode')) || '',
				lines.find((line) => line.startsWith('index')) || '',
				'--- /dev/null',
				`+++ b/${b}`,
			].filter(Boolean)

			// Then include all content lines (starting with +)
			const contentStartIndex = lines.findIndex((line) =>
				line.startsWith('+++'),
			)
			if (contentStartIndex >= 0) {
				file.content = [
					...headerLines,
					...lines.slice(contentStartIndex + 1),
				].join('\n')
			} else {
				// If we can't find the +++ line, just include all lines after the header
				const newFileModeIndex = lines.findIndex((line) =>
					line.startsWith('new file mode'),
				)
				if (newFileModeIndex >= 0) {
					file.content = [
						...headerLines,
						...lines
							.slice(newFileModeIndex + 1)
							.filter((line) => line.startsWith('+')),
					].join('\n')
				} else {
					file.content = [
						...headerLines,
						...lines.slice(1).filter((line) => line.startsWith('+')),
					].join('\n')
				}
			}
		} else if (!isDeleted) {
			// For modified or renamed files, include the header and context
			const headerLines = [`diff --git a/${a} b/${b}`]

			// Include relevant mode lines
			const modeLines = lines.filter(
				(line) =>
					line.startsWith('index ') ||
					line.startsWith('rename from') ||
					line.startsWith('rename to'),
			)

			headerLines.push(...modeLines)

			// Include --- and +++ lines for context
			const minusLine = lines.find((line) => line.startsWith('---'))
			const plusLine = lines.find((line) => line.startsWith('+++'))

			if (minusLine) headerLines.push(minusLine)
			if (plusLine) headerLines.push(plusLine)

			// Now include the actual diff content
			const contentStartIndex = lines.findIndex((line) =>
				line.startsWith('+++'),
			)
			if (contentStartIndex >= 0) {
				file.content = [
					...headerLines,
					...lines.slice(contentStartIndex + 1),
				].join('\n')
			} else {
				// If we couldn't find the standard content markers, include all lines after headers
				file.content = [
					...headerLines,
					...lines.slice(headerLines.length + 1),
				].join('\n')
			}
		}

		files.push(file)
	}

	return files
}

export async function getGitDiff(
	repoPath: string,
	options: {
		from?: string
		to?: string
		key?: string
	} = {},
) {
	const { git, cleanup } = await gitUseRepo(repoPath, {
		key: options.key,
	})

	try {
		// Use provided parameters or get defaults from the repo
		let fromCommit = options.from
		let toCommit = options.to

		// If from/to not provided, get them from the repo
		if (!fromCommit || !toCommit) {
			const log = await git.log()
			if (!log.all.length) {
				throw new Error('No commits found in repository')
			}

			fromCommit = fromCommit || log.all[log.all.length - 1]?.hash
			toCommit = toCommit || log.all[0]?.hash
		}

		if (!fromCommit || !toCommit) {
			throw new Error('Could not determine commit range')
		}

		const gitOptions = [toCommit, '--', ...IGNORED_FILES.map((f) => `:!${f}`)]
		return fromCommit === toCommit
			? // one commit
				await git.show(gitOptions)
			: // multiple commits
				await git.diff([fromCommit, ...gitOptions])
	} finally {
		if (!options.key) {
			await cleanup()
		}
	}
} 
