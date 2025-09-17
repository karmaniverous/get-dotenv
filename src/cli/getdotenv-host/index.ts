#!/usr/bin/env node

import type { Command } from 'commander';

import { attachRootOptions } from '../../cliCore/attachRootOptions';
import { resolveCliOptions } from '../../cliCore/resolveCliOptions';
import type { CommandWithOptions } from '../../cliCore/types';
import { GetDotenvCli } from '../../cliHost/GetDotenvCli';
import type { GetDotenvCliOptions } from '../../generateGetDotenvCli/GetDotenvCliOptions';
import { baseGetDotenvCliOptions } from '../../generateGetDotenvCli/GetDotenvCliOptions';
import type { GetDotenvOptions } from '../../GetDotenvOptions';
import { getDotenvCliOptions2Options } from '../../GetDotenvOptions';
import { batchPlugin } from '../../plugins/batch';

// Demonstration CLI using the plugin-first host with the config loader enabled.
const program: Command = new (GetDotenvCli as new (
  alias?: string,
) => GetDotenvCli<GetDotenvOptions>)('getdotenv-host').use(batchPlugin());

// Attach legacy root flags for demo parity.
attachRootOptions<GetDotenvCliOptions>(program, baseGetDotenvCliOptions);

// Compute context from CLI flags before subcommands execute.
program.hook(
  'preSubcommand',
  async (thisCommand: CommandWithOptions<GetDotenvCliOptions>) => {
    const raw = thisCommand.opts();
    const { merged } = resolveCliOptions<GetDotenvCliOptions>(
      raw,
      baseGetDotenvCliOptions,
      process.env.getDotenvCliOptions,
    );

    // Persist merged options for nested invocations (batch exec).
    thisCommand.getDotenvCliOptions = merged;

    // Build service options and compute context (always-on config loader path).
    const serviceOptions = getDotenvCliOptions2Options(merged);
    await (program as unknown as GetDotenvCli<GetDotenvOptions>).resolveAndLoad(
      serviceOptions,
    );
  },
);

await program.parseAsync();
