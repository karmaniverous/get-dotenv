import { createHash } from 'crypto';
/**
 * getDotenv — Load and expand dotenv variables from a configurable cascade.
 * * Cascade shape (per input path):
 * - Public global: `<token>` (e.g., `.env`)
 * - Public env: `<token>.<env>`
 * - Private global: `<token>.<privateToken>`
 * - Private env: `<token>.<env>.<privateToken>`
 *
 * Files are parsed (if present), then merged in the order above (earlier
 * overwritten by later). Values are then expanded recursively using the
 * dotenv expansion rules implemented by {@link dotenvExpandAll}.
 */
import fs from 'fs-extra';
import { nanoid } from 'nanoid';
import path from 'path';
import url from 'url';

import { dotenvExpandAll } from './dotenvExpand';
import {
  type GetDotenvDynamic,
  type GetDotenvOptions,
  type ProcessEnv,
  resolveGetDotenvOptions,
} from './GetDotenvOptions';
import { readDotenv } from './readDotenv'; /**
 * Asynchronously process dotenv files of the form `.env[.<ENV>][.<PRIVATE_TOKEN>]`
 *
 * @internal Try to import a module by file URL; returns default export when present.
 */
const importDefault = async <T>(fileUrl: string): Promise<T | undefined> => {
  const mod = (await import(fileUrl)) as { default?: T };
  return mod.default;
};

/**
 * @internal Compute a short hash from path + mtime for cache filenames.
 */
const cacheHash = (absPath: string, mtimeMs: number) =>
  createHash('sha1')
    .update(absPath)
    .update(String(mtimeMs))
    .digest('hex')
    .slice(0, 12);

/**
 * @internal Load a dynamic module from path. Supports .js/.mjs/.ts/.tsx:
 * - .js/.mjs: direct import
 * - .ts/.tsx: try direct import (in case a TS loader is active), otherwise:
 *   - esbuild (if present): bundle to a temp ESM file and import it
 *   - fallback: typescript.transpileModule (single-file), then import temp file
 */
const loadDynamicFromPath = async (
  absPath: string,
): Promise<GetDotenvDynamic | undefined> => {
  if (!(await fs.exists(absPath))) return undefined;

  const ext = path.extname(absPath).toLowerCase();
  const fileUrl = url.pathToFileURL(absPath).toString();
  if (ext !== '.ts' && ext !== '.tsx') {
    return importDefault<GetDotenvDynamic>(fileUrl);
  }

  // Try direct import (in case user started Node with a TS loader).
  try {
    const dyn = await importDefault<GetDotenvDynamic>(fileUrl);
    if (dyn) return dyn;
  } catch {
    // ignore; fall through to compile
  }

  const stat = await fs.stat(absPath);
  const hash = cacheHash(absPath, stat.mtimeMs);
  const cacheDir = path.resolve('.tsbuild', 'getdotenv-dynamic');
  const cacheFile = path.join(
    cacheDir,
    `${path.basename(absPath)}.${hash}.mjs`,
  );

  // Try esbuild first
  try {
    const esbuild = (await import('esbuild')) as unknown as {
      build: (opts: Record<string, unknown>) => Promise<unknown>;
    };
    await fs.ensureDir(cacheDir);
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
    return await importDefault<GetDotenvDynamic>(
      url.pathToFileURL(cacheFile).toString(),
    );
  } catch {
    // no esbuild; fall back to TS transpile for simple modules
  }
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
    });
    await fs.ensureDir(cacheDir);
    await fs.writeFile(cacheFile, out.outputText, 'utf-8');
    return await importDefault<GetDotenvDynamic>(
      url.pathToFileURL(cacheFile).toString(),
    );
  } catch {
    throw new Error(
      `Unable to load dynamic TypeScript file: ${absPath}. ` +
        `Install 'esbuild' (recommended) or precompile to JS and point dynamicPath at it.`,
    );
  }
};

/**
 * Asynchronously process dotenv files of the form `.env[.<ENV>][.<PRIVATE_TOKEN>]`
 *
 * @param options - `GetDotenvOptions` object
 * @returns The combined parsed dotenv object.
 * * @example Load from the project root with default tokens
 * ```ts
 * const vars = await getDotenv();
 * console.log(vars.MY_SETTING);
 * ```
 *
 * @example Load from multiple paths and a specific environment
 * ```ts
 * const vars = await getDotenv({
 *   env: 'dev',
 *   dotenvToken: '.testenv',
 *   privateToken: 'secret',
 *   paths: ['./', './packages/app'],
 * });
 * ```
 *
 * @example Use dynamic variables
 * ```ts
 * // .env.js default-exports: { DYNAMIC: ({ PREV }) => `${PREV}-suffix` }
 * const vars = await getDotenv({ dynamicPath: '.env.js' });
 * ```
 *
 * @remarks
 * - When {@link GetDotenvOptions.loadProcess} is true, the resulting variables are merged
 *   into `process.env` as a side effect.
 * - When {@link GetDotenvOptions.outputPath} is provided, a consolidated dotenv file is written.
 *   The path is resolved after expansion, so it may reference previously loaded vars.
 *
 * @throws Error when a dynamic module is present but cannot be imported.
 * @throws Error when an output path was requested but could not be resolved.
 */
