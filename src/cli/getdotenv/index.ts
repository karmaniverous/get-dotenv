#!/usr/bin/env node

import type { Command } from 'commander';

import { attachRootOptions } from '../../cliCore/attachRootOptions';
import { baseRootOptionDefaults } from '../../cliCore/defaults';
import { resolveCliOptions } from '../../cliCore/resolveCliOptions';
import type { CommandWithOptions } from '../../cliCore/types';
import { GetDotenvCli } from '../../cliHost/GetDotenvCli';
import type { GetDotenvCliOptions } from '../../generateGetDotenvCli/GetDotenvCliOptions';
import type { GetDotenvOptions } from '../../GetDotenvOptions';
import { getDotenvCliOptions2Options } from '../../GetDotenvOptions';
import { batchPlugin } from '../../plugins/batch';
import { initPlugin } from '../../plugins/init';

// Shipped CLI rebased on plugin-first host.
const program: GetDotenvCli = new GetDotenvCli<GetDotenvOptions>('getdotenv')
  .use(batchPlugin())
  .use(initPlugin());

// Attach legacy root flags (shared via cliCore).
attachRootOptions(program, baseRootOptionDefaults);

// Compute context from CLI flags before subcommands execute.
program.hook(
  'preSubcommand',
  async (thisCommand: CommandWithOptions<GetDotenvCliOptions>) => {
    const raw = thisCommand.opts();
    const { merged } = resolveCliOptions<GetDotenvCliOptions>(
      raw,
      baseRootOptionDefaults,
      process.env.getDotenvCliOptions,
    );

    // Persist merged options for nested invocations (batch exec).
    thisCommand.getDotenvCliOptions = merged;

    // Build service options and compute context (always-on config loader path).
    const serviceOptions = getDotenvCliOptions2Options(merged);
    await program.resolveAndLoad(serviceOptions);
  },
);

await program.parseAsync();
