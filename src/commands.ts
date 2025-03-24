import { execSync } from 'child_process'
import chalk from 'chalk'
import clipboard from 'clipboardy'
import prompts from 'prompts'
import { getGitDiff, searchExampleRepos } from './git-utils.js'

export async function generate({ exampleRepo }: { exampleRepo?: string }) {
	try {
		if (!exampleRepo) {
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

			exampleRepo = selectedRepo
		}
		const diff = await getGitDiff(exampleRepo)
		const prompt = `
Hello, I need your help making a change in this project. Here's a diff from another project which made changes similar to the ones I would like you to make:

\`\`\`diff
${diff}
\`\`\`

Please help me apply similar changes to my project. Note that some files may have moved or been renamed, so you'll need to adapt the changes accordingly.
		`.trim()
		await clipboard.write(prompt)
		console.log(chalk.green('\n✨ Generated prompt copied to clipboard!'))
		console.log(
			chalk.blue(
				'\nProvide the generated prompt to your AI Assistant of choice.',
			),
		)
	} catch (error) {
		console.error(chalk.red('\n❌ Error:'), error)
		process.exit(1)
	}
}

export async function newProject({ projectName }: { projectName?: string }) {
	try {
		const command = `npx --yes create-remix@latest --install --no-git-init --init-script --template epicweb-dev/epic-stack ${projectName ?? ''}`
		execSync(command, { stdio: 'inherit' })
	} catch (error) {
		console.error(chalk.red('\n❌ Error:'), error)
		process.exit(1)
	}
}
