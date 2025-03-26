import chalk from 'chalk'
import { Octokit } from 'octokit'
import prompts from 'prompts'
import { applyChanges } from '../utils/core.js'
import { getCommitRange } from '../utils/get-commit-range.js'
import { printCommits } from '../utils/print-commits.js'
import { gitUseRepo } from '../utils/repo.js'

export async function apply({
	upstreamRepo,
	directory: workingDir,
	baseSha,
	headSha,
	files,
	filterPatterns,
	ignorePatterns,
}: {
	upstreamRepo?: string
	directory: string
	baseSha?: string
	headSha?: string
	files?: string[]
	filterPatterns?: string[]
	ignorePatterns?: string[]
}) {
	try {
		if (!upstreamRepo) {
			upstreamRepo = await selectExampleRepo()
		}
		const key = Date.now().toString()

		const { git } = await gitUseRepo(upstreamRepo, { key })

		const commits = await getCommitRange({ git, baseSha, headSha })

		const firstCommit = commits[0]
		const lastCommit = commits[commits.length - 1]

		if (!firstCommit || !lastCommit) {
			throw new Error('No commits found in repository')
		}

		console.log(
			chalk.yellow(
				`\n🔄 Getting changes from ${upstreamRepo} from ${firstCommit.hash.slice(0, 7)} to ${lastCommit.hash.slice(0, 7)}`,
			),
		)

		console.log(chalk.bold(`🔄 Changes`), `(${commits.length} commits)`)
		printCommits(commits)

		await applyChanges({
			workingDir,
			repo: upstreamRepo,
			commits,
			files,
			key,
			filterPatterns,
			ignorePatterns,
		})
	} catch (error) {
		console.error(chalk.red('\n❌ Error:'), error)
		process.exit(1)
	}
}

async function selectExampleRepo() {
	console.log(`No example provided, searching for example repos 🔎`)
	const exampleRepos = await searchExampleRepos()
	const { selectedRepo } = await prompts({
		type: 'select',
		name: 'selectedRepo',
		message: 'Select an example repository to generate a prompt from:',
		choices: exampleRepos.map((repo) => ({
			title: `${repo.name} (${repo.stars} ⭐)`,
			description: `\t➡️  ${chalk.dim(repo.description)}`,
			value: repo.name,
		})),
	})

	if (typeof selectedRepo !== 'string' || !selectedRepo) {
		console.error(chalk.red('\n❌ No repository selected. Exiting...'))
		process.exit(1)
	}

	return selectedRepo
}

export async function searchExampleRepos(query: string = 'epic-stack-example') {
	const octokit = new Octokit()

	const { data } = await octokit.rest.search.repos({
		q: `topic:${query}`,
		sort: 'stars',
		order: 'desc',
		per_page: 50,
	})

	return data.items.map((repo) => ({
		name: repo.full_name,
		description: repo.description || '',
		stars: repo.stargazers_count,
	}))
}
