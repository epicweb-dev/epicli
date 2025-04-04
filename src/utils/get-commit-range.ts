import { type SimpleGit } from 'simple-git'

export async function getCommitRange({
	git,
	baseSha,
	headSha,
}: {
	git: SimpleGit
	baseSha?: string
	headSha?: string
}) {
	const log = await git.log({
		from: baseSha ? `${baseSha}^` : await git.firstCommit(),
		to: headSha,
		'--reverse': null,
	})

	const firstCommit = log.all.at(0)
	const lastCommit = log.all.at(-1)

	if (!log.all.length || !firstCommit || !lastCommit) {
		throw new Error('No commits found in repository')
	}

	return log.all.map((commit) => ({
		hash: commit.hash,
		date: commit.date,
		message: commit.message,
	}))
}
