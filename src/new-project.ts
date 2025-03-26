import { execSync } from 'child_process'
import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { invariant } from '@epic-web/invariant'
import toml from '@iarna/toml'
import chalk from 'chalk'
import { $ } from 'execa'
import open from 'open'
import parseGitHubURL from 'parse-github-url'
import prompts from 'prompts'
import simpleGit from 'simple-git'

const escapeRegExp = (string: string) =>
	// $& means the whole matched string
	string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const getRandomString = (length: number) =>
	crypto.randomBytes(length).toString('hex')
const getRandomString32 = () => getRandomString(32)

async function getEpicStackVersion(
	ref: string = 'main',
	repo: string = 'epicweb-dev/epic-stack',
) {
	const response = await fetch(
		`https://api.github.com/repos/${repo}/commits/${ref}`,
	)
	invariant(
		response.ok,
		`Failed to fetch Epic Stack version: ${response.status} ${response.statusText}`,
	)
	const data = await response.json()
	return {
		head: data.sha,
		date: data.commit.author.date,
		ref,
		repo,
	}
}

export async function newProject({
	projectName,
	ref = 'main',
	repo = 'epicweb-dev/epic-stack',
}: {
	projectName?: string
	ref?: string
	repo?: string
}) {
	try {
		// Ask for project name if not provided
		if (!projectName) {
			const response = await prompts({
				type: 'text',
				name: 'projectName',
				message: 'What is the name of your project?',
				validate: (value) => {
					if (!value) return 'Project name is required'
					if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
						return 'Project name can only contain letters, numbers, hyphens, and underscores'
					}
					return true
				},
			})
			projectName = response.projectName
		}

		invariant(projectName, 'Project name is required')

		// Create project directory
		const projectDir = path.join(process.cwd(), projectName)
		await fs.mkdir(projectDir, { recursive: true })

		// Clone the template
		console.log(
			chalk.blue(`\n⬇️  Downloading template from ${repo} (${ref})...`),
		)
		const git = simpleGit(process.cwd())
		await git.clone(`https://github.com/${repo}.git`, projectDir, [
			'--depth=1',
			'-b',
			ref,
		])

		// Remove git history
		await fs.rm(path.join(projectDir, '.git'), { recursive: true, force: true })

		// Change to project directory
		process.chdir(projectDir)

		// Set up project files
		const FLY_TOML_PATH = path.join(projectDir, 'fly.toml')
		const EXAMPLE_ENV_PATH = path.join(projectDir, '.env.example')
		const ENV_PATH = path.join(projectDir, '.env')
		const PKG_PATH = path.join(projectDir, 'package.json')

		const appNameRegex = escapeRegExp('epic-stack-template')
		const DIR_NAME = path.basename(projectDir)
		const SUFFIX = getRandomString(2)

		const APP_NAME = (DIR_NAME + '-' + SUFFIX)
			// get rid of anything that's not allowed in an app name
			.replace(/[^a-zA-Z0-9-_]/g, '-')
			.toLowerCase()

		const [flyTomlContent, env, packageJsonString] = await Promise.all([
			fs.readFile(FLY_TOML_PATH, 'utf-8'),
			fs.readFile(EXAMPLE_ENV_PATH, 'utf-8'),
			fs.readFile(PKG_PATH, 'utf-8'),
		])

		const newEnv = env.replace(
			/^SESSION_SECRET=.*$/m,
			`SESSION_SECRET="${getRandomString(16)}"`,
		)

		const newFlyTomlContent = flyTomlContent.replace(
			new RegExp(appNameRegex, 'g'),
			APP_NAME,
		)

		const packageJson = JSON.parse(packageJsonString)

		packageJson.name = APP_NAME
		delete packageJson.author
		delete packageJson.license

		// Add Epic Stack version information
		try {
			const epicStackVersion = await getEpicStackVersion(ref, repo)
			packageJson['epic-stack'] = epicStackVersion
		} catch (error) {
			console.warn(
				'Failed to fetch Epic Stack version information. The package.json will not include version details.',
				error,
			)
		}

		const fileOperationPromises = [
			fs.writeFile(FLY_TOML_PATH, newFlyTomlContent),
			fs.writeFile(ENV_PATH, newEnv),
			fs.writeFile(PKG_PATH, JSON.stringify(packageJson, null, 2) + '\n'),
			fs.copyFile(
				path.join(projectDir, 'remix.init', 'gitignore'),
				path.join(projectDir, '.gitignore'),
			),
			fs.rm(path.join(projectDir, 'LICENSE.md')),
			fs.rm(path.join(projectDir, 'CONTRIBUTING.md')),
			fs.rm(path.join(projectDir, 'docs'), { recursive: true }),
			fs.rm(path.join(projectDir, 'tests/e2e/notes.test.ts')),
			fs.rm(path.join(projectDir, 'tests/e2e/search.test.ts')),
		]

		await Promise.all(fileOperationPromises)

		// Run setup commands
		console.log(chalk.blue('\n🛠️  Setting up the project...'))
		execSync('npm run setup', { stdio: 'inherit' })
		execSync('npm run format -- --log-level warn', { stdio: 'inherit' })

		// Set up deployment if requested
		const { shouldSetupDeployment } = await prompts({
			type: 'confirm',
			name: 'shouldSetupDeployment',
			message: 'Would you like to set up deployment right now?',
			initial: true,
		})

		if (shouldSetupDeployment) {
			await setupDeployment({ rootDirectory: projectDir })
		}

		console.log(
			chalk.green(
				`
✨ Setup is complete! You're now ready to rock and roll 🐨

What's next?

- Start development with \`npm run dev\`
- Run tests with \`npm run test\` and \`npm run test:e2e\`
			`.trim(),
			),
		)
	} catch (error) {
		console.error(chalk.red('\n❌ Error:'), error)
		process.exit(1)
	}
}

