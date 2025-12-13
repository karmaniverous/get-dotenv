import fs from 'fs-extra';
import { packageDirectory } from 'package-directory';
import { fileURLToPath } from 'url';

/**
 * Read the version from the nearest `package.json` relative to the provided import URL.
 *
 * @param importMetaUrl - The `import.meta.url` of the calling module.
 * @returns The version string or undefined if not found.
 */
export async function readPkgVersion(
  importMetaUrl?: string,
): Promise<string | undefined> {
  if (!importMetaUrl) return undefined;
  try {
    const fromUrl = fileURLToPath(importMetaUrl);
    const pkgDir = await packageDirectory({ cwd: fromUrl });
    if (!pkgDir) return undefined;
    const txt = await fs.readFile(`${pkgDir}/package.json`, 'utf-8');
    const pkg = JSON.parse(txt) as { version?: string };
    return pkg.version ?? undefined;
  } catch {
    // best-effort only
    return undefined;
  }
}
