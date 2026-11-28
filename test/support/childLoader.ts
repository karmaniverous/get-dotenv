/**
 * Run `loadModuleDefault` in a plain Node child process.
 *
 * Vitest loads TypeScript itself, so in-process the loader's direct import
 * always succeeds and its compile path never runs. A plain Node child has no
 * TS loader, so the compile path does run there. The loader is bundled to
 * `.mjs` first (Node can't resolve its extensionless relative imports), with
 * packages left external so they resolve from this repo.
 */
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

import { build } from 'esbuild';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
// One directory per test worker: workers bundle concurrently. It stays inside
// the repo so the bundle's package imports resolve from its node_modules.
const outDir = path.join(
  repoRoot,
  '.tsbuild',
  'test-child-loader',
  `${String(process.pid)}-${randomUUID()}`,
);
const outfile = path.join(outDir, 'loadModuleDefault.mjs');
process.once('exit', () => {
  rmSync(outDir, { recursive: true, force: true });
});

let bundled: Promise<string> | undefined;

/** Bundle the loader once per test run; resolve to its `file:` URL. */
const bundleLoader = (): Promise<string> =>
  (bundled ??= build({
    entryPoints: [path.join(repoRoot, 'src', 'util', 'loadModuleDefault.ts')],
    bundle: true,
    packages: 'external',
    platform: 'node',
    format: 'esm',
    outfile,
    logLevel: 'silent',
  }).then(() => url.pathToFileURL(outfile).href));

/** Result of a child run. */
export interface ChildLoadResult {
  /** The child's stdout, trimmed: the script's printed result. */
  stdout: string;
  /** The child's stderr. */
  stderr: string;
}

/**
 * Load `modulePath` with `loadModuleDefault` in a plain Node child.
 *
 * @param args - What to load and how.
 * @returns The child's output.
 */
export const loadInChild = async (args: {
  /** Absolute path of the module to load. */
  modulePath: string;
  /** Cache directory name passed to the loader. */
  cacheDirName: string;
  /** The child's working directory. */
  cwd?: string;
  /** Extra environment for the child (`NODE_OPTIONS` is always removed). */
  env?: NodeJS.ProcessEnv;
  /**
   * Script lines run after the load, with the default export bound to
   * `value`; they print the result. Defaults to printing `value` as JSON.
   */
  report?: string[];
}): Promise<ChildLoadResult> => {
  const loaderUrl = await bundleLoader();
  const script = [
    `const { loadModuleDefault } = await import(${JSON.stringify(loaderUrl)});`,
    `const value = await loadModuleDefault(${JSON.stringify(args.modulePath)}, ${JSON.stringify(args.cacheDirName)});`,
    ...(args.report ?? ['console.log(JSON.stringify(value));']),
  ].join('\n');
  const env: NodeJS.ProcessEnv = { ...process.env, ...args.env };
  delete env.NODE_OPTIONS;
  const run = spawnSync(
    process.execPath,
    ['--input-type=module', '--no-warnings', '-e', script],
    {
      encoding: 'utf8',
      env,
      timeout: 60_000,
      ...(args.cwd ? { cwd: args.cwd } : {}),
    },
  );
  return { stdout: run.stdout.trim(), stderr: run.stderr };
};
