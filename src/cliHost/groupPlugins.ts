import type { GetDotenvOptions } from '@/src/core';

import type {
  GetDotenvCliPublic,
  PluginWithInstanceHelpers,
} from './contracts';
import { definePlugin } from './definePlugin';

/**
 * Options for {@link groupPlugins}.
 *
 * This helper creates a “namespace-only” parent plugin (a command that exists only
 * to group child plugins under a shared prefix, like `tooling getdotenv init`).
 *
 * The returned plugin is composable: call `.use(childPlugin)` to mount children.
 *
 * @typeParam TOptions - The host option bag type.
 *
 * @public
 */
export interface GroupPluginsOptions<
  TOptions extends GetDotenvOptions = GetDotenvOptions,
> {
  /**
   * Namespace for the grouping command (the command name used in the CLI).
   */
  ns: string;
  /**
   * Long-form description shown when rendering help for the group command.
   */
  description?: string;
  /**
   * Short summary shown in the parent command’s subcommand list.
   */
  summary?: string;
  /**
   * Help group heading for this command when listed in the parent’s help output.
   */
  helpGroup?: string;
  /**
   * Optional aliases for the group command (e.g., `['gd']`).
   */
  aliases?: string[];
  /**
   * Optional hook to customize the group command mount (e.g., attach a note or
   * a small set of options). Avoid adding actions here; keep this a group.
   */
  configure?: (cli: GetDotenvCliPublic<TOptions>) => void | Promise<void>;
}

/**
 * Create a namespace-only parent plugin (a group command) for composing plugins
 * under a shared prefix.
 *
 * This is a convenience wrapper around {@link definePlugin} that performs no
 * action by default and exists only for command organization.
 *
 * @example
 * ```ts
 * program.use(
 *   groupPlugins({
 *     ns: 'getdotenv',
 *     description: 'getdotenv utility functions',
 *     aliases: ['gd'],
 *   }).use(initPlugin()),
 * );
 * ```
 *
 * @typeParam TOptions - The host option bag type.
 * @param options - Group plugin options.
 * @returns A plugin instance that can `.use(...)` child plugins.
 *
 * @public
 */
export function groupPlugins<
  TOptions extends GetDotenvOptions = GetDotenvOptions,
>(
  options: GroupPluginsOptions<TOptions>,
): PluginWithInstanceHelpers<TOptions, {}> {
  const ns =
    typeof options.ns === 'string' && options.ns.trim().length > 0
      ? options.ns.trim()
      : '';
  if (!ns)
    throw new Error('groupPlugins: options.ns must be a non-empty string.');

  return definePlugin<TOptions>({
    ns,
    async setup(cli) {
      if (typeof options.description === 'string')
        cli.description(options.description);
      if (typeof options.summary === 'string') cli.summary(options.summary);
      if (typeof options.helpGroup === 'string')
        cli.helpGroup(options.helpGroup);
      if (Array.isArray(options.aliases) && options.aliases.length > 0) {
        cli.aliases(options.aliases);
      }
      if (typeof options.configure === 'function') {
        await options.configure(cli);
      }
      return undefined;
    },
  });
}
