#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { generate, newProject } from '#src/commands.ts'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const argv = yargs(hideBin(process.argv))
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
			return yargs.positional('project-name', {
				type: 'string',
				description: 'Name of the new project',
			})
		},
		async (argv) => newProject(argv),
	)
	.demandCommand(1, 'You must specify a command')
	.help().argv
