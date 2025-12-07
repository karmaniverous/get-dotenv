/** src/cliHost/version.ts
 * Read the nearest package.json version relative to an import.meta.url.
 */
import fs from 'fs-extra';
import { packageDirectory } from 'package-directory';
import { fileURLToPath } from 'url';

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
