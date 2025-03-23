<div>
  <h1 align="center"><a href="https://npm.im/epicli">🍉 epicli</a></h1>
  <strong>
    Generate and update apps based on the Epic Stack
  </strong>
  <p>
    Whether you want to generate a new app with the Epic Stack, update an existing one, or apply an example's changes to your own app (Epic Stack or not), this CLI will help you do it.
  </p>
</div>

```sh
npx epicli [command] [options]

# apply changes from an example to your project
npx epicli apply

# update your app to the latest version of the epic stack
npx epicli update
```

<div align="center">
  <a
    alt="Epic Web logo"
    href="https://www.epicweb.dev"
  >
    <img
      width="300px"
      src="https://github-production-user-asset-6210df.s3.amazonaws.com/1500684/257881576-fd66040b-679f-4f25-b0d0-ab886a14909a.png"
    />
  </a>
</div>

<hr />

<!-- prettier-ignore-start -->
[![Build Status][build-badge]][build]
[![MIT License][license-badge]][license]
[![Code of Conduct][coc-badge]][coc]
<!-- prettier-ignore-end -->

## The problem

- You want to build a production-grade application quickly
- You want to update your Epic Stack app with changes made in the Epic Stack
- You want to apply the changes made in an example app to your own app

## This solution

This is a CLI that helps you do all of those things.

### apply

This command applies changes from Epic Stack example repositories to your app.

```sh
# browse examples interactively
npx epicli apply

# apply directly from a GitHub repo
npx epicli apply kentcdodds/epic-ai
npx epicli apply https://github.com/epicweb-dev/epic-oidc

# filter files to apply
npx epicli apply kentcdodds/epic-ai --file src/components/Button.tsx --file src/components/Input.tsx
npx epicli apply kentcdodds/epic-ai --filter "src/components/*"
npx epicli apply kentcdodds/epic-ai --ignore "*.test.ts"
```

The apply command:

1. Lets you browse available Epic Stack examples interactively
2. Gets the diff from the selected repository
3. Creates patches to apply that example's changes to your project
4. Generate a prompt which you can then give to your AI Assistant (like
   [Cursor](https://cursor.sh),
   [Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview),
   [Windsurf](https://codeium.com/windsurf), etc.) to make it apply the patches.

### update

This command updates your Epic Stack app with changes made in the Epic Stack
repository.

```sh
# local path
npx epicli update ./your-epic-app
# current directory
npx epicli update .

# filter files to update
npx epicli update --file src/components/Button.tsx --file src/components/Input.tsx
npx epicli update --filter "src/components/*"
npx epicli update --ignore "*.test.ts"
```

The update command:

1. Checks your package.json for the last commit hash you updated from
2. Shows what updates are available (grouped my major changes)
3. Creates patches to implement those changes
4. Generate a prompt which you can then give to your AI Assistant (like
   [Cursor](https://cursor.sh),
   [Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview),
   [Windsurf](https://codeium.com/windsurf), etc.) to make it apply the patches.

Note: The update command requires that your epic stack app's package.json has
the `epic-stack` key set to the last commit hash and date of the Epic Stack repo
(this is generated when you create a new app and updated when you update your
app).

```json
{
	"epic-stack": {
		"head": "b78978efc39cf9fd2ea43519a5767567c20b9991",
		"date": "2025-03-11T20:07:22Z"
	}
}
```

### new

(Not yet implemented, coming soon! Use `npm create epic-stack@latest` instead
for now.)

This command creates a new Epic Stack app.

```sh
npx epicli new my-app
```

This will create a new app with the name `my-app` in the current directory.

## Limitations

The further your app diverges from the Epic Stack, the more likely you'll run
into issues with these prompts.

## License

MIT

<!-- prettier-ignore-start -->
[build-badge]: https://img.shields.io/github/actions/workflow/status/epicweb-dev/epicli/release.yml?branch=main&logo=github&style=flat-square
[build]: https://github.com/epicweb-dev/epicli/actions?query=workflow%3Arelease
[license-badge]: https://img.shields.io/badge/license-MIT%20License-blue.svg?style=flat-square
[license]: https://github.com/epicweb-dev/epicli/blob/main/LICENSE
[coc-badge]: https://img.shields.io/badge/code%20of-conduct-ff69b4.svg?style=flat-square
[coc]: https://kentcdodds.com/conduct
<!-- prettier-ignore-end -->
