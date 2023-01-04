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
