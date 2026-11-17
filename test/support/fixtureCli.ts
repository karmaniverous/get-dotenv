/**
 * Test support: run a `createCli` host in a throwaway project directory and
 * record what the run resolved.
 *
 * Each run gets a fresh directory with a `package.json` and the given files,
 * runs with that directory as the working directory, and restores the working
 * directory and `process.env` afterwards. A `probe` subcommand records the
 * merged options bag and the dotenv context it sees; console and stderr
 * output is captured line by line.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { formatWithOptions } from 'node:util';

import { vi } from 'vitest';

import { createCli, type CreateCliOptions } from '@/src/cli';
import type {
  GetDotenvCli,
  GetDotenvCliCtx,
  GetDotenvCliOptions,
} from '@/src/cliHost';
import { definePlugin } from '@/src/cliHost/definePlugin';
import { readMergedOptions } from '@/src/cliHost/readMergedOptions';

/** What one fixture run recorded. */
export interface FixtureRun {
  /** The merged options bag seen by the `probe` action (if it ran). */
  bag?: GetDotenvCliOptions;
  /** The dotenv context seen by the `probe` action (if it ran). */
  ctx?: GetDotenvCliCtx;
  /** Lines written through `console.*` and `process.stderr`. */
  output: string[];
  /** The run's error, if it rejected. */
  error?: string;
}

/** Fixture project files, relative path → content. */
export type FixtureFiles = Record<string, string>;

/**
 * Run `fn` inside a fresh project directory holding `files`.
 *
 * @param files - Files to write (a `package.json` is always added).
 * @param fn - Work to run with the directory as the working directory.
 * @returns What `fn` returns.
 */
export const inFixture = async <T>(
  files: FixtureFiles,
  fn: (dir: string) => Promise<T>,
): Promise<T> => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'gdv-fixture-'));
  const all: FixtureFiles = {
    'package.json': JSON.stringify({ name: 'fixture', type: 'module' }),
    ...files,
  };
  for (const [rel, content] of Object.entries(all)) {
    const abs = path.join(dir, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  const prevCwd = process.cwd();
  const prevEnv = { ...process.env };
  process.chdir(dir);
  try {
    return await fn(dir);
  } finally {
    process.chdir(prevCwd);
    for (const k of Object.keys(process.env))
      if (!(k in prevEnv)) Reflect.deleteProperty(process.env, k);
    Object.assign(process.env, prevEnv);
    rmSync(dir, { recursive: true, force: true });
  }
};

/**
 * Run `fn` with the given `process.env` entries set (`undefined` unsets),
 * restoring their previous values afterwards.
 *
 * @param vars - Entries to set for the duration of `fn`.
 * @param fn - Work to run.
 * @returns What `fn` returns.
 */
export const withEnv = async <T>(
  vars: Record<string, string | undefined>,
  fn: () => Promise<T>,
): Promise<T> => {
  const prev = Object.fromEntries(
    Object.keys(vars).map((k) => [k, process.env[k]]),
  );
  const assign = (entries: Record<string, string | undefined>) => {
    for (const [k, v] of Object.entries(entries)) {
      if (v === undefined) Reflect.deleteProperty(process.env, k);
      else process.env[k] = v;
    }
  };
  assign(vars);
  try {
    return await fn();
  } finally {
    assign(prev);
  }
};

/**
 * Run `fn` as a nested run whose parent passed `bag` as its options.
 *
 * @param bag - The parent's options bag (`process.env.getDotenvCliOptions`).
 * @param fn - Work to run.
 * @returns What `fn` returns.
 */
export const withParentBag = <T>(
  bag: unknown,
  fn: () => Promise<T>,
): Promise<T> => withEnv({ getDotenvCliOptions: JSON.stringify(bag) }, fn);

/**
 * Record console and stderr output while `fn` runs.
 *
 * @param fn - Work to run.
 * @returns The captured lines and the work's result.
 */
export const captureOutput = async <T>(
  fn: () => Promise<T>,
): Promise<{ output: string[]; result: T }> => {
  const output: string[] = [];
  const push = (...args: unknown[]) => {
    output.push(
      ...formatWithOptions({ colors: false }, ...args)
        .split(/\r?\n/)
        .filter((l) => l.length > 0),
    );
  };
  const spies = [
    vi.spyOn(console, 'log').mockImplementation(push),
    vi.spyOn(console, 'info').mockImplementation(push),
    vi.spyOn(console, 'warn').mockImplementation(push),
    vi.spyOn(console, 'error').mockImplementation(push),
    vi.spyOn(console, 'debug').mockImplementation(push),
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      push(String(chunk));
      return true;
    }),
  ];
  try {
    return { output, result: await fn() };
  } finally {
    for (const s of spies) s.mockRestore();
  }
};

/**
 * A plugin mounted at `probe` whose action records the merged options bag
 * and the dotenv context.
 *
 * @param into - Receives the recorded values.
 * @returns The plugin.
 */
export const probePlugin = (into: Partial<FixtureRun>) =>
  definePlugin({
    ns: 'probe',
    setup(cli) {
      cli.action((_opts, thisCommand) => {
        into.bag = readMergedOptions(thisCommand);
        into.ctx = cli.getCtx();
      });
    },
  });

/**
 * Run a `createCli` host (with the `probe` plugin added to its composition)
 * once, inside a fixture project.
 *
 * @param args - Arguments after the command name, e.g. `['-L', 'probe']`.
 * @param files - Fixture project files.
 * @param options - `createCli` options; `compose` runs before `probe` is added.
 *   `importMetaUrl` defaults to this module's URL (get-dotenv's own root).
 * @returns What the run recorded.
 */
export const runFixtureCli = (
  args: string[],
  files: FixtureFiles = {},
  options: Partial<CreateCliOptions> = {},
): Promise<FixtureRun> =>
  inFixture(files, async () => {
    const rec: Partial<FixtureRun> = {};
    const run = createCli({
      importMetaUrl: import.meta.url,
      alias: 'fixture',
      ...options,
      compose: (p: GetDotenvCli) =>
        (options.compose ? options.compose(p) : p).use(probePlugin(rec)),
    });
    const prevExitCode = process.exitCode;
    const { output } = await captureOutput(async () => {
      try {
        await run([...args]);
      } catch (e) {
        rec.error = e instanceof Error ? e.message : String(e);
      }
    });
    process.exitCode = prevExitCode;
    return { ...rec, output };
  });
