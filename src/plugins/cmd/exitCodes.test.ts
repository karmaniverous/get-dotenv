/**
 * #50: get-dotenv exits with the child's code. `cmd` and the default command
 * propagate it; batch fails non-zero when a directory fails (sequential mode
 * stops at the first failure) unless `--ignore-errors`; usage errors exit
 * non-zero.
 *
 * Child mode: a real `getdotenv` process, so the exit code is the process's.
 * Most cases run with the shell off (`-S`): under the default Windows shell,
 * `powershell.exe -Command` reports any failure as 1 (spec 3.6.5).
 */
import { describe, expect, it } from 'vitest';

import { runCase } from '@/test/baseline/harness';

const P = ['node', 'probe.mjs'];

// The code a failing child surfaces through the default shell.
const viaDefaultShell = (code: number) =>
  process.platform === 'win32' ? 1 : code;

const run = (id: string, args: string[]) =>
  runCase({
    kind: 'cli',
    group: 'getdotenv',
    host: 'getdotenv',
    id: `#50 ${id}`,
    source: '#50',
    mode: 'child',
    args,
  });

const dirsRun = (r: Awaited<ReturnType<typeof run>>) =>
  (r.children ?? []).map((c) => c.cwd);

describe('exit codes (#50)', () => {
  it('cmd propagates the child exit code (repro)', async () => {
    const r = await run('cmd exit', ['-S', 'cmd', ...P, '--exit', '3']);
    expect(r.exitCode).toBe(3);
  });

  it('the default command propagates the child exit code', async () => {
    const r = await run('default exit', ['-S', ...P, '--exit', '4']);
    expect(r.exitCode).toBe(4);
  });

  it('the default shell surfaces a failure (the exact code off Windows)', async () => {
    const r = await run('default shell exit', [...P, '--exit', '4']);
    expect(r.exitCode).toBe(viaDefaultShell(4));
  });

  it('a zero exit stays zero', async () => {
    const r = await run('cmd ok', ['cmd', ...P]);
    expect(r.exitCode).toBe(0);
  });

  it('the alias with positional cmd args is a usage error with a non-zero exit', async () => {
    const r = await run('alias conflict', [
      '-c',
      'node probe.mjs',
      '-e',
      'dev',
      'cmd',
      ...P,
    ]);
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain('--cmd option conflicts with cmd subcommand.');
    expect(r.children).toEqual([]);
  });

  it('batch (sequential) stops at the first failure with its code (repro)', async () => {
    const r = await run('batch seq', [
      '-S',
      'batch',
      '-g',
      'pkgA pkgB',
      ...P,
      '--exit',
      '3',
    ]);
    expect(r.exitCode).toBe(3);
    expect(dirsRun(r)).toEqual(['pkgA']);
  });

  it('batch (sequential) --ignore-errors runs every directory and exits 0', async () => {
    const r = await run('batch seq ignore', [
      '-S',
      'batch',
      '-g',
      'pkgA pkgB',
      '--ignore-errors',
      ...P,
      '--exit',
      '3',
    ]);
    expect(r.exitCode).toBe(0);
    expect(dirsRun(r)).toEqual(['pkgA', 'pkgB']);
  });

  it('batch (parallel) fails non-zero when any directory fails', async () => {
    const r = await run('batch par', [
      '-S',
      'batch',
      '-g',
      'pkgA pkgB',
      '-P',
      ...P,
      '--exit',
      '3',
    ]);
    expect(r.exitCode).toBe(3);
    expect(r.stderr).toContain('2 of 2 directories failed');
  });

  it('batch (parallel) --ignore-errors exits 0', async () => {
    const r = await run('batch par ignore', [
      '-S',
      'batch',
      '-g',
      'pkgA pkgB',
      '-P',
      '--ignore-errors',
      ...P,
      '--exit',
      '3',
    ]);
    expect(r.exitCode).toBe(0);
  });

  it.each([
    ['no command', ['batch'], 'No command provided'],
    ['no paths', ['batch', '-g', 'nomatch', ...P], 'No paths found'],
  ])('batch usage error (%s) exits non-zero', async (label, args, message) => {
    const r = await run(`batch ${label}`, args);
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain(message);
  });
});
