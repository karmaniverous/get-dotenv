# get-dotenv

Load environment variables with a cascade of environment-aware dotenv files. You can:

- Load dotenv files synchronously or asynchronously.
- Load variables for a specific environment or none.
- Define dynamic variables progressively in terms of other variables and other logic.
- Exclude public, private, global, environment-specific, or dynamic variables.
- Specify explicit variables to include.
- Extract the resulting variables to an object, `process.env`, a dotenv file, or a logger object, in any combination.
- Execute a shell command within the resulting environment. You can even nest additional `getdotenv` calls!
- Specify the directories containing your dotenv files.
- Specify the filename token that identifies dotenv files (e.g. '.env').
- Specify the filename extension that identifies private variables (e.g. 'local').
- Set defaults for all options in a [`getdotenv.config.json`](./getdotenv.config.json) file in your project root directory.
- Generate a custom `getdotenv`-based CLI for use in your own projects.

`getdotenv` relies on the excellent [`dotenv`](https://www.npmjs.com/package/dotenv) parser and uses [`dotenv-expand`](https://www.npmjs.com/package/dotenv-expand) for recursive variable expansion.

The command-line version populates `process.env` from your dotenv files (you can also specify values inline) and can then execute a shell command within that context. Any child `getdotenv` instances will inherit as defaults the parent shell's environment and optionally its `getdotenv` settings.

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

- An example of dotenv-based environment config.
- Integrating `getdotenv` into your npm scripts.
- Creating a `getdotenv`-based CLI.
- Some gotchas & tips around managing your shell execution context.

# Command Line Interface

Note that the defaults below can be changed in your own environment by deriving your base CLI using the `getDotenvCli` function or placing a `getdotenv.options.json` file in your project root directory.

```text
Usage: getdotenv [options] [command]

Base CLI.

Options:
  -e, --env <string>                  target environment
  -v, --vars <string>                 dotenv-expanded delimited key-value pairs: KEY1=VAL1 KEY2=VAL2 (default: "")
  -c, --command <string>              dotenv-expanded shell command string
  -o, --output-path <string>          consolidated output file, follows dotenv-expand rules using loaded env vars
  -p, --load-process                  load variables to process.env ON (default)
  -P, --load-process-off              load variables to process.env OFF
  -a, --exclude-all                   exclude all dotenv variables from loading ON
  -A, --exclude-all-off               exclude all dotenv variables from loading OFF (default)
  -z, --exclude-dynamic               exclude dynamic dotenv variables from loading ON
  -Z, --exclude-dynamic-off           exclude dynamic dotenv variables from loading OFF (default)
  -n, --exclude-env                   exclude environment-specific dotenv variables from loading
  -N, --exclude-env-off               exclude environment-specific dotenv variables from loading OFF (default)
  -g, --exclude-global                exclude global dotenv variables from loading ON
  -G, --exclude-global-off            exclude global dotenv variables from loading OFF (default)
  -r, --exclude-private               exclude private dotenv variables from loading ON
  -R, --exclude-private-off           exclude private dotenv variables from loading OFF (default)
  -u, --exclude-public                exclude public dotenv variables from loading ON
  -U, --exclude-public-off            exclude public dotenv variables from loading OFF (default)
  -l, --log                           console log loaded variables ON
  -L, --log-off                       console log loaded variables OFF (default)
  -d, --debug                         debug mode ON
  -D, --debug-off                     debug mode OFF (default)
  --default-env <string>              default target environment (default: "dev")
  --dotenv-token <string>             dotenv-expanded token indicating a dotenv file (default: ".env")
  --dynamic-path <string>             dynamic variables path (default: "./env/dynamic.js")
  --paths <string>                    dotenv-expanded delimited list of paths to dotenv directory (default: "./ ./env")
  --paths-delimiter <string>          paths delimiter string (default: " ")
  --paths-delimiter-pattern <string>  paths delimiter regex pattern (default: "\\s+")
  --private-token <string>            dotenv-expanded token indicating private variables (default: "local")
  --vars-delimiter <string>           vars delimiter string (default: " ")
  --vars-delimiter-pattern <string>   vars delimiter regex pattern (default: "\\s+")
  --vars-assignor <string>            vars assignment operator string (default: "=")
  --vars-assignor-pattern <string>    vars assignment operator regex pattern (default: "=")
  -h, --help                          display help for command

Commands:
  cmd                                 execute shell command string (default command)
  help [command]                      display help for command
```

# API Documentation

## Functions

<dl>
<dt><a href="#getDotenv">getDotenv([options])</a> ⇒ <code>Promise.&lt;object&gt;</code></dt>
<dd><p>Asynchronously process dotenv files of the form .env[.<ENV>][.<PRIVATE_TOKEN>]</p>
</dd>
<dt><a href="#getDotenvSync">getDotenvSync([options])</a> ⇒ <code>Object</code></dt>
<dd><p>Synchronously process dotenv files of the form .env[.<ENV>][.<PRIVATETOKEN>]</p>
</dd>
<dt><a href="#getDotenvCli">getDotenvCli([options])</a> ⇒ <code>object</code></dt>
<dd><p>Generate a CLI for get-dotenv.</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#GetDotenvOptions">GetDotenvOptions</a> : <code>Object</code></dt>
<dd><p>get-dotenv options type</p>
</dd>
<dt><a href="#GetDotenvPreHookCallback">GetDotenvPreHookCallback</a> ⇒ <code>GetDotenvCliOptions</code></dt>
<dd><p>GetDotenv CLI Pre-hook Callback type. Transforms inbound options &amp; executes side effects.</p>
</dd>
<dt><a href="#GetDotenvPostHookCallback">GetDotenvPostHookCallback</a> : <code>function</code></dt>
<dd><p>GetDotenv CLI Post-hook Callback type. Executes side effects within getdotenv context.</p>
</dd>
</dl>

<a name="getDotenv"></a>

## getDotenv([options]) ⇒ <code>Promise.&lt;object&gt;</code>
Asynchronously process dotenv files of the form .env[.<ENV>][.<PRIVATE_TOKEN>]

**Kind**: global function  
**Returns**: <code>Promise.&lt;object&gt;</code> - The combined parsed dotenv object.  

| Param | Type | Description |
| --- | --- | --- |
| [options] | [<code>GetDotenvOptions</code>](#GetDotenvOptions) | options object |

<a name="getDotenvSync"></a>

## getDotenvSync([options]) ⇒ <code>Object</code>
Synchronously process dotenv files of the form .env[.<ENV>][.<PRIVATETOKEN>]

**Kind**: global function  
**Returns**: <code>Object</code> - The combined parsed dotenv object.  

| Param | Type | Description |
| --- | --- | --- |
| [options] | [<code>GetDotenvOptions</code>](#GetDotenvOptions) | options object |

<a name="getDotenvCli"></a>

## getDotenvCli([options]) ⇒ <code>object</code>
Generate a CLI for get-dotenv.

**Kind**: global function  
**Returns**: <code>object</code> - The CLI command.  

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>object</code> | options object |
| [options.alias] | <code>string</code> | cli alias (used for cli help) |
| [options.command] | <code>string</code> | [dotenv-expanded](https://github.com/motdotla/dotenv-expand/blob/master/tests/.env) shell command string |
| [options.debug] | <code>bool</code> | debug mode |
| [options.defaultEnv] | <code>string</code> | default target environment |
| [options.description] | <code>string</code> | cli description (used for cli help) |
| [options.dotenvToken] | <code>string</code> | [dotenv-expanded](https://github.com/motdotla/dotenv-expand/blob/master/tests/.env) token indicating a dotenv file |
| [options.dynamicPath] | <code>string</code> | path to file exporting an object keyed to dynamic variable functions |
| [options.excludeDynamic] | <code>bool</code> | exclude dynamic dotenv variables |
| [options.excludeEnv] | <code>bool</code> | exclude environment-specific dotenv variables |
| [options.excludeGlobal] | <code>bool</code> | exclude global dotenv variables |
| [options.excludePrivate] | <code>bool</code> | exclude private dotenv variables |
| [options.excludePublic] | <code>bool</code> | exclude public dotenv variables |
| [options.loadProcess] | <code>bool</code> | load variables to process.env |
| [options.log] | <code>bool</code> | log result to console |
| [options.logger] | <code>function</code> | logger function |
| [options.outputPath] | <code>string</code> | consolidated output file, [dotenv-expanded](https://github.com/motdotla/dotenv-expand/blob/master/tests/.env) using loaded env vars |
| [options.paths] | <code>string</code> | [dotenv-expanded](https://github.com/motdotla/dotenv-expand/blob/master/tests/.env) delimited list of input directory paths |
| [options.pathsDelimiter] | <code>string</code> | paths delimiter string |
| [options.pathsDelimiterPattern] | <code>string</code> | paths delimiter regex pattern |
| [config.preHook] | [<code>GetDotenvPreHookCallback</code>](#GetDotenvPreHookCallback) | transforms cli options & executes side effects |
| [options.privateToken] | <code>string</code> | [dotenv-expanded](https://github.com/motdotla/dotenv-expand/blob/master/tests/.env) token indicating private variables |
| [config.postHook] | [<code>GetDotenvPostHookCallback</code>](#GetDotenvPostHookCallback) | executes side effects within getdotenv context |
| [options.vars] | <code>string</code> | [dotenv-expanded](https://github.com/motdotla/dotenv-expand/blob/master/tests/.env) delimited list of explicit environment variable key-value pairs |
| [options.varsAssignor] | <code>string</code> | variable key-value assignor string |
| [options.varsAssignorPattern] | <code>string</code> | variable key-value assignor regex pattern |
| [options.varsDelimiter] | <code>string</code> | variable key-value pair delimiter string |
| [options.varsDelimiterPattern] | <code>string</code> | variable key-value pair delimiter regex pattern |

<a name="GetDotenvOptions"></a>

## GetDotenvOptions : <code>Object</code>
get-dotenv options type

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [dotenvToken] | <code>string</code> | token indicating a dotenv file |
| [dynamicPath] | <code>string</code> | path to file exporting an object keyed to dynamic variable functions |
| [env] | <code>string</code> | target environment |
| [excludeDynamic] | <code>bool</code> | exclude dynamic variables |
| [excludeEnv] | <code>bool</code> | exclude environment-specific variables |
| [excludeGlobal] | <code>bool</code> | exclude global & dynamic variables |
| [excludePrivate] | <code>bool</code> | exclude private variables |
| [excludePublic] | <code>bool</code> | exclude public variables |
| [loadProcess] | <code>bool</code> | load dotenv to process.env |
| [log] | <code>bool</code> | log result to logger |
| [logger] | <code>function</code> | logger object (defaults to console) |
| [outputPath] | <code>string</code> | if populated, writes consolidated .env file to this path (follows [dotenv-expand rules](https://github.com/motdotla/dotenv-expand/blob/master/tests/.env)) |
| [paths] | <code>Array.&lt;string&gt;</code> | array of input directory paths |
| [privateToken] | <code>string</code> | token indicating private variables |
| [vars] | <code>object</code> | explicit variables to include |

<a name="GetDotenvPreHookCallback"></a>

## GetDotenvPreHookCallback ⇒ <code>GetDotenvCliOptions</code>
GetDotenv CLI Pre-hook Callback type. Transforms inbound options & executes side effects.

**Kind**: global typedef  
**Returns**: <code>GetDotenvCliOptions</code> - transformed GetDotenv CLI Options object (undefined return value is ignored)  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>GetDotenvCliOptions</code> | inbound GetDotenv CLI Options object |

<a name="GetDotenvPostHookCallback"></a>

## GetDotenvPostHookCallback : <code>function</code>
GetDotenv CLI Post-hook Callback type. Executes side effects within getdotenv context.

**Kind**: global typedef  

| Param | Type | Description |
| --- | --- | --- |
| dotenv | <code>object</code> | dotenv object |


---

See more great templates and other tools on
[my GitHub Profile](https://github.com/karmaniverous)!
