import clipboardy from 'clipboardy'

const PROMPT_TEMPLATE = `Hello Cursor, I need your help making a change in this project. Here's a diff from another project which made changes similar to the ones I would like you to make:

\`\`\`diff
{diff}
\`\`\`

Please help me apply similar changes to my project. Note that some files may have moved or been renamed in newer versions of the Epic Stack, so you'll need to adapt the changes accordingly.`

export async function generatePrompt(
	diff: string,
	type?: string,
): Promise<string> {
	const prompt = PROMPT_TEMPLATE.replace('{diff}', diff)

	// Copy to clipboard
	await clipboardy.write(prompt)

	return prompt
}
