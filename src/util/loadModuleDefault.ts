import { createHash } from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import url from 'url';

const importDefault = async <T>(fileUrl: string): Promise<T | undefined> => {
  const mod = (await import(fileUrl)) as { default?: T };
  return mod.default;
};

const cacheHash = (absPath: string, mtimeMs: number) =>
  createHash('sha1')
    .update(absPath)
    .update(String(mtimeMs))
    .digest('hex')
    .slice(0, 12);

/**
 * Remove older compiled cache files for a given source base name, keeping
 * at most `keep` most-recent files. Errors are ignored by design.
 */
const cleanupOldCacheFiles = async (
  cacheDir: string,
  baseName: string,
  keep = Math.max(1, Number.parseInt(process.env.GETDOTENV_CACHE_KEEP ?? '2')),
) => {
  try {
    const entries = await fs.readdir(cacheDir);
    const mine = entries
      .filter((f) => f.startsWith(`${baseName}.`) && f.endsWith('.mjs'))
      .map((f) => path.join(cacheDir, f));
    if (mine.length <= keep) return;
    const stats = await Promise.all(
      mine.map(async (p) => ({ p, mtimeMs: (await fs.stat(p)).mtimeMs })),
    );
    stats.sort((a, b) => b.mtimeMs - a.mtimeMs);
    const toDelete = stats.slice(keep).map((s) => s.p);
    await Promise.all(
      toDelete.map(async (p) => {
        try {
          await fs.remove(p);
        } catch {
          // best-effort cleanup
        }
      }),
    );
  } catch {
    // best-effort cleanup
  }
};

/**
 * Load a module default export from a JS/TS file with robust fallbacks:
 * - .js/.mjs/.cjs: direct import * - .ts/.mts/.cts/.tsx:
 *   1) try direct import (if a TS loader is active),
 *   2) esbuild bundle to a temp ESM file,
 *   3) typescript.transpileModule fallback for simple modules.
 *
 * @param absPath - absolute path to source file
 * @param cacheDirName - cache subfolder under .tsbuild
 */
export const loadModuleDefault = async <T>(
  absPath: string,
  cacheDirName: string,
): Promise<T | undefined> => {
  const ext = path.extname(absPath).toLowerCase();
  const fileUrl = url.pathToFileURL(absPath).toString();

  if (!['.ts', '.mts', '.cts', '.tsx'].includes(ext)) {
    return importDefault<T>(fileUrl);
  }

  // Try direct import first (TS loader active)
  try {
    const dyn = await importDefault<T>(fileUrl);
    if (dyn) return dyn;
  } catch {
    /* fall through */
  }

  const stat = await fs.stat(absPath);
  const hash = cacheHash(absPath, stat.mtimeMs);
  const cacheDir = path.resolve('.tsbuild', cacheDirName);
  await fs.ensureDir(cacheDir);
  const cacheFile = path.join(
    cacheDir,
    `${path.basename(absPath)}.${hash}.mjs`,
  );

  // Try esbuild
  try {
    const esbuild = (await import('esbuild')) as unknown as {
      build: (opts: Record<string, unknown>) => Promise<unknown>;
    };
    await esbuild.build({
      entryPoints: [absPath],
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node22',
      outfile: cacheFile,
      sourcemap: false,
      logLevel: 'silent',
    });
    const result = await importDefault<T>(
      url.pathToFileURL(cacheFile).toString(),
    );
    // Best-effort: trim older cache files for this source.
    await cleanupOldCacheFiles(cacheDir, path.basename(absPath));
    return result;
  } catch {
    /* fall through to TS transpile */
  }

  // TypeScript transpile fallback
  try {
    const ts = (await import('typescript')) as unknown as {
      transpileModule: (
        code: string,
        opts: { compilerOptions: Record<string, unknown> },
      ) => { outputText: string };
    };
    const code = await fs.readFile(absPath, 'utf-8');
    const out = ts.transpileModule(code, {
      compilerOptions: {
        module: 'ESNext',
        target: 'ES2022',
        moduleResolution: 'NodeNext',
      },
    }).outputText;
    await fs.writeFile(cacheFile, out, 'utf-8');
    const result = await importDefault<T>(
      url.pathToFileURL(cacheFile).toString(),
    );
    // Best-effort: trim older cache files for this source.
    await cleanupOldCacheFiles(cacheDir, path.basename(absPath));
    return result;
  } catch {
    // Caller decides final error wording; rethrow for upstream mapping.
    throw new Error(
      `Unable to load JS/TS module: ${absPath}. Install 'esbuild' or ensure a TS loader.`,
    );
  }
};
