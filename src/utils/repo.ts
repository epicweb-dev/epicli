import { rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import chalk from 'chalk'
import filenamify from 'filenamify'
import simpleGit from 'simple-git'

async function resolveRepoPath(
	repoPath: string,
	options: {
		key?: string
	} = {},
): Promise<
	| { type: 'remote'; localPath: string; remotePath: string }
	| { type: 'local'; localPath: string; remotePath?: never }
> {
	// If it's a full URL, return as-is
	if (repoPath.startsWith('http')) {
		const localPath = join(
			tmpdir(),
			'epicli',
			filenamify(repoPath, { replacement: '_' }),
			options.key ?? Date.now().toString(),
		)
		return { type: 'remote', remotePath: repoPath, localPath }
	}

	const exists = await stat(repoPath).catch(() => false)
	// Check if it's a valid local path
	if (exists) {
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

export async function gitUseRepo(
	repoPath: string,
	options: {
		/** Directory name to use for the clone, defaults to timestamp if not provided */
		key?: string
	} = {},
) {
	const git = simpleGit()

	const { type, localPath, remotePath } = await resolveRepoPath(
		repoPath,
		options,
	)

	// Clone if it's a remote repository
	if (type === 'remote') {
		try {
			const repoExists = await stat(localPath).catch(() => false)
			if (repoExists) {
				await git.cwd(localPath)
				await git.pull()
			} else {
				console.log(
					`⬇️  Cloning ${remotePath} into a temporary directory: ${chalk.dim(localPath)}`,
				)
				await git.clone(remotePath, localPath)
				await git.cwd(localPath)
			}
		} catch (error) {
			console.error(chalk.red('\n❌ Error:'), error)
			process.exit(1)
		}
	}

	return {
		git,
		cleanup: async () => {
			if (type !== 'remote') return

			await git.cwd('..')
			await rm(localPath, { recursive: true, force: true })
		},
	}
}

/**
 * Checks if the git working tree is clean (no uncommitted changes)
 * @param directory The directory to check
 * @returns Boolean indicating if the working tree is clean
 */
export async function checkGitWorkingTree(directory: string): Promise<boolean> {
	try {
		const git = simpleGit(directory)
		const status = await git.status()

		// Check if there are any changes (modified, added, deleted, or untracked files)
		return status.isClean()
	} catch (error) {
		console.error(chalk.red('Error checking git working tree:'), error)
		// If we can't check the status, we'll assume it's clean to allow the operation
		return true
	}
} 
