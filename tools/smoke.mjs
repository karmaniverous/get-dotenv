#!/usr/bin/env node
/**
 * Smoke suite for get-dotenv (manual scenarios not fully covered by E2E on Windows).
 *
 * Runs:
 *  1) Core positional cmd with --shell-off (JSON print of APP/ENV/SECRET)
 *  2) Dynamic module (DYNAMIC_DOUBLE)
 *  3) Output file write/read (-o)
 *  4) Trace subset (--trace APP_SETTING ENV_SETTING)
 *  5) Batch list (globs: full partial)
 *
 * Notes:
 * - Executes the TypeScript CLI via: node --import tsx src/cli/getdotenv
 * - Uses argv arrays (no shell) to avoid Windows quoting issues.
 * - Forces GETDOTENV_STDIO=pipe to capture outputs deterministically.
 */
import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'node:path';

const nodeBin = process.execPath; // current Node
const baseEnv = {
  ...process.env,
  GETDOTENV_STDIO: 'pipe',
};

const cli = (...args) => ['--import', 'tsx', 'src/cli/getdotenv', ...args];

const hr = () => console.log('-'.repeat(72));
const section = (title) => {
  hr();
  console.log(title);
  hr();
};

const run = async (title, argv, opts = {}) => {
  section(title);
  try {
    const { stdout, stderr, exitCode } = await execa(nodeBin, argv, {
      env: baseEnv,
      ...opts,
    });
    if (stderr && stderr.trim()) {
      console.error('[stderr]');
      console.error(stderr.trim());
    }
    if (stdout && stdout.trim()) {
      console.log('[stdout]');
      console.log(stdout.trim());
    }
    console.log(`[exit] ${exitCode}`);
    return exitCode ?? 0;
  } catch (err) {
    const e = err;
    const code = typeof e?.exitCode === 'number' ? e.exitCode : 1;
    console.error('[error]');
    console.error(e?.stderr ?? String(e));
    console.log(`[exit] ${code}`);
    return code;
  }
};

const main = async () => {
  let failures = 0;

  // 1) Core positional cmd (shell-off), expect SECRET is blank due to -r
  const codeJson =
    'console.log(JSON.stringify({APP:process.env.APP_SETTING ?? "",ENV:process.env.ENV_SETTING ?? "",SECRET:process.env.APP_SECRET ?? ""}))';
  failures += await run(
    '1) Core shell-off JSON (SECRET should be blank with -r)',
    cli(
      '--shell-off',
      '--paths',
      './test/full',
      '-e',
      'test',
      '--dotenv-token',
      '.testenv',
      '--private-token',
      'secret',
      '-r',
      // default subcommand (positional)
      'node',
      '-e',
      codeJson,
    ),
  );

  // 2) Dynamic module (prints DYNAMIC_DOUBLE)
  failures += await run(
    '2) Dynamic module (DYNAMIC_DOUBLE)',
    cli(
      '--shell-off',
      '--paths',
      './test/full',
      '--dotenv-token',
      '.testenv',
      '--dynamic-path',
      './test/full/.testenv.js',
      'node',
      '-e',
      'console.log(process.env.DYNAMIC_DOUBLE ?? "")',
    ),
  );

  // 3) Output file write/read
  const out = path.resolve('.tsbuild', 'smoke.out.env');
  await fs.ensureDir(path.dirname(out));
  failures += await run(
    '3) Output file write (-o) and read-back',
    cli(
      '--shell-off',
      '--paths',
      './test/full',
      '-e',
      'test',
      '--dotenv-token',
      '.testenv',
      '--private-token',
      'secret',
      '-o',
      out,
      'node',
      '-e',
      '0',
    ),
  );
  // Read and print file content
  try {
    const exists = await fs.pathExists(out);
    console.log(`[file] ${out} exists: ${exists}`);
    if (exists) {
      const txt = await fs.readFile(out, 'utf-8');
      console.log('[file:contents]');
      console.log(txt.trim());
    }
  } catch (e) {
    console.error('[file:error]');
    console.error(String(e));
    failures += 1;
  }

  // 4) Trace (subset)
  failures += await run(
    '4) Trace (APP_SETTING, ENV_SETTING)',
    cli(
      '--shell-off',
      '--paths',
      './test/full',
      '-e',
      'test',
      '--dotenv-token',
      '.testenv',
      '--private-token',
      'secret',
      '-r',
      '--trace',
      'APP_SETTING',
      'ENV_SETTING',
      'node',
      '-e',
      '0',
    ),
  );

  // 5) Batch list
  failures += await run(
    '5) Batch list (full partial)',
    cli('batch', '-r', './test', '-g', 'full partial', '-l'),
  );

  hr();
  console.log(failures > 0 ? `Smoke: FAIL (${failures} step(s))` : 'Smoke: OK');
  process.exit(failures > 0 ? 1 : 0);
};

main().catch((e) => {
  console.error(e?.stack ?? String(e));
  process.exit(1);
});
