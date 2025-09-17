#!/usr/bin/env node

import type { Command } from 'commander';

import { GetDotenvCli } from '../../cliHost/GetDotenvCli';
import { batchPlugin } from '../../plugins/batch';
import { initPlugin } from '../../plugins/init';

// Shipped CLI rebased on plugin-first host.
const program: Command = new GetDotenvCli('getdotenv')
  .use(batchPlugin())
  .use(initPlugin());

// Guarded config loader flag (default OFF to preserve legacy unless opted-in).
program.option(  '--use-config-loader',
  'enable config loader/overlay path (guarded; default OFF)',
);

// Eagerly resolve context so subcommands inherit overlaid env when enabled.
const useConfigLoader =
  process.argv.includes('--use-config-loader') ||
  process.argv.includes('--use-config-loader=true') ||
  process.argv.includes('--use-config-loader=1');

await (program as unknown as GetDotenvCli).resolveAndLoad(
  useConfigLoader ? { useConfigLoader } : {},
);

await program.parseAsync();
