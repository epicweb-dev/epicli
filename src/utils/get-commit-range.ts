
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
		from: baseSha,
		'--reverse': null,
	})

	const firstCommit = baseSha
		? log.all.find((commit) => commit.hash.startsWith(baseSha))
		: log.all[log.all.length - 1]
	const lastCommit = headSha
		? log.all.find((commit) => commit.hash.startsWith(headSha))
		: log.all[0]

	if (!log.all.length || !firstCommit || !lastCommit) {
		throw new Error('No commits found in repository')
	}

	return log.all.map((commit) => ({
		hash: commit.hash,
		date: commit.date,
		message: commit.message,
	}))
}
