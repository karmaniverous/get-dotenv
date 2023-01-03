#!/usr/bin/env node

// Import package exports.
import { getDotenvSync } from '@karmaniverous/get-dotenv';
import { execSync } from 'child_process';

// Create CLI.
import { program } from 'commander';

// CLI description.
program.name('getdotenv');
program.description(
  `Load environment variables with dotenv files from a designated
directory. Optionally specify a default environment, override the 
default with an already-populated environment variable, and override 
both with a direct setting. Optionally execute a shell command after
loading variables.`
);

// CLI options.
program
  .option('-c, --command <string>', 'shell command (required)')
  .option('-d, --defaultEnvironment <string>', 'default environment')
  .option(
    '-t, --dotenv-token <string>',
    "token indicating a dotenv file (default: '.env')"
  )
  .option('-e, --environment <string>', 'environment')
  .option('-r, --exclude-private', 'exclude private variables (default: false)')
  .option('-u, --exclude-public', 'exclude public variables (default: false)')
  .option('-l, --log', 'log extracted variables (default: false)')
  .option('-p, --path <string>', "path to target directory (default './')")
  .option(
    '-i, --private-token <string>',
    "token indicating private variables (default: 'local')"
  )
  .option('-v, --variable <string>', 'environment from variable');

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