export const getDotenv = async (
  options: Partial<GetDotenvOptions> = {},
): Promise<ProcessEnv> => {
  // Apply defaults.
  const {
    defaultEnv,
    dotenvToken = '.env',
    dynamicPath,
    env,
    excludeDynamic = false,
    excludeEnv = false,
    excludeGlobal = false,
    excludePrivate = false,
    excludePublic = false,
    loadProcess = false,
    log = false,
    logger = console,
    outputPath,
    paths = [],
    privateToken = 'local',
    vars = {},
  } = await resolveGetDotenvOptions(options);

  // Read .env files.
  const loaded = paths.length
    ? await paths.reduce<Promise<ProcessEnv>>(async (e, p) => {
        const publicGlobal =
          excludePublic || excludeGlobal
            ? Promise.resolve({})
            : readDotenv(path.resolve(p, dotenvToken));

        const publicEnv =
          excludePublic || excludeEnv || (!env && !defaultEnv)
            ? Promise.resolve({})
            : readDotenv(
                path.resolve(p, `${dotenvToken}.${env ?? defaultEnv ?? ''}`),
              );

        const privateGlobal =
          excludePrivate || excludeGlobal
            ? Promise.resolve({})
            : readDotenv(path.resolve(p, `${dotenvToken}.${privateToken}`));

        const privateEnv =
          excludePrivate || excludeEnv || (!env && !defaultEnv)
            ? Promise.resolve({})
            : readDotenv(
                path.resolve(
                  p,
                  `${dotenvToken}.${env ?? defaultEnv ?? ''}.${privateToken}`,
                ),
              );

        const [
          eResolved,
          publicGlobalResolved,
          publicEnvResolved,
          privateGlobalResolved,
          privateEnvResolved,
        ] = await Promise.all([
          e,
          publicGlobal,
          publicEnv,
          privateGlobal,
          privateEnv,
        ]);

        return {
          ...eResolved,
          ...publicGlobalResolved,
          ...publicEnvResolved,
          ...privateGlobalResolved,
          ...privateEnvResolved,
        };
      }, Promise.resolve({}))
    : {};

  const outputKey = nanoid();

  const dotenv = dotenvExpandAll(
    {
      ...loaded,
      ...vars,
      ...(outputPath ? { [outputKey]: outputPath } : {}),
    },
    { progressive: true },
  );

  // Process dynamic variables. Programmatic option takes precedence over path.
  if (!excludeDynamic) {
    let dynamic: GetDotenvDynamic | undefined = undefined;
    if (options.dynamic && Object.keys(options.dynamic).length > 0) {
      dynamic = options.dynamic;
    } else if (dynamicPath) {
      const absDynamicPath = path.resolve(dynamicPath);
      dynamic = await loadDynamicFromPath(absDynamicPath);
    }
    if (dynamic) {
      try {
        for (const key in dynamic)
          Object.assign(dotenv, {
            [key]:
              typeof dynamic[key] === 'function'
                ? dynamic[key](dotenv, env ?? defaultEnv)
                : dynamic[key],
          });
      } catch {
        throw new Error(`Unable to evaluate dynamic variables.`);
      }
    }
  }
  // Write output file.
  let resultDotenv: ProcessEnv = dotenv;
  if (outputPath) {
    const outputPathResolved = dotenv[outputKey];
    if (!outputPathResolved) throw new Error('Output path not found.');
    const { [outputKey]: _omitted, ...dotenvForOutput } = dotenv;

    await fs.writeFile(
      outputPathResolved,
      Object.keys(dotenvForOutput).reduce((contents, key) => {
        const value = dotenvForOutput[key] ?? '';
        return `${contents}${key}=${
          value.includes('\n') ? `"${value}"` : value
        }\n`;
      }, ''),
      { encoding: 'utf-8' },
    );

    resultDotenv = dotenvForOutput;
  }

  // Log result.
  if (log) logger.log(resultDotenv);

  // Load process.env.
  if (loadProcess) Object.assign(process.env, resultDotenv);

  return resultDotenv;
};
