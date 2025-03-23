import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { invariant } from '@epic-web/invariant'
import chalk from 'chalk'
import { z } from 'zod'
import { applyChanges } from '../utils/core.js'
import { printCommits } from '../utils/print-commits.js'
import { gitUseRepo } from '../utils/repo.js'

const epicStackBookmarks = [
	{
		commit: '62e65077269d803627418677f180a77aab2bff53',
		description: 'Use native ESM',
	},
	{
		commit: 'bc93804353cf89c8c901e1a8b629ad25ac0a4e3c',
		description: 'Add shadcn/ui',
	},
	{
		commit: '5cb51100ddc97cd31ec53036c42f7fae7ff15572',
		description: 'Bring improvements from workshops',
	},
	{
		commit: '49897824f942576c32aba6876ff52e323eec5144',
		description: 'Change relative imports to node resolution',
	},
	{
		commit: '90ef60d4b2e762a1888fc72abd71f40a5142f978',
		description: 'Update @epic-web/config',
	},
	{
		commit: '158ed99889e628410cf760e78bb07e09622a87e4',
		description: 'React Router v7',
		instructions:
			'This update migrates @remix-run/* to react-router and @react-router/node. Pay special attention to the imports.',
	},
	{
		commit: 'c33b520795f7cb713894f535e23d7c7400932853',
		description: 'v7 typegen',
		instructions:
			'Route types are now imported from a typegen +types/ directory which is created by running `npx react-router typegen`. It is ok to leave module resolution errors here while you are patching, we can run the typegen once at the very end.',
	},
	{
		commit: '0345ff7d775569352a18f13908c817623e2981d5',
		description: 'Move images from SQLite to Tigris',
	},
]

export async function update({
	baseSha: baseShaInput,
	directory: workingDir = process.cwd(),
	files,
	filterPatterns,
	ignorePatterns,
}: {
	baseSha?: string
	headSha?: string
	directory?: string
	files?: string[]
	filterPatterns?: string[]
	ignorePatterns?: string[]
}) {
	const baseSha =
		baseShaInput ?? (await getHeadFromPackageJson({ cwd: workingDir }))
	invariant(baseSha, 'No base SHA found')

	// next we need to fetch all commits for the repo
	const updates = await getEpicStackUpdates({ baseSha })
	const update = updates.at(0)
	if (!update) {
		console.log(chalk.green('\n✅ No updates found'))
		return
	}

	// Get the final commit's package.json epic-stack values
	const finalCommit = update.commits.at(-1)
	invariant(finalCommit, 'No final commit found')

	console.log(
		chalk.yellow(`\n🔄 Updating ${workingDir} from ${baseSha.slice(0, 7)}`),
	)

	console.log(
		chalk.bold(`🔄 ${update.label}`),
		`(${update.commits.length} commits)`,
	)

	printCommits(update.commits)

	// Show future updates
	for (const futureUpdate of updates.slice(1)) {
		console.log(
			'Future: ',
			chalk.dim(
				chalk.bold(`🔄 ${futureUpdate.label}`),
				`(${futureUpdate.commits.length} commits)`,
			),
		)
	}

	await applyChanges({
		workingDir,
		repo: 'https://github.com/epicweb-dev/epic-stack.git',
		commits: update.commits,
		files,
		filterPatterns,
		ignorePatterns,
		instructions: update.instructions,
		onComplete: async () => {
			const lastCommit = update.commits.at(-1)
			if (!lastCommit) return

			await writeFile(
				join(workingDir, '_epicli-patches', '_DO_THIS_FILE_LAST.prompt'),
				`
Check to see how many files are in ${join(workingDir, '_epicli-patches')}

If there is more than one, stop reading this file and go back to processing the other patches. 

If this is the only file, complete these closing steps. 
1. Update the "epic-stack" property in the package.json to the following:

"epic-stack": {
  "head": "${lastCommit.hash}",
  "date": "${lastCommit.date}"
}

2. Delete the _epicli-patches directory.
3. Thank the user for using epicli, and tell them to run \`epicli update\` to check for any remaining updates.
`,
			)
		},
	})
}


export async function getEpicStackUpdates({ baseSha }: { baseSha: string }) {
	const { git } = await gitUseRepo(
		'https://github.com/epicweb-dev/epic-stack.git',
		{ key: 'epic-stack' },
	)

	console.log(baseSha)
	
	try {

		const log = await git.log({
			from: baseSha,
			'--reverse': null, // oldest to newest
		})

		const updates = []
		let batch = []

		for (const commit of log.all) {
			const matchingBookmark = epicStackBookmarks.find(
				(bookmark) => bookmark.commit === commit.hash,
			)

			if (matchingBookmark || !commit.message.includes('[skip ci]')) {
				// if a bookmark happens to be a skip ci commit, include it anyway
				batch.push(commit)
			}

			if (matchingBookmark) {
				updates.push({
					label: matchingBookmark.description,
					commits: batch,
					instructions: matchingBookmark.instructions,
				})
				batch = []
			}
		}

		if (batch.length) {
			updates.push({
				label: 'Latest commits',
				commits: batch,
				instructions: '',
			})
		}

		return updates
	} catch (error) {
		if (error instanceof Error && error.message.includes('Invalid symmetric difference expression')) {
			console.error(chalk.red('\n❌ Error:'), `The commit ${baseSha} does not exist in the epic-stack repository.`)
			// TODO: technically the wrong suggestion, since user can pass any baseSha into this function
			console.error('Please check that you have the correct commit hash in your package.json.')
			process.exit(1)
		}
		console.error(chalk.red('\n❌ Error:'), error)
		process.exit(1)
	} finally {
		// await cleanup()
	}
}


const PackageJsonSchema = z.object({
	'epic-stack': z.union([
		z.object({
			head: z.string(),
			date: z.string(),
		}),
		z.literal(true), // "epic-stack": true, was used for a while
	]),
})

async function readPackageJson({ cwd }: { cwd: string }) {
	try {
		const packageJsonString = await readFile(join(cwd, 'package.json'), 'utf8')
		const packageJson = PackageJsonSchema.safeParse(
			JSON.parse(packageJsonString),
		)

		if (!packageJson.success) {
			console.error(packageJsonString)
			process.exit(1)
		}

		return packageJson.data
	} catch (error) {
		console.error(chalk.red('\n❌ Error:'), error)
		process.exit(1)
	}
}

async function getHeadFromPackageJson({ cwd }: { cwd: string }) {
	const packageJson = await readPackageJson({ cwd })

	if (packageJson['epic-stack'] === true) {
		// TODO: should
		return null
	}

	return packageJson['epic-stack'].head
}
