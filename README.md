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

# create a new app
npx epicli new my-app

# update your app
npx epicli update

# generate a prompt from an example repo
npx epicli generate kentcdodds/epic-ai
npx epicli generate https://github.com/epicweb-dev/epic-oidc
npx epicli generate ./some-local-example-repo
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

### new

(Not yet implemented, coming soon! Use `npm create epic-stack@latest` instead
for now.)

This command creates a new Epic Stack app.

```sh
npx epicli new my-app
```

This will create a new app with the name `my-app` in the current directory.

Once that's done you can then run the generate command to help make changes to
the app for your own needs.

### generate

This command generates an AI prompt from an example repo, and apply the changes
to your own app.

```sh
npx epicli generate kentcdodds/epic-ai
npx epicli generate https://github.com/kentcdodds/epic-ai
npx epicli generate ./some-local-example-repo
```

This will get a diff from all the changes in the example from the first commit
of the example repo to the last and use that to generate a prompt which you can
then give to your AI Assistant (like [Cursor](https://cursor.sh),
[Claude Code](https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview),
[Windsurf](https://codeium.com/windsurf), etc.) which will then apply the
changes to your own app.

### update

(Not yet implemented, coming soon!)

This command is similar to the generate command, except it determines the diff
in the Epic Stack repo from when you last updated your app to the latest commit
and then generates a prompt you can give to your AI Assistant.

```sh
# local path
npx epicli update ./your-epic-app
# current directory
npx epicli update .
```

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

## Limitations

The further your app diverges from the Epic Stack, the more likely you'll run
into issues with these prompts.

## License

MIT

<!-- prettier-ignore-start -->
[build-badge]: https://img.shields.io/github/actions/workflow/status/epicweb-dev/totp/release.yml?branch=main&logo=github&style=flat-square
[build]: https://github.com/epicweb-dev/totp/actions?query=workflow%3Arelease
[license-badge]: https://img.shields.io/badge/license-MIT%20License-blue.svg?style=flat-square
[license]: https://github.com/epicweb-dev/totp/blob/main/LICENSE
[coc-badge]: https://img.shields.io/badge/code%20of-conduct-ff69b4.svg?style=flat-square
[coc]: https://kentcdodds.com/conduct
<!-- prettier-ignore-end -->
