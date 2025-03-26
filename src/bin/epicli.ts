#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { apply } from '../commands/apply.js'
import { newProject } from '../commands/new.js'
import { update } from '../commands/update.js'
import { showWelcomeScreen } from '../commands/welcome.js'

if (process.argv.length <= 2) {
	await showWelcomeScreen()
} else {
	await yargs(hideBin(process.argv))
		.command<Parameters<typeof apply>[0]>(
			'apply [upstream-repo]',
			'Apply changes from an example repository to your project',
			(yargs) => {
				return yargs
					.positional('upstream-repo', {
						type: 'string',
						description: 'URL or path to the example repository',
					})
					.option('directory', {
						type: 'string',
						description: 'Directory to apply changes to',
						default: process.cwd(),
					})
					.option('base-sha', {
						type: 'string',
						description:
							'Base SHA to compare against (defaults to first commit)',
						requiresArg: true,
					})
					.option('head-sha', {
						type: 'string',
						description:
							'Head SHA to compare against (defaults to last commit)',
						requiresArg: true,
					})
					.option('file', {
						type: 'string',
						description:
							'Only include this specific file in the update (can be specified multiple times)',
						requiresArg: true,
						array: true,
					})
					.option('filter', {
						type: 'string',
						description:
							'Only include files matching these glob patterns (can be specified multiple times)',
						requiresArg: true,
						array: true,
					})
					.option('ignore', {
						type: 'string',
						description:
							'Exclude files matching these glob patterns (can be specified multiple times)',
						requiresArg: true,
						array: true,
					})
			},
			async (argv) =>
				apply({
					...argv,
					files: argv.file as Array<string> | undefined,
					filterPatterns: argv.filter as Array<string> | undefined,
					ignorePatterns: argv.ignore as Array<string> | undefined,
				}),
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
		.command<Parameters<typeof update>[0]>(
			'update',
			'Update the Epic Stack project',
			(yargs) => {
				return yargs
					.option('directory', {
						type: 'string',
						description: 'Directory to update',
						default: process.cwd(),
					})
					.option('base-sha', {
						type: 'string',
						description: 'Base SHA to compare against',
						requiresArg: true,
					})
					.option('head-sha', {
						type: 'string',
						description: 'Head SHA to compare against',
						requiresArg: true,
					})
					.option('file', {
						type: 'string',
						description:
							'Only include this specific file in the update (can be specified multiple times)',
						requiresArg: true,
						array: true,
					})
					.option('filter', {
						type: 'string',
						description:
							'Only include files matching these glob patterns (can be specified multiple times)',
						requiresArg: true,
						array: true,
					})
					.option('ignore', {
						type: 'string',
						description:
							'Exclude files matching these glob patterns (can be specified multiple times)',
						requiresArg: true,
						array: true,
					})
			},
			async (argv) =>
				update({
					...argv,
					files: argv.file as Array<string> | undefined,
					filterPatterns: argv.filter as Array<string> | undefined,
					ignorePatterns: argv.ignore as Array<string> | undefined,
				}),
		)
		.demandCommand(1, 'You must specify a command')
		.help()
		.parse()
}
