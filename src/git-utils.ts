import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import filenamify from 'filenamify'
import { Octokit } from 'octokit'
import simpleGit from 'simple-git'

const IGNORED_FILES = [
	'node_modules/**',
	'package-lock.json',
	'yarn.lock',
	'pnpm-lock.yaml',
	'dist/**',
	'.git/**',
	'coverage/**',
]

async function resolveRepoPath(
	repoPath: string,
): Promise<
	| { type: 'remote'; localPath: string; remotePath: string }
	| { type: 'local'; localPath: string; remotePath?: never }
> {
	// If it's a full URL, return as-is
	if (repoPath.startsWith('http')) {
		const localPath = join(tmpdir(), 'epicli', filenamify(repoPath))
		return { type: 'remote', remotePath: repoPath, localPath }
	}

	// Check if it's a valid local path
	if (existsSync(repoPath)) {
		return { type: 'local', localPath: repoPath }
	}

	// Check if it matches the short GitHub format (org/repo)
	const parts = repoPath.split('/')
	if (parts.length === 2) {
		// If not local, treat as GitHub short format
		return resolveRepoPath(`https://github.com/${repoPath}.git`)
	}

	throw new Error(
		`Unable to resolve repository path: ${repoPath}. ` +
			'Path should be either a local directory, a full URL, or a GitHub repository in format "organization/repo"',
	)
}

export async function getGitDiff(repoPath: string): Promise<string> {
	const git = simpleGit()

	const { type, localPath, remotePath } = await resolveRepoPath(repoPath)

	// Clone if it's a remote repository
	if (type === 'remote') {
		await git.clone(remotePath, localPath)
	}

	await git.cwd(localPath)

	// Get all commits
	const log = await git.log()
	if (!log.all.length) {
		throw new Error('No commits found in repository')
	}

	// Get the first and last commit hashes
	const firstCommit = log.all[log.all.length - 1]?.hash
	const lastCommit = log.all[0]?.hash

	if (!firstCommit || !lastCommit) {
		throw new Error('Could not find commit hashes')
	}

	// Get the diff between first and last commit
	const diff = await git.diff([
		firstCommit,
		lastCommit,
		'--',
		...IGNORED_FILES.map((f) => `:!${f}`),
	])

	// Clean up if we cloned the repo
	if (type === 'remote') {
		await git.cwd('..')
		await git.raw(['rm', '-rf', localPath])
	}

	return diff
}

export async function searchExampleRepos(
	query: string = 'epic-stack-example',
): Promise<Array<{ name: string; description: string; stars: number }>> {
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
