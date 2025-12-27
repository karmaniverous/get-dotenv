import type { GetDotenvCliPublic } from '@/src/cliHost';

/**
 * Attach options/arguments for the cmd plugin mount.
 *
 * Note: the plugin description is owned by `src/plugins/cmd/index.ts` and must
 * not be set here.
 *
 * @param cli - The `cmd` command mount.
 * @returns The same `cli` instance for chaining.
 *
 * @internal
 */
/** @hidden */
export function attachCmdOptions(cli: GetDotenvCliPublic) {
  return cli
    .enablePositionalOptions()
    .passThroughOptions()
    .argument('[command...]');
}

/** @internal */
export type CmdCommand = ReturnType<typeof attachCmdOptions>;

/**
 * Command type returned by {@link attachCmdOptions}.
 *
 * @internal
 */