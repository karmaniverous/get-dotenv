# API Documentation

## Functions

<dl>
<dt><a href="#getDotenv">getDotenv([options])</a> ⇒ <code>Object</code></dt>
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

## getDotenv([options]) ⇒ <code>Object</code>
Asynchronously process dotenv files of the form .env[.<ENV>][.<PRIVATE_TOKEN>]

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
| [path] | <code>string</code> | path to target directory (default './') |
| [privateToken] | <code>string</code> | token indicating private variables (default: 'local'). |

