import type { GetDotenvCliPublic } from '@/src/cliHost';

/**
 * Attach options/arguments for the `aws whoami` plugin mount.
 *
 * This subcommand currently takes no flags/args; this module exists to keep the
 * wiring layout consistent across shipped plugins (options vs actions).
 *
 * Note: the plugin description is owned by `src/plugins/aws/whoami/index.ts` and
 * must not be set here.
 *
 * @param cli - The `whoami` command mount under `aws`.
 * @returns The same `cli` instance for chaining.
 *
 * @internal
 */
/** @hidden */
export function attachWhoamiOptions(cli: GetDotenvCliPublic) {
  return cli;
}

/**
 * Command type returned by `attachWhoamiOptions`.
 *
 * @internal
 */
export type WhoamiCommand = ReturnType<typeof attachWhoamiOptions>;
