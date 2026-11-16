/**
 * The one package-root lookup for a module URL.
 *
 * A module's package root is the nearest directory at or above the module
 * that holds a `package.json`. A host CLI's root (Decision 23) supplies its
 * packaged config layer, its version and its description; get-dotenv's own
 * root holds the `init` templates. Every lookup from an `import.meta.url`
 * goes through {@link resolvePackageRoot}.
 *
 * Internal: not re-exported from the `util` barrel.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import fs from 'fs-extra';
import { packageDirectory } from 'package-directory';

/**
 * Resolve the package root of the module at `importMetaUrl`.
 *
 * @param importMetaUrl - The module's `import.meta.url` (a `file:` URL).
 * @returns The absolute package root, or `undefined` when no `package.json`
 *   is found above the module.
 */
export const resolvePackageRoot = async (
  importMetaUrl: string,
): Promise<string | undefined> =>
  packageDirectory({ cwd: fileURLToPath(importMetaUrl) });

/** What a host CLI takes from its package (Decision 23). */
export interface HostPackage {
  /** The package root. */
  root: string;
  /** `package.json` `version`, when it is a string. */
  version?: string;
  /** `package.json` `description`, when it is a string. */
  description?: string;
}

/**
 * Read the host package of the module at `importMetaUrl`: its root and the
 * `version` and `description` of its `package.json`. Best effort: a missing
 * or unreadable `package.json` gives `undefined` or a root with no fields.
 *
 * @param importMetaUrl - The module's `import.meta.url`.
 * @returns The host package, or `undefined` when there is no package root.
 */
export const readHostPackage = async (
  importMetaUrl: string | undefined,
): Promise<HostPackage | undefined> => {
  if (!importMetaUrl) return undefined;
  try {
    const root = await resolvePackageRoot(importMetaUrl);
    if (!root) return undefined;
    const pkg = JSON.parse(
      await fs.readFile(path.join(root, 'package.json'), 'utf-8'),
    ) as { version?: unknown; description?: unknown };
    return {
      root,
      ...(typeof pkg.version === 'string' ? { version: pkg.version } : {}),
      ...(typeof pkg.description === 'string'
        ? { description: pkg.description }
        : {}),
    };
  } catch {
    // best effort only
    return undefined;
  }
};
