# get-dotenv

Load environment variables with a cascade of environment-aware dotenv files. You can:

✅ Asynchronously load environment variables from multiple dotenv files.

✅ Segregate variables info distinct files:

- Public files (e.g. `.env`, `env.dev`, `env.test`) are synced with your git repository.
- Private files (e.g. `.env.local`, `env.dev.local`, `env.test.local`) are protected by `.gitignore`.
- Global files (e.g. `.env`, `env.local`) apply to all environments.
- Env files (e.g. `.env.dev`, `.env.dev.local`, `.env.test`, `.env.test.local`) apply to a specific environment.
- Dynamic files (`.env.js`) export logic that dynamically & progressively generates new variables or overrides current ones.

✅ Dynamically specify which variables to load by type.

✅ Explicitly add variables to the loaded set.

✅ Extract the resulting variables to an object, `process.env`, a dotenv file, or a logger object, in any combination.

✅ Customize your dotenv file directories & naming patterns.

✅ Perform all of the above either programmatically or from the command line, where you can also execute additional shell commands within the resulting context... including nested `getdotenv` commands that inherit the parent command's settings & context!

✅ Set defaults for all options in a `getdotenv.config.json` file in your project root directory.

✅ Generate an extensible `getdotenv`-based CLI for use in your own projects.

