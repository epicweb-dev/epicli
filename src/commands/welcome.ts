import chalk from 'chalk'
import figlet from 'figlet'
import gradient from 'gradient-string'

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
		textColor('  apply [repo]           ') +
			chalk.dim(' - Apply changes from Epic Stack examples to your app'),
	)
	console.log(
		textColor('  update [path]          ') +
			chalk.dim(' - Update your Epic Stack app with latest changes'),
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
