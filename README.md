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

# Command Line Interface

```text
Usage: getdotenv [options] [-- [command]]

Load environment variables with a cascade of environment-aware
dotenv files. You can:

* Specify the directories containing your dotenv files.
* Specify the token that identifies dotenv files (e.g. '.env').
* Specify the token that identifies private vatiables (e.g. '.local').
* Load variables for a specific environment or none.
* Specify a default environment, override the default with an existing
  environment variable, and override both with a direct setting.
* Exclude public or private variables.
* Exclude global & dynamic or environment-specific variables.
* Define dynamic variables progressively in terms of other variables and
  other logic.
* Execute a &&-delimited series of shell commands after loading variables.
* Place the shell commands inside the invocation to support npm script
  arguments for other options.

Options:
  -p, --paths <strings...>           space-delimited paths to dotenv directory (default './')
  -t, --dotenv-token <string>        token indicating a dotenv file (default: '.env')
  -i, --private-token <string>       token indicating private variables (default: 'local')
  -d, --defaultEnvironment <string>  default environment
  -e, --environment <string>         designated environment
  -v, --variable <string>            environment from variable
  -n, --exclude-env                  exclude environment-specific variables (default: false)
  -g, --exclude-global               exclude global & dynamic variables (default: false)
  -r, --exclude-private              exclude private variables (default: false)
  -u, --exclude-public               exclude public variables (default: false)
  -y, --dynamic-path <string>        dynamic variables path
  -c, --command <string>             shell command string
  -l, --log                          log extracted variables (default: false)
  -h, --help                         display help for command
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
</dl>

## Typedefs

<dl>
<dt><a href="#OptionsType">OptionsType</a> : <code>Object</code></dt>
<dd><p>get-dotenv options type</p>
</dd>
</dl>

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

<a name="OptionsType"></a>

## OptionsType : <code>Object</code>
get-dotenv options type

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [dotenvToken] | <code>string</code> | token indicating a dotenv file (default: '.env') |
| [dynamicPath] | <code>string</code> | path to file exporting an object keyed to dynamic variable functions |
| [env] | <code>string</code> | target environment |
| [excludeEnv] | <code>bool</code> | exclude environment-specific variables (default: false) |
| [excludeGlobal] | <code>bool</code> | exclude global & dynamic variables (default: false) |
| [excludePrivate] | <code>bool</code> | exclude private variables (default: false) |
| [excludePublic] | <code>bool</code> | exclude public variables (default: false) |
| [loadProcess] | <code>bool</code> | load dotenv to process.env (default: false) |
| [log] | <code>bool</code> | log result to console (default: false) |
| [paths] | <code>Array.&lt;string&gt;</code> | array of target directory paths (default ['./']) |
| [privateToken] | <code>string</code> | token indicating private variables (default: 'local'). |


---

See more great templates and other tools on
[my GitHub Profile](https://github.com/karmaniverous)!