`getdotenv` relies on the excellent [`dotenv`](https://www.npmjs.com/package/dotenv) parser and somewhat improves on [`dotenv-expand`](https://www.npmjs.com/package/dotenv-expand) for recursive variable expansion.

You can always use `getdotenv` directly on the command line, but its REAL power comes into play when you use it as the foundation of your own CLI. This lets you set defaults globally and configure pre- and post-hooks that mutate your `getdotenv` context and do useful things like grab an AWS session from your dev environment and add it to the command execution context.

When you plug your own [`commander`](https://www.npmjs.com/package/commander) CLI commands into the `getdotenv` base, they will execute within all of the environmental context created above!

## Breaking Changes

In version 4.0.0, in addition to a full TypeScript refactor, I replaced the use of the unsafe `Function` constructor for dynamic variable processing with a MUCH safer dynamic module import.

Dynamic importing is intrinsically asynchronous, and so far I haven't been able to figure out how to cram that into the synchronous `getDotenvSync` function. There really aren't THAT many users of this library, so rather than have async & sync versions that do different things, I just eliminated the sync version entirely.

If you have a use case for sync dotenv processing and DON'T need dynamic variables, let me know and I'll put the restricted version back in. If you have an idea of how to make dynamic imports synchronous, I'm all ears!

## Installation

```bash
npm install @karmaniverous/get-dotenv
```

## Usage

```js
import { getDotenv } from '@karmaniverous/get-dotenv';

const dotenv = await getDotenv(options);
```

See the [GetDotenvOptions](./src/GetDotenvOptions.ts) type for descriptions of all the configuration options.

## Dynamic Processing

This package supports the full [`dotenv-expand`](https://www.npmjs.com/package/dotenv-expand) syntax, with some internal performance improvements.

Use the `dynamicPath` option to add a relative path to a Javascript file with a default export like this:

```js
export default {
  SOME_DYNAMIC_VARIABLE: (dotenv) => someLogic(dotenv),
  ANOTHER_DYNAMIC_VARIABLE: (dotenv) =>
    someOtherLogic(dotenv.SOME_DYNAMIC_VARIABLE),
  ONE_MORE_TIME: ({ DESTRUCTRED_VARIABLE, ANOTHER_DYNAMIC_VARIABLE }) =>
    DESTRUCTRED_VARIABLE + ANOTHER_DYNAMIC_VARIABLE,
};
```

If the value corresponding to a key is a function, it will be executed with the current state of `dotenv` as its single argument and the result applied back to the `dotenv` object. Otherwise, the value will just be applied back to `dotenv`.

Since keys will be evaluated progressively, each successive key function will have access to any previous ones. These keys can also override existing variables.

## Command Line Interface

You can also use `getdotenv` from the command line:

```bash
> npx getdotenv -h

# Usage: getdotenv [options] [command]
#
# Base CLI.
#
# Options:
#   -e, --env <string>                  target environment (dotenv-expanded)
#   -v, --vars <string>                 extra variables expressed as delimited key-value pairs (dotenv-expanded): KEY1=VAL1 KEY2=VAL2
#   -c, --command <string>              shell command string, conflicts with cmd subcommand (dotenv-expanded)
#   -o, --output-path <string>          consolidated output file  (dotenv-expanded)
#   -p, --load-process                  load variables to process.env ON (default)
#   -P, --load-process-off              load variables to process.env OFF
#   -a, --exclude-all                   exclude all dotenv variables from loading ON
#   -A, --exclude-all-off               exclude all dotenv variables from loading OFF (default)
#   -z, --exclude-dynamic               exclude dynamic dotenv variables from loading ON
#   -Z, --exclude-dynamic-off           exclude dynamic dotenv variables from loading OFF (default)
#   -n, --exclude-env                   exclude environment-specific dotenv variables from loading
#   -N, --exclude-env-off               exclude environment-specific dotenv variables from loading OFF (default)
#   -g, --exclude-global                exclude global dotenv variables from loading ON
#   -G, --exclude-global-off            exclude global dotenv variables from loading OFF (default)
#   -r, --exclude-private               exclude private dotenv variables from loading ON
#   -R, --exclude-private-off           exclude private dotenv variables from loading OFF (default)
#   -u, --exclude-public                exclude public dotenv variables from loading ON
#   -U, --exclude-public-off            exclude public dotenv variables from loading OFF (default)
#   -l, --log                           console log loaded variables ON
#   -L, --log-off                       console log loaded variables OFF (default)
#   -d, --debug                         debug mode ON
#   -D, --debug-off                     debug mode OFF (default)
#   --default-env <string>              default target environment
#   --dotenv-token <string>             dotenv-expanded token indicating a dotenv file (default: ".env")
#   --dynamic-path <string>             dynamic variables path
#   --paths <string>                    dotenv-expanded delimited list of paths to dotenv directory (default: "./")
#   --paths-delimiter <string>          paths delimiter string (default: " ")
#   --paths-delimiter-pattern <string>  paths delimiter regex pattern
#   --private-token <string>            dotenv-expanded token indicating private variables (default: "local")
#   --vars-delimiter <string>           vars delimiter string (default: " ")
#   --vars-delimiter-pattern <string>   vars delimiter regex pattern
#   --vars-assignor <string>            vars assignment operator string (default: "=")
#   --vars-assignor-pattern <string>    vars assignment operator regex pattern
  -h, --help                          display help for command
#
# Commands:
#   batch [options]                     Batch shell commands across multiple working directories.
#   cmd                                 execute shell command, conflicts with --command option (default command)
#   help [command]                      display help for command
```

See [this example repo](https://github.com/karmaniverous/get-dotenv-child) for a deep dive on using the `getDotenv` CLI and how to extend it for your own projects.

### Batch Command

The `getdotenv` base CLI includes one very useful subcommand: `batch`.

This command lets you execute a shell command across multiple working directories. Executions occur within the loaded `dotenv` context, which may or may not be relevant.

My most common use case for this command is a microservice project where release day finds me updating dependencies & performing a release in over a dozen very similar repositories. The sequence of steps in each case is exactly the same, but I need to respond individually as issues arise, so scripting the whole thing out would fail more often than it would work.

I use the `batch` command to perform each step across all repositories at once. Once you get used to it, it feels like a superpower!

Lest you doubt, consider this:

[![batch superpower in action](./doc/contributions.png)](https://github.com/karmaniverous)

```bash
> getdotenv batch -h

# Usage: getdotenv batch [options] [command]
#
# Batch shell commands across multiple working directories.
#
# Options:
#   -p, --pkg-cwd             use nearest package directory as current working directory
#   -r, --root-path <string>  path to batch root directory from current working directory (default: "./")
#   -g, --globs <strings...>  space-delimited globs from root path (default: "*")
#   -c, --command <string>    shell command string, conflicts with cmd subcommand (dotenv-expanded)
#   -l, --list                list working directories without executing command
#   -e, --ignore-errors       ignore errors and continue with next path
#   -h, --help                display help for command
#
# Commands:
#   cmd                       batch execute shell command, conflicts with --command option (default command)
#   help [command]            display help for command
```

---

See more great templates & tools on [my GitHub Profile](https://github.com/karmaniverous)!
