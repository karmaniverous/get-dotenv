import type { OptionValues } from '@commander-js/extra-typings';

import type { GetDotenvOptions } from '@/src/core';

import type {
  GetDotenvCliPlugin,
  GetDotenvCliPublic,
  PluginChildEntry,
} from './contracts';

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
const effectiveNs = <TOptions extends GetDotenvOptions>(
  child: PluginChildEntry<TOptions, unknown[], OptionValues, OptionValues>,
): string => {
  const o = child.override;
  return (
    o && typeof o.ns === 'string' && o.ns.length > 0 ? o.ns : child.plugin.ns
  ).trim();
};

const isPromise = (v: unknown): v is Promise<unknown> =>
  !!v && typeof (v as { then?: unknown }).then === 'function';

function runInstall<TOptions extends GetDotenvOptions>(
  parentCli: AnyCliPublic<TOptions>,
  plugin: GetDotenvCliPlugin<TOptions, unknown[], OptionValues, OptionValues>,
): void | Promise<void> {
  // Create mount and run setup
  const mount = parentCli.ns(plugin.ns);
  const setupRet = plugin.setup(
    mount as unknown as GetDotenvCliPublic<
      TOptions,
      unknown[],
      OptionValues,
      OptionValues
    >,
  );
  const pending: Promise<void>[] = [];
  if (isPromise(setupRet)) pending.push(setupRet.then(() => undefined));

  // Enforce sibling uniqueness before creating children
  const names = new Set<string>();
  for (const entry of plugin.children) {
    const ns = effectiveNs(entry);
    if (names.has(ns)) {
      const under = mount.name();
      throw new Error(
        `Duplicate namespace '${ns}' under '${under || 'root'}'. Override via .use(plugin, { ns: '...' }).`,
      );
    }
    names.add(ns);
  }
  // Install children (pre-order), synchronously when possible
  for (const entry of plugin.children) {
    const childRet = runInstall(
      mount as unknown as AnyCliPublic<TOptions>,
      entry.plugin,
    );
    if (isPromise(childRet)) pending.push(childRet);
  }
  if (pending.length > 0) return Promise.all(pending).then(() => undefined);
  return;
}

/**
 * Install a plugin and its children (pre-order setup phase).
 * Enforces sibling namespace uniqueness.
 */
export function setupPluginTree<TOptions extends GetDotenvOptions>(
  cli: GetDotenvCliPublic<TOptions, unknown[], OptionValues, OptionValues>,
  plugin: GetDotenvCliPlugin<TOptions, unknown[], OptionValues, OptionValues>,
): Promise<void> {
  const ret = runInstall(cli as AnyCliPublic<TOptions>, plugin);
  return isPromise(ret) ? ret : Promise.resolve();
}
