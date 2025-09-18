import type { Command as CommanderCommand } from 'commander';

import { GetDotenvCli } from '../cliHost/GetDotenvCli';
import type { GetDotenvCliOptions } from '../generateGetDotenvCli/GetDotenvCliOptions';
import { getDotenvCliOptions2Options } from '../GetDotenvOptions';
import { attachRootOptions } from './attachRootOptions';
import { baseRootOptionDefaults } from './defaults';
import { resolveCliOptions } from './resolveCliOptions';
import type { CommandWithOptions, RootOptionsShape } from './types';
/**
 * Adapter-layer augmentation: add chainable helpers to GetDotenvCli without
 * coupling the core host to cliCore. Importing this module has side effects:
 * it extends the prototype and merges types for consumers.
 */
declare module '../cliHost/GetDotenvCli' {
  interface GetDotenvCli {
    /**
     * Attach legacy root flags to this CLI instance. Defaults come from
     * baseRootOptionDefaults when none are provided.     */
    attachRootOptions(defaults?: Partial<RootOptionsShape>): this;
    /**
     * Install a preSubcommand hook that merges CLI flags (including parent
     * round-trip) and resolves the dotenv context before executing actions.
     * Defaults come from baseRootOptionDefaults when none are provided.
     */
    passOptions(defaults?: Partial<RootOptionsShape>): this;
  }
}

GetDotenvCli.prototype.attachRootOptions = function (
  this: GetDotenvCli,
  defaults?: Partial<RootOptionsShape>,
) {
  const d = (defaults ?? baseRootOptionDefaults) as Partial<RootOptionsShape>;
  attachRootOptions(this as unknown as CommanderCommand, d);
  return this;
};
GetDotenvCli.prototype.passOptions = function (
  this: GetDotenvCli,
  defaults?: Partial<RootOptionsShape>,
) {
  const d = (defaults ?? baseRootOptionDefaults) as Partial<RootOptionsShape>;
  this.hook(
    'preSubcommand',
    async (thisCommand: CommandWithOptions<GetDotenvCliOptions>) => {
      const raw = thisCommand.opts();
      const { merged } = resolveCliOptions<GetDotenvCliOptions>(
        raw as unknown,
        d as Partial<GetDotenvCliOptions>,
        process.env.getDotenvCliOptions,
      );

      // Persist merged options for nested invocations (batch exec).
      thisCommand.getDotenvCliOptions =
        merged as unknown as GetDotenvCliOptions;

      // Build service options and compute context (always-on config loader path).
      const serviceOptions = getDotenvCliOptions2Options(merged);
      await this.resolveAndLoad(serviceOptions);
    },
  );
  // Also handle root-level flows (no subcommand) so option-aliases can run
  // with the same merged options and context without duplicating logic.
  this.hook(
    'preAction',
    async (thisCommand: CommandWithOptions<GetDotenvCliOptions>) => {
      const raw = thisCommand.opts();
      const { merged } = resolveCliOptions<GetDotenvCliOptions>(
        raw as unknown,
        d as Partial<GetDotenvCliOptions>,
        process.env.getDotenvCliOptions,
      );
      thisCommand.getDotenvCliOptions =
        merged as unknown as GetDotenvCliOptions;
      // Avoid duplicate heavy work if a context is already present.
      if (!this.getCtx()) {
        const serviceOptions = getDotenvCliOptions2Options(merged);
        await this.resolveAndLoad(serviceOptions);
      }
    },
  );
  return this;
};
