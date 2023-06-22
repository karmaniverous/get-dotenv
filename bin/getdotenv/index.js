#!/usr/bin/env node

// Import npm packages.
import spawn from 'cross-spawn';
import { parseArgsStringToArgv } from 'string-argv';

// Import package exports.
import {
  dotenvExpand,
  getAwsSsoCredentials,
  getDotenv,
  parseBranch,
} from '@karmaniverous/get-dotenv';

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
      `* Define dynamic variables progressively in terms of other variables and`,
      `  other logic.`,
      `* Specify a consolidated output file path.`,
      `* Load variables for a specific environment or none.`,
      `* Specify a default environment, override the default with an existing`,
      `  environment variable, and override both with a direct setting.`,
      `* Derive the default environment from the current git branch`,
      `* Exclude public, private, global, environment-specific, or dynamic variables.`,
      `* Execute a &&-delimited series of shell commands after loading variables,`,
      `  optionally ignoring errors.`,
      `* Place the shell commands inside the invocation to support npm script`,
      `  arguments for other options.`,
      `* Specify the token that identifies dotenv files (e.g. '.env').`,
      `* Specify the token that identifies private vatiables (e.g. '.local').`,
      `* Load AWS SSO session credentials from an AWS Toolkit profile.`,
    ].join('\n')
  );

// CLI options.
program
  .option(
    '-p, --paths <strings...>',
    "space-delimited paths to dotenv directory (default './')"
  )
  .option('-y, --dynamic-path <string>', 'dynamic variables path')
  .option(
    '-o, --output-path <string>',
    'consolidated output file (follows dotenv-expand rules using loaded env vars)'
  )
  .option(
    '-d, --default-environment <string>',
    'default environment (prefix with $ to use environment variable)',
    dotenvExpand
  )
  .option(
    '-b, --branch-to-default',
    'derive default environment from the current git branch (default: false)',
    dotenvExpand
  )
  .option(
    '-e, --environment <string>',
    'designated environment (prefix with $ to use environment variable)',
    dotenvExpand
  )
  .option(
    '-n, --exclude-env',
    'exclude environment-specific variables (default: false)'
  )
  .option(
    '-g, --exclude-global',
    'exclude global & dynamic variables (default: false)'
  )
  .option('-r, --exclude-private', 'exclude private variables (default: false)')
  .option('-u, --exclude-public', 'exclude public variables (default: false)')
  .option('-z, --exclude-dynamic', 'exclude dynamic variables (default: false)')
  .option('-c, --command <string>', 'shell command string')
  .option('-l, --log', 'log extracted variables (default: false)')
  .option(
    '-t, --dotenv-token <string>',
    "token indicating a dotenv file (default: '.env')"
  )
  .option(
    '-i, --private-token <string>',
    "token indicating private variables (default: 'local')"
  )
  .option(
    '-q, --quit-on-error',
    'terminate sequential process on error (default: false)'
  )
  .option(
    '-a, --aws-sso-profile <string>',
    'local AWS SSO profile (follows dotenv-expand rules)'
  );

// Parse CLI options from command line.
program.parse();
const {
  awsSsoProfile,
  branchToDefault,
  command,
  defaultEnvironment,
  dotenvToken,
  dynamicPath,
  environment,
  excludeEnv,
  excludeGlobal,
  excludePrivate,
  excludePublic,
  log,
  outputPath,
  paths,
  privateToken,
  quitOnError,
} = program.opts();

if (command && program.args.length) program.error('command specified twice');

if (branchToDefault) {
  var { envToken } = parseBranch();
}

// Get environment.
const env = environment ?? envToken ?? defaultEnvironment;

// Load dotenvs.
await getDotenv({
  dotenvToken,
  env,
  excludeEnv,
  excludeGlobal,
  excludePrivate,
  excludePublic,
  loadProcess: true,
  dynamicPath,
  log,
  outputPath,
  paths,
  privateToken,
});

// Get AWS SSO credentials.
if (awsSsoProfile) getAwsSsoCredentials(dotenvExpand(awsSsoProfile));

// Execute shell command.
if (command || program.args.length) {
  const argvs = (command ?? program.args.join(' '))
    .split('&&')
    .map((c) => parseArgsStringToArgv(c));

  for (const argv of argvs) {
    const { status } = spawn.sync(argv[0], argv.slice(1), {
      stdio: 'inherit',
    });

    if (status && quitOnError) process.exit(status);
  }
}