async function setupDeployment({ rootDirectory }: { rootDirectory: string }) {
	const $I = $({ stdio: 'inherit', cwd: rootDirectory })
	const $S = $({ stdio: ['inherit', 'ignore', 'inherit'], cwd: rootDirectory })

	const hasFly = await $`fly version`.then(
		() => true,
		() => false,
	)
	if (!hasFly) {
		console.log(
			`You need to install Fly first. Follow the instructions here: https://fly.io/docs/hands-on/install-flyctl/`,
		)
		return
	}
	const loggedInUser = await ensureLoggedIn()
	if (!loggedInUser) {
		console.log(
			`Ok, check the docs when you're ready to get this deployed: https://github.com/epicweb-dev/epic-stack/blob/main/docs/deployment.md`,
		)
	}

	console.log('🔎 Determining the best region for you...')
	const primaryRegion = await getPreferredRegion()

	const flyConfig = toml.parse(
		await fs.readFile(path.join(rootDirectory, 'fly.toml'), 'utf-8'),
	)
	flyConfig.primary_region = primaryRegion
	await fs.writeFile(
		path.join(rootDirectory, 'fly.toml'),
		toml.stringify(flyConfig),
	)

	const { app: APP_NAME } = flyConfig
	invariant(
		typeof APP_NAME === 'string',
		'APP_NAME is missing in the fly config',
	)

	const { shouldSetupStaging } = await prompts({
		type: 'confirm',
		name: 'shouldSetupStaging',
		message: 'Would you like to set up a staging environment?',
		initial: true,
	})

	console.log(
		`🥪 Creating app ${APP_NAME}${
			shouldSetupStaging ? ' and staging...' : '...'
		}`,
	)
	if (shouldSetupStaging) {
		await $I`fly apps create ${APP_NAME}-staging`
	}
	await $I`fly apps create ${APP_NAME}`

	console.log(`🤫 Setting secrets in apps`)
	if (shouldSetupStaging) {
		await $I`fly secrets set SESSION_SECRET=${getRandomString32()} INTERNAL_COMMAND_TOKEN=${getRandomString32()} HONEYPOT_SECRET=${getRandomString32()} ALLOW_INDEXING=false --app ${APP_NAME}-staging`
	}
	await $I`fly secrets set SESSION_SECRET=${getRandomString32()} INTERNAL_COMMAND_TOKEN=${getRandomString32()} HONEYPOT_SECRET=${getRandomString32()} --app ${APP_NAME}`

	console.log(`🔊 Creating volumes.`)
	if (shouldSetupStaging) {
		await $I`fly volumes create data --region ${primaryRegion} --size 1 --yes --app ${APP_NAME}-staging`
	}
	await $I`fly volumes create data --region ${primaryRegion} --size 1 --yes --app ${APP_NAME}`

	console.log(`🔗 Attaching consul`)
	if (shouldSetupStaging) {
		await $I`fly consul attach --app ${APP_NAME}-staging`
	}
	await $I`fly consul attach --app ${APP_NAME}`

	console.log(`🗄️ Setting up Tigris object storage`)
	if (shouldSetupStaging) {
		await $S`fly storage create --yes --app ${APP_NAME}-staging --name epic-stack-${APP_NAME}-staging`
	}
	await $S`fly storage create --yes --app ${APP_NAME} --name epic-stack-${APP_NAME}`

	const { shouldDeploy } = await prompts({
		type: 'confirm',
		name: 'shouldDeploy',
		message:
			'Would you like to deploy right now? (This will take a while. You can wait until you push to GitHub instead).',
		initial: true,
	})
	if (shouldDeploy) {
		console.log(`🚀 Deploying`)
		if (shouldSetupStaging) {
			console.log(`  Starting with staging`)
			await $I`fly deploy --app ${APP_NAME}-staging`
			await open(`https://${APP_NAME}-staging.fly.dev/`)
			console.log(`  Staging deployed... Deploying production...`)
		}
		await $I`fly deploy --app ${APP_NAME}`
		await open(`https://${APP_NAME}.fly.dev/`)
		console.log(`  Production deployed...`)
	}

	const { shouldSetupGitHub } = await prompts({
		type: 'confirm',
		name: 'shouldSetupGitHub',
		message: 'Would you like to setup GitHub Action deployment right now?',
		initial: true,
	})
	if (shouldSetupGitHub) {
		console.log(`⛓ Initializing git repo...`)
		const git = simpleGit(rootDirectory)

		// it's possible there's already a git repo initialized so we'll just ignore
		// any errors and hope things work out.
		try {
			await git.init()
		} catch (error: unknown) {
			if (error instanceof Error && error.message.includes('already exists')) {
				console.log(
					chalk.blue('  Git repository already exists, continuing...'),
				)
			} else {
				console.warn(
					chalk.yellow('  Warning: Failed to initialize git repository:'),
					error instanceof Error ? error.message : String(error),
				)
			}
		}

		console.log(
			`Opening repo.new. Please create a new repo and paste the URL below.`,
		)
		await open(`https://repo.new`)

		const { repoURL } = await prompts({
			type: 'text',
			name: 'repoURL',
			message: 'What is the URL of your repo?',
		})

		const githubParts = parseGitHubURL(repoURL)

		invariant(githubParts, `Invalid GitHub URL: ${repoURL}`)

		console.log(
			`Opening Fly Tokens Dashboard and GitHub Action Secrets pages. Please create a new token on Fly and set it as the value for a new secret called FLY_API_TOKEN on GitHub.`,
		)
		await open(`https://web.fly.io/user/personal_access_tokens/new`)
		await open(`${repoURL}/settings/secrets/actions/new`)

		console.log(
			`Once you're finished with setting the token, you should be good to add the remote, commit, and push!`,
		)
	}
	console.log('All done 🎉 Happy building')
}

