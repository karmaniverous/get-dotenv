import { createHash } from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import url from 'url';

import { externalizeInstalledPackages } from './externalizeInstalledPackages';

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

/** Compiled builds kept per cache directory and file name by default. */
const DEFAULT_CACHE_KEEP = 2;

/**
 * Resolve `GETDOTENV_CACHE_KEEP`: an integer, minimum 1. Anything that isn't an
 * integer (`abc`, an empty string, `2.5`) falls back to the default, 2.
 */
const resolveCacheKeep = (raw: string | undefined): number => {
  const n = raw !== undefined && raw.trim() !== '' ? Number(raw) : Number.NaN;
  return Number.isInteger(n) ? Math.max(1, n) : DEFAULT_CACHE_KEEP;
};

/**
 * Remove older compiled cache files for a given source base name, keeping
 * at most `keep` most-recent files (`GETDOTENV_CACHE_KEEP`, default 2).
 * Errors are ignored by design.
 *
 * @internal
 */
export const cleanupOldCacheFiles = async (
  cacheDir: string,
  baseName: string,
  keep = resolveCacheKeep(process.env.GETDOTENV_CACHE_KEEP),
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
 * Load a module default export from a JS/TS file with robust fallbacks.
 *
 * Behavior by extension:
 *
 * - `.js`/`.mjs`/`.cjs`: direct dynamic import.
 * - `.ts`/`.mts`/`.cts`/`.tsx`:
 *   - try direct dynamic import (when a TS loader is active),
 *   - else compile via `esbuild` to a cached `.mjs` file and import (the
 *     module's own files are bundled; Node built-ins and installed packages
 *     stay imports, which Node resolves from the source file),
 *   - else fallback to `typescript.transpileModule` for simple modules.
 *
 * When every attempt fails, the thrown error's `cause` is an `AggregateError`
 * holding the esbuild and TypeScript failures, in that order.
 *
 * Compiled builds are cached under `.tsbuild/<cacheDirName>/`, keeping the
 * newest `GETDOTENV_CACHE_KEEP` builds per file name (default 2, minimum 1; a
 * value that isn't an integer falls back to 2).
 *
 * @typeParam T - Type of the expected default export.
 * @param absPath - Absolute path to the source file.
 * @param cacheDirName - Cache subfolder under `.tsbuild/`.
 * @returns A `Promise\<T | undefined\>` resolving to the default export (if any).
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
  let esbuildError: unknown;
  try {
    const esbuild = (await import('esbuild')) as unknown as {
      build: (opts: Record<string, unknown>) => Promise<unknown>;
    };
    await esbuild.build({
      entryPoints: [absPath],
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node20',
      outfile: cacheFile,
      sourcemap: false,
      logLevel: 'silent',
      conditions: [],
      plugins: [externalizeInstalledPackages()],
    });
    const result = await importDefault<T>(
      url.pathToFileURL(cacheFile).toString(),
    );
    // Best-effort: trim older cache files for this source.
    await cleanupOldCacheFiles(cacheDir, path.basename(absPath));
    return result;
  } catch (err) {
    esbuildError = err; // fall through to TS transpile
  }

  // TypeScript transpile fallback
  let tsError: unknown;
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
  } catch (err) {
    tsError = err;
  }

  // Caller decides final error wording; keep what each loader reported.
  throw new Error(
    `Unable to load JS/TS module: ${absPath}. Install 'esbuild' or ensure a TS loader.`,
    {
      cause: new AggregateError(
        [esbuildError, tsError],
        'esbuild, then the TypeScript transpile fallback, failed',
      ),
    },
  );
};
