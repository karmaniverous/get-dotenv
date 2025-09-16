#!/usr/bin/env node

import type { Command } from 'commander';

import { GetDotenvCli } from '../../cliHost/GetDotenvCli';
import { batchPlugin } from '../../plugins/batch';

// Demonstration CLI using the plugin-first host with the config loader enabled.
const program: Command = new GetDotenvCli('getdotenv-host').use(batchPlugin());

// Add a host-facing flag to enable the guarded config loader path.
// Default remains OFF unless explicitly set by the user.
program.option('--use-config-loader', 'enable config loader/overlay path');

// Build context eagerly so batch subcommands inherit the overlayed env.
// Since we have not parsed Commander options yet, detect the flag from argv to
// decide whether to opt in. Commander will accept the option during parseAsync.
const useConfigLoader =
  process.argv.includes('--use-config-loader') ||
  process.argv.includes('--use-config-loader=true') ||
  process.argv.includes('--use-config-loader=1');

await (program as unknown as GetDotenvCli).resolveAndLoad(
  useConfigLoader ? { useConfigLoader } : {},
);

await program.parseAsync();
