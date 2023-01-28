#!/usr/bin/env node

// Import npm packages.
import spawn from 'cross-spawn';
import { parseArgsStringToArgv } from 'string-argv';

// Import package exports.
import { getDotenvSync } from '@karmaniverous/get-dotenv';

// Create CLI.
import { program } from 'commander';

// CLI description.
program
  .name('getdotenv')
  .usage('[options] [-- [command]]')
  .description(
    [
      `Load environment variables with a cascade of environment-aware`,
      `dotenv files. You can:`,
      ``,
      `* Specify the directories containing your dotenv files.`,
      `* Specify the token that identifies dotenv files (e.g. '.env').`,
      `* Specify the token that identifies private vatiables (e.g. '.local').`,
      `* Specify a default environment, override the default with an existing`,
      `  environment variable, and override both with a direct setting.`,
      `* Exclude public or private variables.`,
      `* Execute a shell command after loading variables.`,
      `* Place the shell command inside the invocation to support npm script`,
      `  arguments for other options.`,
    ].join('\n')
  );

// CLI options.
program
  .option(
    '-p, --paths <string>',
    "delimited paths to dotenv directory (default './')",
    './'
  )
  .option('-a, --path-delimiter', 'path delimiter (default space)', ' ')
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
  .option('-c, --command <string>', 'shell command string')
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
  paths,
  pathDelimiter,
  privateToken,
  variable,
} = program.opts();

if (command && program.args.length) program.error('command specified twice');

// Get environment.
const env = environment ?? process.env[variable] ?? defaultEnvironment;

// Load dotenvs.
getDotenvSync({
  dotenvToken,
  env,
  excludePrivate,
  excludePublic,
  loadProcess: true,
  log,
  paths: paths.split(pathDelimiter),
  privateToken,
});

// Execute shell command.
if (command || program.args.length) {
  const argv = program.args.length
    ? program.args
    : parseArgsStringToArgv(command);

  spawn(argv[0], argv.slice(1), { stdio: 'inherit' }).on(
    'exit',
    function (exitCode, signal) {
      if (typeof exitCode === 'number') {
        process.exit(exitCode);
      } else {
        process.kill(process.pid, signal);
      }
    }
  );
}
