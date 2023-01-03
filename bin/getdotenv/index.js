#!/usr/bin/env node

// Import package exports.
import { getDotenvSync } from '@karmaniverous/get-dotenv';
import { execSync } from 'child_process';

// Create CLI.
import { program } from 'commander';

// CLI description.
program.name('getdotenv');
program.description(
  `Load environment variables with a cascade of environment-aware 
dotenv files. You can:

* Specify the directory containing your dotenv files.
* Specify the token that identifies dotenv files (e.g. '.env').
* Specify the token that identifies private vatiables (e.g. '.local').
* Specify a default environment, override the default with an 
  environment variable, and override both with a direct setting. 
* Exclude public or private variables.
* Execute a shell command after loading variables.`
);

// CLI options.
program
  .option('-p, --path <string>', "path to dotenv directory (default './')")
  .option(
    '-t, --dotenv-token <string>',
    "token indicating a dotenv file (default: '.env')"
  )
  .option(
    '-i, --private-token <string>',
    "token indicating private variables (default: 'local')"
  )
  .option('-d, --defaultEnvironment <string>', 'default environment')
  .option('-e, --environment <string>', 'designated environment')
  .option('-v, --variable <string>', 'environment from variable')
  .option('-r, --exclude-private', 'exclude private variables (default: false)')
  .option('-u, --exclude-public', 'exclude public variables (default: false)')
  .option('-c, --command <string>', 'shell command')
  .option('-l, --log', 'log extracted variables (default: false)');

// Parse CLI options from command line.
program.parse();
const {
  command,
  defaultEnvironment,
  dotenvToken,
  environment,
  excludePrivate,
  excludePublic,
  log,
  path,
  privateToken,
  variable,
} = program.opts();

// Get environment.
const env = environment ?? process.env[variable] ?? defaultEnvironment;

// Load dotenvs.
const dotenv = getDotenvSync({
  dotenvToken,
  env,
  excludePrivate,
  excludePublic,
  loadProcess: true,
  path,
  privateToken,
});

// Log dotenvs.
if (log) console.log(dotenv);

// Execute shell command.
if (command)
  execSync(command, {
    stdio: 'inherit',
  });
