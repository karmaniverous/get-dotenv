import type { OptionValues } from '@commander-js/extra-typings';

import type { GetDotenvOptions } from '@/src/core';

import type { GetDotenvCliPublic, PluginChildEntry } from './contracts';
import { effectiveNs, joinRealizedPath } from './paths';

// Existential CLI public alias for installer-only use. Keeps recursive Commander
// generics contained and avoids leaking specific Args/Opts/Global types.
type AnyCliPublic<TOptions extends GetDotenvOptions> = GetDotenvCliPublic<
  TOptions,
  unknown[],
  OptionValues,
  OptionValues
>;

// Existential plugin entry (plugin + optional namespace override).
type AnyEntry<TOptions extends GetDotenvOptions> = PluginChildEntry<
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
 * @param under - The parent's realized path for the message; empty means the root.
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
  entry: AnyEntry<TOptions>,
  parentPath: string,
): void | Promise<void> {
  const { plugin } = entry;
  const ns = effectiveNs(entry);
  const path = joinRealizedPath(parentPath, ns);

  // Create the mount at the effective namespace and run setup
  const mount = parentCli.ns(ns, plugin.nsOptions);
  const setupRet = plugin.setup(mount);
  const pending: Promise<void>[] = [];
  if (isPromise(setupRet)) pending.push(setupRet.then(() => undefined));

  // Enforce sibling uniqueness before creating children
  assertUniqueNamespaces(plugin.children, path);
  // Install children (pre-order), synchronously when possible
  for (const child of plugin.children) {
    const childRet = runInstall(
      mount as unknown as AnyCliPublic<TOptions>,
      child,
      path,
    );
    if (isPromise(childRet)) pending.push(childRet);
  }
  if (pending.length > 0) return Promise.all(pending).then(() => undefined);
  return;
}

/**
 * Install top-level plugin entries and their children (pre-order setup
 * phase), one top-level entry at a time. Each plugin is mounted at its
 * effective namespace (override \> default). Sibling namespaces are checked
 * for uniqueness at every level, the root included, before any mount at that
 * level is created.
 *
 * @param cli - The root host.
 * @param entries - The root's registered plugin entries.
 */
export async function setupPluginTree<
  TOptions extends GetDotenvOptions,
  TArgs extends unknown[] = [],
  TOpts extends OptionValues = {},
  TGlobal extends OptionValues = {},
>(
  cli: GetDotenvCliPublic<TOptions, TArgs, TOpts, TGlobal>,
  entries: ReadonlyArray<PluginChildEntry<TOptions, TArgs, TOpts, TGlobal>>,
): Promise<void> {
  assertUniqueNamespaces(entries, '');
  for (const entry of entries) {
    await runInstall(
      cli as unknown as AnyCliPublic<TOptions>,
      entry as unknown as AnyEntry<TOptions>,
      '',
    );
  }
}