async function ensureLoggedIn() {
	const loggedInUser = await $`fly auth whoami`.then(
		({ stdout }) => stdout,
		() => null,
	)
	if (loggedInUser) {
		const { proceed } = await prompts({
			type: 'select',
			name: 'proceed',
			message: `You're logged in as ${loggedInUser}. Proceed?`,
			choices: [
				{ title: 'Yes', value: 'Yes' },
				{ title: 'Login as another user', value: 'Login as another user' },
				{ title: 'Exit', value: 'Exit' },
			],
			initial: 0,
		})

		switch (proceed) {
			case 'Yes': {
				return loggedInUser
			}
			case 'Login as another user': {
				await $`fly auth logout`
				return ensureLoggedIn()
			}
			default: {
				return null
			}
		}
	} else {
		console.log(`You need to login to Fly first. Running \`fly auth login\`...`)
		await $({ stdio: 'inherit' })`fly auth login`
		return ensureLoggedIn()
	}
}

async function getPreferredRegion() {
	const {
		platform: { requestRegion: defaultRegion },
	} = await makeFlyRequest({ query: 'query {platform {requestRegion}}' })

	const availableRegions = await makeFlyRequest({
		query: `{platform {regions {name code}}}`,
	})
	const { preferredRegion } = await prompts({
		type: 'select',
		name: 'preferredRegion',
		message: `Which region would you like to deploy to? The closest to you is ${defaultRegion}.`,
		choices: availableRegions.platform.regions.map(
			(region: { name: string; code: string }) => ({
				title: `${region.name} (${region.code})`,
				value: region.code,
			}),
		),
		initial: availableRegions.platform.regions.findIndex(
			(region: { code: string }) => region.code === defaultRegion,
		),
	})
	return preferredRegion
}

let flyToken: string | null = null
async function makeFlyRequest({
	query,
	variables,
}: {
	query: string
	variables?: any
}) {
	if (!flyToken) {
		flyToken = (await $`fly auth token`).stdout.trim()
	}

	const json = await fetch('https://api.fly.io/graphql', {
		method: 'POST',
		body: JSON.stringify({ query, variables }),
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${flyToken}`,
		},
	}).then((response) => response.json())
	return json.data
}
