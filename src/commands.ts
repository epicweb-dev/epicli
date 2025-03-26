import chalk from 'chalk'
import clipboard from 'clipboardy'
import figlet from 'figlet'
import gradient from 'gradient-string'
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

export async function showWelcomeScreen() {
	const epicText = figlet.textSync('EPICLI', {
		font: 'ANSI Shadow',
		horizontalLayout: 'default',
		verticalLayout: 'default',
	})

	const colors = ['#6A24FF', '#854FFF', '#9B7BFF']

	console.log(gradient(colors).multiline(epicText))

	const textColor = chalk.hex('#6A24FF')

	console.log(
		textColor.bold(
			`🚀 Welcome to Epicli ${chalk.dim('(pronounced "epic-lee")')}`,
		),
	)
	console.log(
		chalk.dim(
			'A powerful tool for working with the Epic Stack and managing your web applications.',
		),
	)

	console.log('\n' + textColor.bold('Available Commands:'))
	console.log(
		textColor('  generate [example-repo]') +
			chalk.dim(
				' - Generate an AI prompt to add a feature to your existing app based on an example repo',
			),
	)
	console.log(
		textColor('  new [project-name]     ') +
			chalk.dim(' - Create a new Epic Stack project'),
	)

	console.log(
		'\nGet started by running: \n  ' + textColor('npx epicli new my-app'),
	)
	console.log(
		'\nFor more information, visit: ' +
			textColor('https://github.com/epicweb-dev/epicli'),
	)
	console.log()
}
