# get-dotenv

Load environment variables with a cascade of environment-aware dotenv files. You can:

✅ Asynchronously load environment variables from multiple dotenv files.

✅ Segregate variables info distinct files:

- Public files (e.g. `.env`, `env.dev`, `env.test`) are synced with your git repository.
- Private files (e.g. `.env.local`, `env.dev.local`, `env.test.local`) are protected by `.gitignore`.
- Global files (e.g. `.env`, `env.local`) apply to all environments.
- Env files (e.g. `.env.dev`, `.env.dev.local`, `.env.test`, `.env.test.local`) apply to a specific environment.
- [Dynamic files](#dynamic-processing) (`.env.js`) export logic that dynamically & progressively generates new variables or overrides current ones.

✅ Dynamically specify which variables to load by type.

✅ Explicitly add variables to the loaded set.

✅ Extract the resulting variables to an object, `process.env`, a dotenv file, or a logger object, in any combination.

✅ Customize your dotenv file directories & naming patterns.

✅ Perform all of the above either programmatically or [from the command line](#command-line-interface), where you can also execute additional commands within the resulting context... including nested `getdotenv` commands that inherit the parent command's settings & context!

✅ [Execute batched CLI commands](#batch-command) across multiple working directories, with each command inheriting the `getdotenv` context.

✅ Set defaults for all options in a `getdotenv.config.json` file in your project root directory.

✅ [Generate an extensible `getdotenv`-based CLI](https://github.com/karmaniverous/get-dotenv-child) for use in your own projects.

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

Options can be passed programmatically or set in a `getdotenv.config.json` file in your project root directory. The same file also sets default options for the `getdotenv` CLI or any child CLI you spawn from it.

See the [child CLI example repo](https://github.com/karmaniverous/get-dotenv-child#configuration) for an extensiive discussion of the various config options and how & where to set them.

## Dynamic Processing

This package supports the full [`dotenv-expand`](https://www.npmjs.com/package/dotenv-expand) syntax, with some internal performance improvements.

Use the `dynamicPath` option to add a relative path to a Javascript module with a default export like this:

```js
export default {
  SOME_DYNAMIC_VARIABLE: (dotenv) => someLogic(dotenv),
  ANOTHER_DYNAMIC_VARIABLE: (dotenv) =>
    someOtherLogic(dotenv.SOME_DYNAMIC_VARIABLE),
  ONE_MORE_TIME: ({ DESTRUCTRED_VARIABLE, ANOTHER_DYNAMIC_VARIABLE }) =>
    DESTRUCTRED_VARIABLE + ANOTHER_DYNAMIC_VARIABLE,
};
```

If the value corresponding to a key is a function, it will be executed with the current state of `dotenv` as its single argument and the result applied back to the `dotenv` object. Otherwise, the value will just be applied back to `dotenv`. (Although if you're going to do that then you might as well just create a public global variable in the first place.)

Since keys will be evaluated progressively, each successive key function will have access to any previous ones. These keys can also override existing variables.

### Dynamic Processing with TypeScript

Even though the rest of your project is in TypeScript, the dynamic processing module SHOULD be in JavasScript.

Think about it: the module is loaded via a dynamic import, with the file name determined at run time. You will have to jump through some hoops to get your bundler to compile this file, and you'll have to be careful to set `dynamicPath` to reference the compiled file. That's a lot of work for some very simple log.

BUT... if you must, then your dynamic module's default export should be of the `GetDotenvDynamic` type, which is defined [here](./src/GetDotenvOptions.ts) and looks like this:

```ts
export type ProcessEnv = Record<string, string | undefined>;

export type GetDotenvDynamicFunction = (vars: ProcessEnv) => string | undefined;

export type GetDotenvDynamic = Record<
  string,
  GetDotenvDynamicFunction | ReturnType<GetDotenvDynamicFunction>
>;
```

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
#   -c, --command <string>              command executed according to the --shell option, conflicts with cmd subcommand (dotenv-expanded)
#   -o, --output-path <string>          consolidated output file  (dotenv-expanded)
#   -s, --shell [string]                command execution shell, no argument for default OS shell or provide shell string (default OS shell)
#   -S, --shell-off                     command execution shell OFF
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
#   -h, --help                          display help for command
#
# Commands:
#   batch [options]                     Batch shell commands across multiple working directories.
#   cmd                                 Batch execute command according to the --shell option, conflicts with --command option (default command)
#   help [command]                      display help for command
```

By default, commands (`-c` or `--command` or the `cmd` subcommand either in the base CLI or in the `batch` subcommand) execute in the default OS shell with the `dotenv` context applied. The `-S` or `--shell-off` options will turn this off, and Execa will [execute your command as Javascript](https://github.com/sindresorhus/execa/blob/main/docs/bash.md).

Alternatively, you can use the `-s` or `--shell` option to specify a different shell [following the Execa spec](https://github.com/sindresorhus/execa/blob/main/docs/shell.md). This is useful if you're running a command that requires a specific shell, like `bash` or `zsh`.

Finally, you can set the [`shell`](https://github.com/karmaniverous/get-dotenv-child?tab=readme-ov-file#options) default globally in your `getdotenv.config.json` file.

See [this example repo](https://github.com/karmaniverous/get-dotenv-child) for a deep dive on using the `getDotenv` CLI and how to extend it for your own projects.

### Batch Command

The `getdotenv` base CLI includes one very useful subcommand: `batch`.

This command lets you execute a shell command across multiple working directories. Executions occur within the loaded `dotenv` context. Might not be relevant to your specific use case, but when you need it, it's a game-changer!

My most common use case for this command is a microservice project where release day finds me updating dependencies & performing a release in well over a dozen very similar repositories. The sequence of steps in each case is exactly the same, but I need to respond individually as issues arise, so scripting the whole thing out would fail more often than it would work.

I use the `batch` command to perform each step across all repositories at once. Once you get used to it, it feels like a superpower!

Lest you doubt what that kind of leverage can do for you, consider this:

[![batch superpower in action](./doc/contributions.png)](https://github.com/karmaniverous)

```bash
> getdotenv batch -h

# Usage: getdotenv batch [options] [command]
#
# Batch command execution across multiple working directories.
#
# Options:
#   -p, --pkg-cwd             use nearest package directory as current working directory
#   -r, --root-path <string>  path to batch root directory from current working directory (default: "./")
#   -g, --globs <string>      space-delimited globs from root path (default: "*")
#   -c, --command <string>    command executed according to the base --shell option, conflicts with cmd subcommand (dotenv-expanded)
#   -l, --list                list working directories without executing command
#   -e, --ignore-errors       ignore errors and continue with next path
#   -h, --help                display help for command
#
# Commands:
#   cmd                       execute command, conflicts with --command option (default subcommand)
#   help [command]            display help for command
```

Note that `batch` executes its commands in sequence, rather than in parallel!

To understand why, imagine running `npm install` in a dozen repos from the same command line. The visual feedback would be impossible to follow, and if something broke you'd have a really hard time figuring out why.

Instead, everything runs in sequence, and you get a clear record of exactly what heppened and where. Also worth noting that many complex processes are resource hogs: you would not _want_ to run a dozen Serverless deployments at once!

Meanwhile, [this issue](https://github.com/karmaniverous/get-dotenv/issues/7) documents the parallel-processing option requirement. Feel free to submit a PR!

---

See more great templates & tools on [my GitHub Profile](https://github.com/karmaniverous)!
