import { parse as parseDotenv } from 'dotenv';
import { execaCommand } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import { describe, expect, it } from 'vitest';

// E2E suite against the shipped CLI (from source via tsx).
// Where possible, prefer --shell-off to avoid OS shell quoting variance
// and run a plain node subprocess to assert behavior.

// Avoid npx indirection (can hang on Windows/non-interactive). Invoke the CLI
// via the current Node binary and preload the tsx loader so TypeScript sources
// run directly.
const CLI = `node --import tsx src/cli/getdotenv`;

const TROOT = path.posix.join('.tsbuild', 'e2e-cli');

// Build a cross-platform node -e command that prints a single env key.
// The code string is JSON-stringified to preserve quoting reliably.
const nodePrintEnv = (key: string) =>
  `node -e ${JSON.stringify(`console.log(process.env.${key} ?? '')`)}`;

describe('E2E CLI (core options and plugins)', () => {
  it('displays cli help', async () => {
    const cmd = [CLI, '-h'].join(' ');
    const { stdout, exitCode } = await execaCommand(cmd, {
      env: { ...process.env, GETDOTENV_STDIO: 'pipe' },
    });
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toContain('Usage: getdotenv [options] [command]');
  }, 20000);

  it('loads env from paths and prints via subprocess (ENV_SETTING)', async () => {
    const cmd = [
      CLI,
      '--shell-off',
      '--paths',
      './test/full',
      '-e',
      'test',
      '--cmd',
      nodePrintEnv('ENV_SETTING'),
    ].join(' ');
    const { stdout, exitCode } = await execaCommand(cmd, {
      env: { ...process.env, GETDOTENV_STDIO: 'pipe' },
    });
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe('deep_test_setting');
  }, 20000);

  it('injects vars (-v) and prints them in subprocess', async () => {
    const cmd = [
      CLI,
      '--shell-off',
      '-v',
      'FOO=bar',
      '--cmd',
      nodePrintEnv('FOO'),
    ].join(' ');
    const { stdout, exitCode } = await execaCommand(cmd, {
      env: { ...process.env, GETDOTENV_STDIO: 'pipe' },
    });
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe('bar');
  }, 20000);

  it('writes output file (-o) with merged variables', async () => {
    const out = path.posix.join(TROOT, 'cli.core.out.env');
    await fs.ensureDir(path.posix.dirname(out));
    const cmd = [
      CLI,
      '--shell-off',
      '--paths',
      './test/full',
      '-e',
      'test',
      '-o',
      out,
      '--cmd',
      // No-op child; just ensure the CLI runs and writes output.
      'node -e ""',
    ].join(' ');
    const { exitCode } = await execaCommand(cmd, {
      env: { ...process.env, GETDOTENV_STDIO: 'pipe' },
    });
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
  }, 20000);

  it('excludes private when -r/--exclude-private is set', async () => {
    const cmd = [
      CLI,
      '--shell-off',
      '--paths',
      './test/full',
      '-e',
      'test',
      '-r', // exclude private
      '--cmd',
      nodePrintEnv('APP_SECRET'),
    ].join(' ');
    const { stdout, exitCode } = await execaCommand(cmd, {
      env: { ...process.env, GETDOTENV_STDIO: 'pipe' },
    });
    expect(exitCode).toBe(0);
    // When excluded, secret should be blank.
    expect(stdout.trim()).toBe('');
  }, 20000);
  it('executes positional cmd subcommand with --shell-off', async () => {
    const cmd = [
      CLI,
      '--shell-off',
      'cmd',
      'node',
      '-e',
      JSON.stringify("console.log('OK')"),
    ].join(' ');
    const { stdout, exitCode } = await execaCommand(cmd, {
      env: { ...process.env, GETDOTENV_STDIO: 'pipe' },
    });
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe('OK');
  }, 20000);
  it('batch list (-l) prints working directories', async () => {
    const cmd = [CLI, 'batch', '-r', './test', '-g', 'full partial', '-l'].join(
      ' ',
    );
    const { stdout, exitCode } = await execaCommand(cmd);
    expect(exitCode).toBe(0);
    // Do not assert absolute paths (platform variance); look for folder names.
    expect(stdout).toMatch(/test[\\/]+full/i);
    expect(stdout).toMatch(/test[\\/]+partial/i);
  }, 20000);

  it('batch exec runs a simple node process in each CWD (one target)', async () => {
    const cmd = [
      CLI,
      '--shell-off',
      'batch',
      '-r',
      './test',
      '-g',
      'full',
      'cmd',
      'node',
      '-e',
      JSON.stringify("console.log(process.cwd().includes('test'))"),
    ].join(' ');
    const { stdout, exitCode } = await execaCommand(cmd, {
      env: { ...process.env, GETDOTENV_STDIO: 'pipe' },
    });
    expect(exitCode).toBe(0);
    // The child prints "true" once (for the single matched path)
    expect(stdout).toMatch(/true/);
  }, 20000);
});
