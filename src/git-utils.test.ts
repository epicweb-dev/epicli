import { test, expect, beforeAll, afterAll } from 'vitest'
import { createTestRepo, cleanupTestRepo } from '../tests/utils.js'
import { getGitDiff } from './git-utils.js'

let testRepoPath: string

beforeAll(async () => {
	testRepoPath = await createTestRepo()
})

afterAll(async () => {
	await cleanupTestRepo(testRepoPath)
})

test('should generate a diff from first to last commit', async () => {
	const diff = await getGitDiff(testRepoPath)

	// Verify the diff contains our changes
	expect(diff).toContain('tailwindcss')
	expect(diff).toContain('@tailwind base')
	expect(diff).toContain('package.json')
	expect(diff).toContain('README.md')

	// Verify it doesn't contain ignored files
	expect(diff).not.toContain('node_modules')
})
