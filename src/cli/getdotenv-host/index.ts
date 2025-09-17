#!/usr/bin/env node

import type { Command } from 'commander';

import { attachRootOptions } from '../../cliCore/attachRootOptions';
import { baseRootOptionDefaults } from '../../cliCore/defaults';
import { resolveCliOptions } from '../../cliCore/resolveCliOptions';
import { GetDotenvCli } from '../../cliHost/GetDotenvCli';
import { getDotenvCliOptions2Options } from '../../GetDotenvOptions';
import { batchPlugin } from '../../plugins/batch';

// Demonstration CLI using the plugin-first host with the config loader enabled.
const program: Command = new GetDotenvCli('getdotenv-host').use(batchPlugin());

// Attach legacy root flags for demo parity.
attachRootOptions(program, baseRootOptionDefaults);

// Compute context from CLI flags before subcommands execute.
program.hook('preSubcommand', async (thisCommand: Command) => {
  const raw = thisCommand.opts();
  const { merged } = resolveCliOptions(
    raw,
    baseRootOptionDefaults,
    process.env.getDotenvCliOptions,
  );

  // Persist merged options for nested invocations (batch exec).
  (
    thisCommand as unknown as { getDotenvCliOptions: Record<string, unknown> }
  ).getDotenvCliOptions = merged;

  // Build service options and compute context (always-on config loader path).
  const serviceOptions = getDotenvCliOptions2Options(merged);
  await (program as unknown as GetDotenvCli).resolveAndLoad(serviceOptions);
});

await program.parseAsync();
