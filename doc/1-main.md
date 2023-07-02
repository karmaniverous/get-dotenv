# get-dotenv

Load environment variables with a cascade of environment-aware dotenv files. You can:

- Load dotenv files synchronously or asynchronously.
- Load variables for a specific environment or none.
- Define dynamic variables progressively in terms of other variables and other logic.
- Exclude public, private, global, environment-specific, or dynamic variables.
- Extract the resulting variables to an object, `process.env`, a dotenv file, or a logger, in any combination.
- Specify the directories containing your dotenv files.
- Specify the filename token that identifies dotenv files (e.g. '.env').
- Specify the filename extension that identifies private variables (e.g. 'local').

`getdotenv` relies on the excellent [`dotenv`](https://www.npmjs.com/package/dotenv) parser and uses [`dotenv-expand`](https://www.npmjs.com/package/dotenv-expand) for recursive variable expansion.

The command-line version populates `process.env` from your dotenv files (you can also specify values inline) and can then execute a shell command within that context. The executing shell is configurable. Any child `getdotenv` instances will inherit as defaults the parent shell's environment and optionally its `getdotenv` settings.

You can always use `getdotenv` directly on the command line, but its REAL power comes into play when you use it as the foundation of your own CLI. This lets you set defaults globally and configure pre- and post-hooks that mutate your `getdotenv` context and do useful things like grab an AWS session from your dev environment and add it to the command execution context.

When you plug your own [`commander`](https://www.npmjs.com/package/commander) CLI commands into the `getdotenv` base, they will execute within all of the environmental context created above!

## Installation

```bash
npm install @karmaniverous/get-dotenv
```

## Usage

```js
import { getDotenv, getDotenvSync } from '@karmaniverous/get-dotenv';

// asynchronous
const dotenv = await getDotenv(options);

// synchronous
const dotenvSync = await getDotenvSync(options);
```

See [OptionsType](#optionstype--object) below for configuration options.

## Dynamic Processing

This package supports the full [`dotenv-expand`](https://www.npmjs.com/package/dotenv-expand) syntax.

Yse the `dynamicPath` option to add a relative path to a Javascript file with a function expression like this:

```js
(dotenv) => ({
  SOME_DYNAMIC_VARIABLE: (dotenv) => someLogic(dotenv),
  ANOTHER_DYNAMIC_VARIABLE: (dotenv) =>
    someOtherLogic(dotenv.SOME_DYNAMIC_VARIABLE),
});
```

This function should take the expanded `dotenv` object as an argument and return an object. Each object key will be evaluated progressively.

If the corresponding value is a function, it will be executed with the current state of `dotenv` as its single argument and the result applied back to the `dotenv` object. Otherwise, the value will just be applied back to `dotenv`.

Since keys will be evaluated progressively, each successive key function will have access to any previous ones. These keys can also override existing variables.

## More to Come!

Implementation always runs a little behind documentation. These topics & improvements are coming soon:

- Rationalize the package's JSDOC to improve the API documentation below.
- An example of dotenv-based environment config.
- Integrating `getdotenv` into your npm scripts.
- Creating a `getdotenv`-based CLI.
- Some gotchas & tips around managing your shell execution context.
