/** src/cliHost/registerPlugin.ts
 * Install a plugin and its children (setup phase), pre-order.
 */
import type { OptionValues } from '@commander-js/extra-typings';

import type { GetDotenvOptions } from '@/src/GetDotenvOptions';

import type { GetDotenvCliPublic } from './definePlugin';
import type { GetDotenvCliPlugin } from './definePlugin';

// Existential CLI public alias for installer-only use. Keeps recursive Commander
// generics contained and avoids leaking specific Args/Opts/Global types.
type AnyCliPublic<TOptions extends GetDotenvOptions> = GetDotenvCliPublic<
  TOptions,
  unknown[],
  OptionValues,
  OptionValues
>;

/**
 * Determine the effective namespace for a child plugin (override \> default).
 */
const effectiveNs = <TOptions extends GetDotenvOptions>(child: {
  plugin: GetDotenvCliPlugin<TOptions, any, any, any>;
  override: { ns?: string } | undefined;
}): string => {
  const o = child.override;
  return (
    o && typeof o.ns === 'string' && o.ns.length > 0 ? o.ns : child.plugin.ns
  ).trim();
};

export function setupPluginTree<
  TOptions extends GetDotenvOptions,
  TArgs extends unknown[] = [],
  TOpts extends OptionValues = {},
  TGlobal extends OptionValues = {},
>(
  cli: GetDotenvCliPublic<TOptions, TArgs, TOpts, TGlobal>,
  plugin: GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>,
): Promise<void> {
  const installChildren = async (
    parentCli: AnyCliPublic<TOptions>,
    parent: GetDotenvCliPlugin<TOptions, TArgs, TOpts, TGlobal>,
  ) => {
    // Enforce sibling uniqueness under this parent.
    const names = new Set<string>();
    for (const entry of parent.children) {
      const ns = effectiveNs(entry);
      if (names.has(ns)) {
        const under = parentCli.name();
        throw new Error(
          `Duplicate namespace '${ns}' under '${under || 'root'}'. Override via .use(plugin, { ns: '...' }).`,
        );
      }
      names.add(ns);
    }
    // Install in order
    for (const entry of parent.children) {
      const ns = effectiveNs(entry);
      const mount = parentCli.ns(ns);
      await entry.plugin.setup(
        mount as unknown as GetDotenvCliPublic<
          TOptions,
          unknown[],
          OptionValues,
          OptionValues
        >,
      );
      await installChildren(
        mount as unknown as AnyCliPublic<TOptions>,
        entry.plugin,
      );
    }
  };

  // Create mount for current plugin under cli, run setup, then children.
  // For the root entry, cli is the host/root and plugin mounts under it.
  const mount = cli.ns(plugin.ns);
  return (async () => {
    await plugin.setup(
      mount as unknown as GetDotenvCliPublic<
        TOptions,
        unknown[],
        OptionValues,
        OptionValues
      >,
    );
    await installChildren(mount as unknown as AnyCliPublic<TOptions>, plugin);
  })();
}
