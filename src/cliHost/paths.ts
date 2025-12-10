/** src/cliHost/paths.ts
 * Helpers for realized mount paths and plugin tree flattening.
 */
import type { OptionValues } from '@commander-js/extra-typings';

import type { GetDotenvOptions } from '@/src/core';

import type { GetDotenvCliPlugin, GetDotenvCliPublic } from './contracts';

/** Compute realized path for a mounted command (leaf-up to root, excluding root alias). */
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

/** Flatten a plugin tree into [\{ plugin, path \}] using ns chain pre-order. */
export function flattenPluginTreeByPath<
  TOptions extends GetDotenvOptions = GetDotenvOptions,
  TArgs extends unknown[] = [],
  TOpts extends OptionValues = {},
  TGlobal extends OptionValues = {},
>(
  plugins: GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>[],
  prefix?: string,
): Array<{
  plugin: GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>;
  path: string;
}> {
  const out: Array<{
    plugin: GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>;
    path: string;
  }> = [];
  for (const p of plugins) {
    const here = prefix && prefix.length > 0 ? `${prefix}/${p.ns}` : p.ns;
    out.push({ plugin: p, path: here });
    if (Array.isArray(p.children) && p.children.length > 0) {
      out.push(
        ...flattenPluginTreeByPath(
          p.children.map((c) => c.plugin),
          here,
        ),
      );
    }
  }
  return out;
}
