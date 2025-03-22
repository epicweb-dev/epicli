#!/usr/bin/env node

import chalk from 'chalk'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { getGitDiff } from '../git-utils/index.ts'
import { generatePrompt } from '../prompt-gen/index.ts'

type GenerateArgs = {
	projectPath: string
	exampleRepo: string
	type?: string
}

type NewArgs = {
	projectName: string
}

const argv = yargs(hideBin(process.argv))
	.command<GenerateArgs>(
		'generate [project-path] [example-repo]',
		'Generate an AI prompt from an example repo',
		(yargs) => {
			return yargs
				.positional('project-path', {
					type: 'string',
					description: 'Path to the target project',
				})
				.positional('example-repo', {
					type: 'string',
					description: 'URL or path to the example repository',
				})
				.option('type', {
					type: 'string',
					description: 'Type of example (e.g., auth, database)',
				})
		},
		async (argv) => {
			try {
				const diff = await getGitDiff(argv.exampleRepo)
				const prompt = await generatePrompt(diff, argv.type)
				console.log(chalk.green('\n✨ Generated prompt copied to clipboard!'))
				console.log(
					chalk.blue('\nPaste this prompt into your AI-powered editor:'),
				)
				console.log(chalk.white('\n' + prompt))
			} catch (error) {
				console.error(chalk.red('\n❌ Error:'), error)
				process.exit(1)
			}
		},
	)
	.command<NewArgs>(
		'new [project-name]',
		'Create a new Epic Stack project',
		(yargs) => {
			return yargs.positional('project-name', {
				type: 'string',
				description: 'Name of the new project',
			})
		},
		async (argv) => {
			try {
				// TODO: Implement new project creation
				console.log(chalk.yellow('\n🚧 New project creation coming soon!'))
			} catch (error) {
				console.error(chalk.red('\n❌ Error:'), error)
				process.exit(1)
			}
		},
	)
	.demandCommand(1, 'You must specify a command')
	.help().argv
