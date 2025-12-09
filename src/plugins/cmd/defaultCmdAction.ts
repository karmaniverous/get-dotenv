import type { CommandUnknownOpts } from '@commander-js/extra-typings';

import type { GetDotenvCliPublic } from '@/src/cliHost/definePlugin';
import { readMergedOptions } from '@/src/cliHost/readMergedOptions';

import { runCmdWithContext } from './runner';

/**
 * Attach the default "cmd" subcommand action (unified name).
 * Mirrors the prior inline implementation in cmd/index.ts.
 */
export const attachDefaultCmdAction = (
  cli: GetDotenvCliPublic,
  cmd: CommandUnknownOpts,
  aliasKey?: string,
) => {
  cmd
    .enablePositionalOptions()
    .passThroughOptions()
    .action(async function (...allArgs: unknown[]) {
      // Commander passes: [...positionals, options, thisCommand]
      const thisCommand = allArgs[allArgs.length - 1] as CommandUnknownOpts;
      const commandParts = allArgs[0];
      const args = Array.isArray(commandParts)
        ? (commandParts as unknown[]).map(String)
        : [];
      // No-op when invoked as the default command with no args.
      if (args.length === 0) return;

      const merged = readMergedOptions(thisCommand);
      const parent = thisCommand.parent;
      if (!parent) throw new Error('parent command not found');

      // Conflict detection: if an alias option is present on parent, do not
      // also accept positional cmd args.
      if (aliasKey) {
        const p = parent as CommandUnknownOpts & {
          optsWithGlobals?: () => unknown;
          opts?: () => unknown;
        };
        const pv =
          typeof p.optsWithGlobals === 'function'
            ? p.optsWithGlobals()
            : typeof p.opts === 'function'
              ? p.opts()
              : {};
        const ov = (pv as Record<string, unknown>)[aliasKey];
        if (ov !== undefined) {
          merged.logger.error(
            `--${aliasKey} option conflicts with cmd subcommand.`,
          );
          process.exit(0);
        }
      }

      await runCmdWithContext(cli, merged, args, { origin: 'subcommand' });
    });
};
