import type { Command, OptionValues } from '@commander-js/extra-typings';

import type { GetDotenvCliPublic } from '@/src/cliHost';

/**
 * Option values parsed for the `init` command mount.
 *
 * This interface exists to keep TypeDoc output stable and fully documented (avoids inferred `__type.*` warnings).
 *
 * @public
 */
export interface InitCommandOptionValues extends OptionValues {
  /**
   * Config format to scaffold.
   *
   * Expected values: `json`, `yaml`, `js`, `ts`.
   */
  configFormat?: string;
  /**
   * When true, include a private `.local` config variant (JSON/YAML only).
   */
  withLocal?: boolean;
  /**
   * Reserved for future template variants; currently accepted for UX compatibility.
   */
  dynamic?: boolean;
  /**
   * CLI name used for the generated skeleton (and token substitution).
   */
  cliName?: string;
  /**
   * When true, overwrite all colliding files.
   */
  force?: boolean;
  /**
   * When true, skip all collisions without overwriting (CI-friendly).
   */
  yes?: boolean;
}

/**
 * Commander command type returned by {@link attachInitOptions}.
 *
 * @internal
 */
export type InitCommand = Command<
  [string],
  InitCommandOptionValues,
  OptionValues
>;

/**
 * Attach options/arguments for the init plugin mount.
 *
 * @param cli - The `init` command mount.
 *
 * @internal
 */
export function attachInitOptions(cli: GetDotenvCliPublic): InitCommand {
  return (
    cli
      // Description is owned by the plugin index (src/plugins/init/index.ts).
      .argument('[dest]', 'destination path (default: ./)', '.')
      .option(
        '--config-format <format>',
        'config format: json|yaml|js|ts',
        'json',
      )
      .option('--with-local', 'include .local config variant')
      .option('--dynamic', 'include dynamic examples (JS/TS configs)')
      .option('--cli-name <string>', 'CLI name for skeleton and tokens')
      .option('--force', 'overwrite all existing files')
      .option(
        '--yes',
        'skip all collisions (no overwrite)',
      ) as unknown as InitCommand
  );
}
