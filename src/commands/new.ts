import { execSync } from 'child_process'
import chalk from 'chalk'

export async function newProject({ projectName }: { projectName?: string }) {
	try {
		const command = `npx --yes create-remix@2.16.8 --install --no-git-init --init-script --template epicweb-dev/epic-stack ${projectName ?? ''}`
		execSync(command, { stdio: 'inherit' })
	} catch (error) {
		console.error(chalk.red('\n❌ Error:'), error)
		process.exit(1)
	}
}
