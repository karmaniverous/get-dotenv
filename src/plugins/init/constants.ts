import path from 'node:path';

import { resolvePackageRoot } from '@/src/util/packageRoot';

/**
 * Resolve the absolute path to the shipped templates directory.
 *
 * This must be anchored to the get-dotenv package root, not the current working directory,
 * because init is typically executed from within a consumer project.
 *
 * @remarks
 * Resolution strategy:
 * - Determine the nearest package root relative to the current module (`import.meta.url`).
 *   This is get-dotenv's own root, never the host CLI's root (Decision 23).
 * - Return `<packageRoot>/templates`.
 *
 * This works for:
 * - local source runs (repo root),
 * - installed package runs (node_modules/\@karmaniverous/get-dotenv),
 * - shared-chunk dist outputs (modules may live under `dist/chunks/`).
 */
export async function resolveTemplatesRoot(
  importMetaUrl: string,
): Promise<string> {
  const pkgRoot = await resolvePackageRoot(importMetaUrl);
  if (!pkgRoot) {
    throw new Error(
      `Unable to resolve get-dotenv package root from ${importMetaUrl}.`,
    );
  }
  return path.join(pkgRoot, 'templates');
}
