// src/e2e/cli.core.test.ts
import { parse as parseDotenv } from 'dotenv';
import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import { describe, expect, it } from 'vitest';

// E2E suite against the shipped CLI (from source via tsx).
// Where possible, prefer --shell-off to avoid OS shell quoting variance
// and run a plain node subprocess to assert behavior.

// Invoke the CLI via the current Node binary with argv arrays (no shell).
// Preload the tsx loader so TypeScript sources run directly.
const nodeBin = process.execPath;
const CLI = (...args: string[]) => [
  '--import',
  'tsx',
  'src/cli/getdotenv',
  ...args,
];

const TROOT = path.posix.join('.tsbuild', 'e2e-cli');

describe('E2E CLI (core options and plugins)', () => {
  it('displays cli version', async () => {
    const { stdout, exitCode } = await execa(nodeBin, CLI('-V'), {
      env: { ...process.env, GETDOTENV_STDIO: 'pipe' },
    });
    expect(exitCode).toBe(0);
    // Commander prints the version string (e.g., "5.2.6")
    expect(/^\d+\.\d+\.\d+/.test(stdout.trim())).toBe(true);
  });

  it('runs a default shell command (no --shell-off) and echoes OK', async () => {
    const { stdout, exitCode } = await execa(
      nodeBin,
      CLI('cmd', 'echo', 'OK'),
      {
        env: { ...process.env, GETDOTENV_STDIO: 'pipe' },
      },
    );
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toContain('OK');
  });
  it('displays cli help', async () => {
    const { stdout, exitCode } = await execa(nodeBin, CLI('-h'), {
      env: { ...process.env, GETDOTENV_STDIO: 'pipe' },
    });
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toContain('Usage: getdotenv [options] [command]');
  });

  it('logs env vars', async () => {
    const { stdout, exitCode } = await execa(
      nodeBin,
      CLI(
        '--paths',
        './test/full',
        '-e',
        'test',
        '--dotenv-token',
        '.testenv',
        '-l',
      ),
      { env: { ...process.env, GETDOTENV_STDIO: 'pipe' } },
    );
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toContain(
      "{ APP_SETTING: 'deep_app_setting', ENV_SETTING: 'deep_test_setting' }",
    );
  });

  it('loads env from paths and prints via subprocess (ENV_SETTING)', async () => {
    const { stdout, exitCode } = await execa(
      nodeBin,
      CLI(
        '--shell-off',
        '--paths',
        './test/full',
        '-e',
        'test',
        '--dotenv-token',
        '.testenv',
        '--private-token',
        'secret',
        'cmd',
        'node',
        '-e',
        "console.log(process.env.ENV_SETTING ?? '')",
      ),
      { env: { ...process.env, GETDOTENV_STDIO: 'pipe' } },
    );
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe('deep_test_setting');
  });

  it('injects vars (-v) and prints them in subprocess', async () => {
    const { stdout, exitCode } = await execa(
      nodeBin,
      CLI(
        '--shell-off',
        '-v',
        'FOO=bar',
        'cmd',
        'node',
        '-e',
        "console.log(process.env.FOO ?? '')",
      ),
      { env: { ...process.env, GETDOTENV_STDIO: 'pipe' } },
    );
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe('bar');
  });

  it('writes output file (-o) with merged variables', async () => {
    const out = path.posix.join(TROOT, 'cli.core.out.env');
    await fs.ensureDir(path.posix.dirname(out));
    const { exitCode } = await execa(
      nodeBin,
      CLI(
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
        'cmd',
        'node',
        '-e',
        '0',
      ),
      { env: { ...process.env, GETDOTENV_STDIO: 'pipe' } },
    );
    expect(exitCode).toBe(0);
    const exists = await fs.pathExists(out);
    expect(exists).toBe(true);
    const contents = await fs.readFile(out, 'utf-8');
    const parsed = parseDotenv(contents);
    // Expect merged values from test/full for env=test
    expect(parsed.APP_SETTING).toBe('deep_app_setting');
    expect(parsed.APP_SECRET).toBe('deep_app_secret');
    expect(parsed.ENV_SETTING).toBe('deep_test_setting');
    expect(parsed.ENV_SECRET).toBe('deep_test_secret');
    await fs.remove(out);
  });

  it('excludes private when -r/--exclude-private is set', async () => {
    const { stdout, exitCode } = await execa(
      nodeBin,
      CLI(
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
        'cmd',
        'node',
        '-e',
        "console.log(process.env.APP_SECRET ?? '')",
      ),
      { env: { ...process.env, APP_SECRET: '', GETDOTENV_STDIO: 'pipe' } },
    );
    expect(exitCode).toBe(0);
    // When excluded, secret should be blank.
    expect(stdout.trim()).toBe('');
  });
  it('executes positional cmd subcommand with --shell-off', async () => {
    const { stdout, exitCode } = await execa(
      nodeBin,
      CLI('--shell-off', 'cmd', 'node', '-e', "console.log('OK')"),
      { env: { ...process.env, GETDOTENV_STDIO: 'pipe' } },
    );
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe('OK');
  });

  it('batch list (-l) prints working directories', async () => {
    const { stdout, exitCode } = await execa(
      nodeBin,
      CLI('batch', '-r', './test', '-g', 'full partial', '-l'),
    );
    expect(exitCode).toBe(0);
    // Do not assert absolute paths (platform variance); look for folder names.
    expect(stdout).toMatch(/test[\\/]+full/i);
    expect(stdout).toMatch(/test[\\/]+partial/i);
  });

  it('batch exec runs a simple node process in each CWD (one target)', async () => {
    const { stdout, exitCode } = await execa(
      nodeBin,
      CLI(
        '--shell-off',
        'batch',
        '-r',
        './test',
        '-g',
        'full',
        'cmd',
        'node',
        '-e',
        "console.log(process.cwd().includes('test'))",
      ),
      { env: { ...process.env, GETDOTENV_STDIO: 'pipe' } },
    );
    expect(exitCode).toBe(0);
    // The child prints "true" once (for the single matched path)
    expect(stdout).toMatch(/true/);
  });
});
