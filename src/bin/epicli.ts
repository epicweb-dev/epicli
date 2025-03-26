#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { generate, showWelcomeScreen } from '../commands.js'
import { newProject } from '../new-project.js'

if (process.argv.length <= 2) {
	await showWelcomeScreen()
} else {
	await yargs(hideBin(process.argv))
		.command<Parameters<typeof generate>[0]>(
			'generate [example-repo]',
			'Generate an AI prompt from an example repo',
			(yargs) => {
				return yargs.positional('example-repo', {
					type: 'string',
					description: 'URL or path to the example repository',
				})
			},
			async (argv) => generate(argv),
		)
		.command<Parameters<typeof newProject>[0]>(
			'new [project-name]',
			'Create a new Epic Stack project',
			(yargs) => {
				return yargs
					.positional('project-name', {
						type: 'string',
						description: 'Name of the new project',
					})
					.option('ref', {
						type: 'string',
						description:
							'Git reference (tag, hash, or branch name) to use from the Epic Stack repository',
						default: 'main',
					})
					.option('repo', {
						type: 'string',
						description:
							'GitHub repository URL to use as the template (e.g., username/epic-stack)',
						default: 'epicweb-dev/epic-stack',
					})
			},
			async (argv) => newProject(argv),
		)
		.usage('$0 <command> [options]')
		.help()
		.parse()
}
