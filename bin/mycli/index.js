#!/usr/bin/env node

// Import package exports.
import { foo, packageInfo } from '@karmaniverous/npm-package-template';

// Create CLI.
import { program } from 'commander';

// CLI description.
program.name('mycli');
program.description('Foos your bar.');

// CLI options.
program.option('-b, --bar <string>', 'foo what?');
program.option('-v, --version', 'display package version');

// Parse CLI options from command line.
program.parse();
const { bar, version } = program.opts();

// Execute CLI logic.
if (version) console.log((await packageInfo()).version);
else console.log(`foo ${foo(bar)}!`);
