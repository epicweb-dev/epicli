import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import chalk from 'chalk'
import { resetProjectRoot } from '../templates/reset-project-root'

export async function reset() {
	try {
		const packageJson = await readFile(
			join(process.cwd(), 'package.json'),
			'utf8',
		)
		const packageJsonData = JSON.parse(packageJson)
		if (!packageJsonData['epic-stack']) {
			console.error(chalk.red('\n❌ Error: Not an Epic Stack project'))
			process.exit(1)
		}

		const appExampleExists = await stat(
			join(process.cwd(), 'app-example'),
		).catch(() => false)
		if (appExampleExists) {
			console.error(
				chalk.red('\n❌ Error: app-example directory already exists'),
			)
			process.exit(1)
		}

		await mkdir(join(process.cwd(), 'app-example'))

		const gitignore = await readFile(join(process.cwd(), '.gitignore'), 'utf8')
		const appExampleIsIgnored = gitignore.includes('app-example')
		if (!appExampleIsIgnored) {
			await writeFile(
				join(process.cwd(), '.gitignore'),
				`${gitignore}\n\napp-example\n`,
			)
		}

		await cp(join(process.cwd(), 'app'), join(process.cwd(), 'app-example'), {
			recursive: true,
		})

		await rm(join(process.cwd(), 'app', 'routes', '_auth'), {
			recursive: true,
		})

		await rm(join(process.cwd(), 'app', 'routes', '_marketing'), {
			recursive: true,
		})

		await rm(join(process.cwd(), 'app', 'routes', '_seo'), {
			recursive: true,
		})

		await rm(join(process.cwd(), 'app', 'routes', 'admin'), {
			recursive: true,
		})

		await rm(join(process.cwd(), 'app', 'routes', 'settings'), {
			recursive: true,
		})

		await rm(join(process.cwd(), 'app', 'routes', 'users'), {
			recursive: true,
		})

		await rm(join(process.cwd(), 'tests'), {
			recursive: true,
		})

		await writeFile(join(process.cwd(), 'app', 'root.tsx'), resetProjectRoot)
	} catch (error) {
		console.error(chalk.red('\n❌ Error:'), error)
		process.exit(1)
	}
}
