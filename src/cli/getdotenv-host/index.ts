#!/usr/bin/env node

import type { Command } from 'commander';

import { GetDotenvCli } from '../../cliHost/GetDotenvCli';
import { batchPlugin } from '../../plugins/batch';

// Demonstration CLI using the plugin-first host with the config loader enabled.
const program: Command = new GetDotenvCli('getdotenv-host').use(batchPlugin());

// Build context eagerly so batch subcommands inherit the overlayed env.
await (program as unknown as GetDotenvCli).resolveAndLoad({
  useConfigLoader: true,
});
await program.parseAsync();
