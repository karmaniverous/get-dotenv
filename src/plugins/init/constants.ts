import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { packageDirectory } from 'package-directory';

/**
 * Resolve the absolute path to the shipped templates directory.
 *
 * This must be anchored to the get-dotenv package root, not the current working directory,
 * because init is typically executed from within a consumer project.
 *
 * @remarks
 * Resolution strategy:
 * - Determine the nearest package root relative to the current module (`import.meta.url`).
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
  const fromUrl = fileURLToPath(importMetaUrl);
  const pkgRoot = await packageDirectory({ cwd: fromUrl });
  if (!pkgRoot) {
    throw new Error(
      `Unable to resolve get-dotenv package root from ${fromUrl}.`,
    );
  }
  return path.join(pkgRoot, 'templates');
}
