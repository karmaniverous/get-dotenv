# API Documentation

```js
import { foo, PACKAGE_INFO } from '@karmaniverous/npm-package-template`;
```

## Functions

<dl>
<dt><a href="#getDotenv">getDotenv([options])</a> ⇒ <code>Object</code></dt>
<dd><p>Asynchronously process dotenv files of the form .env[.<ENV>][.&lt;PRIVATEEXT]</p>
</dd>
<dt><a href="#getDotenv">getDotenv([options])</a> ⇒ <code>Object</code></dt>
<dd><p>Synchronously process dotenv files of the form .env[.<ENV>][.&lt;PRIVATEEXT]</p>
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
Asynchronously process dotenv files of the form .env[.<ENV>][.<PRIVATEEXT]

**Kind**: global function  
**Returns**: <code>Object</code> - The combined parsed dotenv object.  

| Param | Type | Description |
| --- | --- | --- |
| [options] | [<code>OptionsType</code>](#OptionsType) | options object |

<a name="getDotenv"></a>

## getDotenv([options]) ⇒ <code>Object</code>
Synchronously process dotenv files of the form .env[.<ENV>][.<PRIVATEEXT]

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
| [path] | <code>string</code> | path to target directory |
| [privateToken] | <code>string</code> | token indicating private variables (default: 'local'). |

