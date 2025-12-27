import type { GetDotenvCliPublic } from '@/src/cliHost';

import type { BatchPlugin } from '.';
import type { BatchPluginConfig } from './types';

/**
 * Attach options/arguments for the batch plugin mount.
 *
 * Note: the plugin description is owned by `src/plugins/batch/index.ts` and
 * must not be set here.
 *
 * @param plugin - Batch plugin instance (for dynamic option descriptions).
 * @param cli - The `batch` command mount.
 * @returns The same `cli` instance for chaining.
 *
 * @internal
 */
/** @hidden */
export function attachBatchOptions(
  plugin: BatchPlugin,
  cli: GetDotenvCliPublic,
) {
  const GROUP = `plugin:${cli.name()}`;

  return (
    cli
      .enablePositionalOptions()
      .passThroughOptions()
      // Dynamic help: show effective defaults from the merged/interpolated plugin config slice.
      .addOption(
        (() => {
          const opt = plugin.createPluginDynamicOption(
            cli,
            '-p, --pkg-cwd',
            (_bag, cfg: Readonly<BatchPluginConfig>) =>
              `use nearest package directory as current working directory${cfg.pkgCwd ? ' (default)' : ''}`,
          );
          cli.setOptionGroup(opt, GROUP);
          return opt;
        })(),
      )
      .addOption(
        (() => {
          const opt = plugin.createPluginDynamicOption(
            cli,
            '-r, --root-path <string>',
            (_bag, cfg: Readonly<BatchPluginConfig>) =>
              `path to batch root directory from current working directory (default: ${JSON.stringify(
                cfg.rootPath || './',
              )})`,
          );
          cli.setOptionGroup(opt, GROUP);
          return opt;
        })(),
      )
      .addOption(
        (() => {
          const opt = plugin.createPluginDynamicOption(
            cli,
            '-g, --globs <string>',
            (_bag, cfg: Readonly<BatchPluginConfig>) =>
              `space-delimited globs from root path (default: ${JSON.stringify(
                cfg.globs || '*',
              )})`,
          );
          cli.setOptionGroup(opt, GROUP);
          return opt;
        })(),
      )
      .option(
        '-c, --command <string>',
        'command executed according to the base shell resolution',
      )
      .option(
        '-l, --list',
        'list working directories without executing command',
      )
      .option(
        '-e, --ignore-errors',
        'ignore errors and continue with next path',
      )
      .argument('[command...]')
  );
}
