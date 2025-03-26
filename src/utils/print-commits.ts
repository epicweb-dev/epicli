
import chalk from 'chalk'

export function printCommits(
	commits: Array<{ hash: string; date: string; message: string }>,
) {
	for (const commit of commits) {
		const hash = commit.hash.slice(0, 7)
		const isoDate = new Date(commit.date).toISOString().split('T')[0]
		const message = commit.message.trim()
		console.log('  ', hash, isoDate, chalk.yellow(message))
	}
}
