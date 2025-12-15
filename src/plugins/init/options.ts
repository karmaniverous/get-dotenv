import type { GetDotenvCliPublic } from '@/src/cliHost';

/**
 * Attach options/arguments for the init plugin mount.
 *
 * @param cli - The `init` command mount.
 *
 * @internal
 */
export function attachInitOptions(cli: GetDotenvCliPublic) {
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
      .option('--yes', 'skip all collisions (no overwrite)')
  );
}

/** @internal */
export type InitCommand = ReturnType<typeof attachInitOptions>;
