# get-dotenv

Load environment variables with a cascade of environment-aware dotenv files. You can:

- Load dotenv files synchronously or asynchronously.
- Specify the directory containing your dotenv files.
- Specify the token that identifies dotenv files (e.g. '.env').
- Specify the token that identifies private vatiables (e.g. 'local').
- Define dynamic variables progressively in terms of other variables and other logic.
- Load variables for a specific environment or none.
- Exclude public or private variables.
- Extract variables to an object, to `process.env`, or both.
- Log the result to the console.

The command-line version can pull the environment designator from a number of sources, populate `process.env`, and execute a shell command.

`getdotenv` relies on the excellent [`dotenv`](https://www.npmjs.com/package/dotenv) parser and uses [`dotenv-expand`](https://www.npmjs.com/package/dotenv-expand) for recursive variable expansion.

**So why not just use the very popular [`dotenv-cli`](https://www.npmjs.com/package/dotenv-cli) package to load dotenv file cascades?** A couple of reasons:

- `dotenv-cli` assumes all your `.env` files are located in your root directory. If you have a lot of environments, you probably want to sequester them into their own directory.

- The `dotenv-cli` syntax requires the environment to be set (the `-c` argument) _before_ the shell command is articulated (after the `--`). This doesn't work if you want to write an NPM script that takes the environment as an argument, since in that case it would have to go at the end.

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
