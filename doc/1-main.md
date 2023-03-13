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

For the async form only (`getDotenv`, not `getDotenvSync), use the `dynamicPath` option to add a relative path to a module with a default export like this:

```js
export default {
  SOME_DYNAMIC_VARIABLE: (dotenv) => someLogic(dotenv),
  ANOTHER_DYNAMIC_VARIABLE: (dotenv) =>
    someOtherLogic(dotenv.SOME_DYNAMIC_VARIABLE),
};
```

Each function takes the current `dotenv` variable package as an argument. These variables will be processed progressively, meaning each successive one will have access to the previous ones. They can also override existing variables.
