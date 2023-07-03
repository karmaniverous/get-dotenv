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

# Command Line Interface

Note that the defaults below can be changed in your own environment by deriving your base CLI using the `getCli` function.

```text
Usage: getdotenv [options] [command]

Base CLI. All options except delimiters follow dotenv-expand rules.

Options:
  -e, --env <string>            target environment
  --default-env <string>        default target environment (default: "dev")
  -p, --paths <string>          delimited list of paths to dotenv directory (default: "./")
  --paths-delimiter <string>    regex paths delimiter (default: "\\s+")
  -v, --vars <string>           delimited list KEY=VALUE pairs
  --vars-delimiter <string>     regex vars delimiter (default: "\\s+")
  --vars-assignor <string>      regex vars assignment operator (default: "=")
  -y, --dynamic-path <string>   dynamic variables path
  -o, --output-path <string>    consolidated output file, follows dotenv-expand rules using loaded env vars
  -n, --exclude-env [bool]      exclude environment-specific variables (default: false)
  -g, --exclude-global [bool]   exclude global & dynamic variables (default: false)
  -r, --exclude-private [bool]  exclude private variables (default: false)
  -u, --exclude-public [bool]   exclude public variables (default: false)
  -z, --exclude-dynamic [bool]  exclude dynamic variables (default: false)
  -l, --log [bool]              console log extracted variables (default: false)
  -x, --suppress-dotenv         suppress dotenv loading (default: false)
  -c, --command <string>        shell command string
  -s, --shell <string>          execa shell option
  --dotenv-token <string>       token indicating a dotenv file (default: ".env")
  --private-token <string>      token indicating private variables (default: "local")
  -h, --help                    display help for command

Commands:
  cmd                           execute shell command string (default command)
  help [command]                display help for command
```

# API Documentation

## Constants

<dl>
<dt><a href="#getCli">getCli</a> ⇒ <code>object</code></dt>
<dd><p>Generate a CLI for get-dotenv.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#getDotenv">getDotenv([options])</a> ⇒ <code>Promise.&lt;object&gt;</code></dt>
<dd><p>Asynchronously process dotenv files of the form .env[.<ENV>][.<PRIVATE_TOKEN>]</p>
</dd>
<dt><a href="#getDotenvSync">getDotenvSync([options])</a> ⇒ <code>Object</code></dt>
<dd><p>Synchronously process dotenv files of the form .env[.<ENV>][.<PRIVATETOKEN>]</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#GetDotenvCliOptions">GetDotenvCliOptions</a> : <code>Object</code></dt>
<dd><p>GetDotenv CLI Options type</p>
</dd>
<dt><a href="#GetDotenvPreHookCallback">GetDotenvPreHookCallback</a> ⇒ <code><a href="#GetDotenvCliOptions">GetDotenvCliOptions</a></code></dt>
<dd><p>GetDotenv CLI Pre-hook Callback type. Transforms inbound options &amp; executes side effects.</p>
</dd>
<dt><a href="#GetDotenvPostHookCallback">GetDotenvPostHookCallback</a> : <code>function</code></dt>
<dd><p>GetDotenv CLI Post-hook Callback type. Executes side effects within getdotenv context.</p>
</dd>
<dt><a href="#GetDotenvCliConfig">GetDotenvCliConfig</a> : <code>Object</code></dt>
<dd><p>GetDotenv CLI Config type</p>
</dd>
<dt><a href="#OptionsType">OptionsType</a> : <code>Object</code></dt>
<dd><p>get-dotenv options type</p>
</dd>
</dl>

<a name="getCli"></a>

## getCli ⇒ <code>object</code>
Generate a CLI for get-dotenv.

**Kind**: global constant  
**Returns**: <code>object</code> - The CLI command.  

