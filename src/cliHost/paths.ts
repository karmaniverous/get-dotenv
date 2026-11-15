/** src/cliHost/paths.ts
 * Helpers for realized mount paths and plugin tree flattening.
 */
import type { OptionValues } from '@commander-js/extra-typings';

import type { GetDotenvOptions } from '@/src/core';

import type {
  GetDotenvCliPlugin,
  GetDotenvCliPublic,
  PluginChildEntry,
} from './contracts';

/**
 * Determine the effective namespace for a child plugin (override \> default).
 * Uses a structural parameter so any entry with `.override?.ns` and `.plugin.ns`
 * is accepted regardless of full generic variance.
 */
export const effectiveNs = (child: {
  override?: { ns?: string } | undefined;
  plugin: { ns: string };
}): string => {
  const o = child.override;
  return (
    o && typeof o.ns === 'string' && o.ns.length > 0 ? o.ns : child.plugin.ns
  ).trim();
};

/**
 * Compute the realized path for a command mount (leaf-up to root).
 * Excludes the root application alias.
 *
 * @param cli - The mounted command instance.
 */
export function realizedPathForMount(
  cli: GetDotenvCliPublic<
    GetDotenvOptions,
    unknown[],
    OptionValues,
    OptionValues
  >,
): string {
  const parts: string[] = [];
  let node = cli as unknown as { name: () => string; parent?: unknown };
  while ((node as { parent?: unknown }).parent) {
    parts.push(node.name());
    node = (node as { parent?: unknown }).parent as {
      name: () => string;
      parent?: unknown;
    };
  }
  return parts.reverse().join('/');
}

/**
 * A flattened plugin entry with its realized path.
 *
 * @public
 */
export interface PluginFlattenedEntry<
  TOptions extends GetDotenvOptions = GetDotenvOptions,
  TArgs extends unknown[] = [],
  TOpts extends OptionValues = {},
  TGlobal extends OptionValues = {},
> {
  /** The plugin instance for this entry in the flattened tree. */
  plugin: GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>;
  /**
   * The realized mount path for this plugin (root alias excluded), e.g. "aws/whoami".
   */
  path: string;
}

/**
 * Append a namespace to a realized path (`''` is the root).
 *
 * @param prefix - The parent's realized path; empty for the root.
 * @param ns - The child's effective namespace.
 */
export const joinRealizedPath = (prefix: string, ns: string): string =>
  prefix.length > 0 ? `${prefix}/${ns}` : ns;

/**
 * Flatten a plugin tree into a list of `{ plugin, path }` entries, in
 * pre-order. Each path is the chain of effective namespaces (override \>
 * default) from the root, i.e. the realized mount path.
 *
 * @param entries - Plugin entries (plugin + optional namespace override).
 * @param prefix - Realized path of the parent; empty or omitted for the root.
 */
export function flattenPluginTreeByPath<
  TOptions extends GetDotenvOptions = GetDotenvOptions,
  TArgs extends unknown[] = [],
  TOpts extends OptionValues = {},
  TGlobal extends OptionValues = {},
>(
  entries: ReadonlyArray<PluginChildEntry<TOptions, TArgs, TOpts, TGlobal>>,
  prefix = '',
): Array<PluginFlattenedEntry<TOptions, TArgs, TOpts, TGlobal>> {
  const out: Array<PluginFlattenedEntry<TOptions, TArgs, TOpts, TGlobal>> = [];
  for (const entry of entries) {
    const here = joinRealizedPath(prefix, effectiveNs(entry));
    out.push({ plugin: entry.plugin, path: here });
    out.push(...flattenPluginTreeByPath(entry.plugin.children, here));
  }
  return out;
}
