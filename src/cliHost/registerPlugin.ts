import type { OptionValues } from '@commander-js/extra-typings';

import type { GetDotenvOptions } from '@/src/core';

import type { GetDotenvCliPlugin, GetDotenvCliPublic } from './contracts';
import { effectiveNs } from './paths';

// Existential CLI public alias for installer-only use. Keeps recursive Commander
// generics contained and avoids leaking specific Args/Opts/Global types.
type AnyCliPublic<TOptions extends GetDotenvOptions> = GetDotenvCliPublic<
  TOptions,
  unknown[],
  OptionValues,
  OptionValues
>;

/**
 * Throw the guided duplicate-namespace error when two sibling entries share an
 * effective namespace (override \> default).
 *
 * @param entries - Sibling plugin entries mounted under the same parent.
 * @param under - The parent's name for the message; empty means the root.
 */
export const assertUniqueNamespaces = (
  entries: ReadonlyArray<Parameters<typeof effectiveNs>[0]>,
  under: string,
): void => {
  const seen = new Set<string>();
  for (const entry of entries) {
    const ns = effectiveNs(entry);
    if (seen.has(ns)) {
      throw new Error(
        `Duplicate namespace '${ns}' under '${under || 'root'}'. Override via .use(plugin, { ns: '...' }).`,
      );
    }
    seen.add(ns);
  }
};

const isPromise = (v: unknown): v is Promise<unknown> =>
  !!v && typeof (v as { then?: unknown }).then === 'function';

function runInstall<TOptions extends GetDotenvOptions>(
  parentCli: AnyCliPublic<TOptions>,
  plugin: GetDotenvCliPlugin<TOptions, unknown[], OptionValues, OptionValues>,
): void | Promise<void> {
  // Create mount and run setup
  const mount = parentCli.ns(plugin.ns, plugin.nsOptions);
  const setupRet = plugin.setup(mount);
  const pending: Promise<void>[] = [];
  if (isPromise(setupRet)) pending.push(setupRet.then(() => undefined));

  // Enforce sibling uniqueness before creating children
  assertUniqueNamespaces(plugin.children, mount.name());
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
