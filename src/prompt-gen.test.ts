import clipboardy from 'clipboardy'
import { describe, it, expect, vi } from 'vitest'
import { generatePrompt } from '#src/prompt-gen.ts'

// Mock clipboardy
vi.mock('clipboardy', () => ({
	default: {
		write: vi.fn(),
	},
}))

describe('prompt-gen', () => {
	describe('generatePrompt', () => {
		it('should generate a prompt with the diff and copy to clipboard', async () => {
			const diff =
				'diff --git a/package.json b/package.json\n+  "tailwindcss": "^3.0.0"'
			const type = 'styling'

			const prompt = await generatePrompt(diff, type)

			// Verify prompt content
			expect(prompt).toContain('Hello Cursor')
			expect(prompt).toContain(diff)
			expect(prompt).toContain('```diff')

			// Verify clipboard was updated
			expect(clipboardy.write).toHaveBeenCalledWith(prompt)
		})
	})
})
