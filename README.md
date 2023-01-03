# get-dotenv

Load environment variables with a cascade of environment-aware dotenv files. You can:

- Load dotenv files synchronously or asynchronously.
- Specify the directory containing your dotenv files.
- Specify the token that identifies dotenv files (e.g. '.env').
- Specify the token that identifies private vatiables (e.g. 'local').
- Load variables for a specific environment or none.
- Exclude public or private variables.
- Extract variables to an object, to `process.env`, or both.
- Log the result to the console.

The command-line version can pull the environment designator from a number of sources, populate `process.env`, and execute a shell command.

# Command Line Interface

```text
Usage: getdotenv [options]

Load environment variables with a cascade of environment-aware
dotenv files. You can:

* Specify the directory containing your dotenv files.
* Specify the token that identifies dotenv files (e.g. '.env').
* Specify the token that identifies private vatiables (e.g. '.local').
* Specify a default environment, override the default with an
  environment variable, and override both with a direct setting.
* Exclude public or private variables.
* Execute a shell command after loading variables.

Options:
  -p, --path <string>                path to dotenv directory (default './')
  -t, --dotenv-token <string>        token indicating a dotenv file (default: '.env')
  -i, --private-token <string>       token indicating private variables (default: 'local')
  -d, --defaultEnvironment <string>  default environment
  -e, --environment <string>         designated environment
  -v, --variable <string>            environment from variable
  -r, --exclude-private              exclude private variables (default: false)
  -u, --exclude-public               exclude public variables (default: false)
  -c, --command <string>             shell command
  -l, --log                          log extracted variables (default: false)
  -h, --help                         display help for command
```

# API Documentation

```js
import { foo, PACKAGE_INFO } from '@karmaniverous/npm-package-template`;
```

## Functions

<dl>
<dt><a href="#getDotenv">getDotenv([options])</a> ⇒ <code>Object</code></dt>
<dd><p>Asynchronously process dotenv files of the form .env[.<ENV>][.<PRIVATETOKEN>]</p>
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

## getDotenv([options]) ⇒ <code>Object</code>
Asynchronously process dotenv files of the form .env[.<ENV>][.<PRIVATETOKEN>]

**Kind**: global function  
**Returns**: <code>Object</code> - The combined parsed dotenv object.  

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
| [env] | <code>string</code> | target environment |
| [excludePrivate] | <code>bool</code> | exclude private variables (default: false) |
| [excludePublic] | <code>bool</code> | exclude public variables (default: false) |
| [loadProcess] | <code>bool</code> | load dotenv to process.env (default: false) |
| [log] | <code>bool</code> | log result to console (default: false) |
| [path] | <code>string</code> | path to target directory |
| [privateToken] | <code>string</code> | token indicating private variables (default: 'local'). |


---

See more great templates and other tools on
[my GitHub Profile](https://github.com/karmaniverous)!
