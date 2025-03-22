import { writeFile, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import simpleGit from 'simple-git'

export async function createTestRepo() {
	const tempDir = join(tmpdir(), 'epicli-test', Date.now().toString())
	await mkdir(tempDir, { recursive: true })
	const git = simpleGit(tempDir)

	await git.init()

	// Configure git user identity for the test repo
	await git.addConfig('user.name', 'Test User')
	await git.addConfig('user.email', 'test@example.com')

	// Create initial files
	await writeFile(
		join(tempDir, 'package.json'),
		JSON.stringify(
			{
				name: 'test-project',
				version: '1.0.0',
				dependencies: {
					react: '^18.0.0',
				},
			},
			null,
			2,
		),
	)
	await writeFile(join(tempDir, 'README.md'), '# Test Project\n\nInitial setup')

	// Initial commit
	await git.add('.')
	await git.commit('Initial commit')

	// Make some changes
	await writeFile(
		join(tempDir, 'package.json'),
		JSON.stringify(
			{
				name: 'test-project',
				version: '1.0.0',
				dependencies: {
					react: '^18.0.0',
					tailwindcss: '^3.0.0',
				},
			},
			null,
			2,
		),
	)
	await writeFile(
		join(tempDir, 'README.md'),
		'# Test Project\n\nAdded Tailwind CSS',
	)

	// Second commit
	await git.add('.')
	await git.commit('Add Tailwind CSS')

	// Make more changes
	await mkdir(join(tempDir, 'src', 'app'), { recursive: true })
	await writeFile(
		join(tempDir, 'src/app/styles.css'),
		'/* Tailwind directives */\n@tailwind base;\n@tailwind components;\n@tailwind utilities;',
	)

	// Third commit
	await git.add('.')
	await git.commit('Add Tailwind CSS configuration')

	return tempDir
}

export async function cleanupTestRepo(path: string) {
	await rm(path, { recursive: true, force: true })
}