| Param | Type | Description |
| --- | --- | --- |
| [config] | [<code>GetDotenvCliConfig</code>](#GetDotenvCliConfig) | config object |

<a name="getDotenv"></a>

## getDotenv([options]) ⇒ <code>Promise.&lt;object&gt;</code>
Asynchronously process dotenv files of the form .env[.<ENV>][.<PRIVATE_TOKEN>]

**Kind**: global function  
**Returns**: <code>Promise.&lt;object&gt;</code> - The combined parsed dotenv object.  

| Param | Type | Description |
| --- | --- | --- |
| [options] | [<code>OptionsType</code>](#OptionsType) | options object |

<a name="getDotenvSync"></a>

## getDotenvSync([options]) ⇒ <code>Object</code>
Synchronously process dotenv files of the form .env[.<ENV>][.<PRIVATETOKEN>]

**Kind**: global function  
**Returns**: <code>Object</code> - The combined parsed dotenv object.  

| Param | Type | Description |
| --- | --- | --- |
| [options] | [<code>OptionsType</code>](#OptionsType) | options object |

<a name="GetDotenvCliOptions"></a>

## GetDotenvCliOptions : <code>Object</code>
GetDotenv CLI Options type

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [cliInvocation] | <code>string</code> | cli invocation string (used for cli help) |
| [defaultEnv] | <code>string</code> | default target environment |
| [dotenvToken] | <code>string</code> | token indicating a dotenv file |
| [dynamicPath] | <code>string</code> | path to file exporting an object keyed to dynamic variable functions |
| [env] | <code>string</code> | target environment |
| [excludeDynamic] | <code>bool</code> | exclude dynamic variables |
| [excludeEnv] | <code>bool</code> | exclude environment-specific variables |
| [excludeGlobal] | <code>bool</code> | exclude global & dynamic variables |
| [excludePrivate] | <code>bool</code> | exclude private variables |
| [excludePublic] | <code>bool</code> | exclude public variables |
| [log] | <code>bool</code> | log result to console |
| [logger] | <code>function</code> | logger function |
| [outputPath] | <code>string</code> | if populated, writes consolidated .env file to this path (follows [dotenv-expand rules](https://github.com/motdotla/dotenv-expand/blob/master/tests/.env)) |
| [paths] | <code>string</code> | space-delimited list of input directory paths |
| [privateToken] | <code>string</code> | token indicating private variables. |
| [shell] | <code>bool</code> \| <code>string</code> | execa shell option |
| [suppressDotenv] | <code>bool</code> | suppress dotenv loading |

<a name="GetDotenvPreHookCallback"></a>

## GetDotenvPreHookCallback ⇒ [<code>GetDotenvCliOptions</code>](#GetDotenvCliOptions)
GetDotenv CLI Pre-hook Callback type. Transforms inbound options & executes side effects.

**Kind**: global typedef  
**Returns**: [<code>GetDotenvCliOptions</code>](#GetDotenvCliOptions) - transformed GetDotenv CLI Options object (undefined return value is ignored)  

| Param | Type | Description |
| --- | --- | --- |
| options | [<code>GetDotenvCliOptions</code>](#GetDotenvCliOptions) | inbound GetDotenv CLI Options object |

<a name="GetDotenvPostHookCallback"></a>

## GetDotenvPostHookCallback : <code>function</code>
GetDotenv CLI Post-hook Callback type. Executes side effects within getdotenv context.

**Kind**: global typedef  

| Param | Type | Description |
| --- | --- | --- |
| options | [<code>GetDotenvCliOptions</code>](#GetDotenvCliOptions) | GetDotenv CLI Options object |
| dotenv | <code>object</code> | dotenv object |

<a name="GetDotenvCliConfig"></a>

## GetDotenvCliConfig : <code>Object</code>
GetDotenv CLI Config type

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [config] | <code>object</code> | config options |
| [config.defaultOptions] | [<code>GetDotenvCliOptions</code>](#GetDotenvCliOptions) | default options |
| [config.preHook] | [<code>GetDotenvPreHookCallback</code>](#GetDotenvPreHookCallback) | transforms inbound options & executes side effects |
| [config.postHook] | [<code>GetDotenvPostHookCallback</code>](#GetDotenvPostHookCallback) | executes side effects within getdotenv context |

<a name="OptionsType"></a>

## OptionsType : <code>Object</code>
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
| [logger] | <code>function</code> | logger function |
| [outputPath] | <code>string</code> | if populated, writes consolidated .env file to this path (follows [dotenv-expand rules](https://github.com/motdotla/dotenv-expand/blob/master/tests/.env)) |
| [paths] | <code>Array.&lt;string&gt;</code> | array of input directory paths |
| [privateToken] | <code>string</code> | token indicating private variables |
| [vars] | <code>object</code> | explicit variables to include |


---

See more great templates and other tools on
[my GitHub Profile](https://github.com/karmaniverous)!
