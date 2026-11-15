/**
 * #75: a spawn failure (missing command or cwd) is reported as
 * `Error: <message>` with a non-zero exit code, never NaN: 127 for ENOENT,
 * 1 otherwise.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { runCase } from '@/test/baseline/harness';

import { runCommand, runCommandResult } from './exec';

let missingDir: string;

beforeAll(async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'gdv-75-'));
  missingDir = path.join(dir, 'gone');
  await rm(dir, { recursive: true, force: true });
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe('spawn failure (#75)', () => {
  it('runCommandResult reports 127 and the message in stderr (shell off)', async () => {
    const r = await runCommandResult([process.execPath, '-v'], false, {
      cwd: missingDir,
    });
    expect(r.exitCode).toBe(127);
    expect(r.stderr).toMatch(/^Error: Command failed with ENOENT/);
  });

  it('runCommandResult reports 127 with a shell too', async () => {
    const r = await runCommandResult('node -v', true, { cwd: missingDir });
    expect(r.exitCode).toBe(127);
    expect(r.stderr).toMatch(/^Error: /);
  });

  it('runCommand prints Error: <message> and returns 127 (inherit)', async () => {
    const err: string[] = [];
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation((c) => {
      err.push(String(c));
      return true;
    });
    let code: number;
    try {
      code = await runCommand([process.execPath, '-v'], false, {
        cwd: missingDir,
        stdio: 'inherit',
      });
    } finally {
      spy.mockRestore();
    }
    expect(code).toBe(127);
    expect(err.join('')).toMatch(/^Error: Command failed with ENOENT[^]*\n$/);
  });

  it('runCommand prints the message once under capture', async () => {
    const err: string[] = [];
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation((c) => {
      err.push(String(c));
      return true;
    });
    let code: number;
    try {
      code = await runCommand([process.execPath, '-v'], false, {
        cwd: missingDir,
        stdio: 'pipe',
      });
    } finally {
      spy.mockRestore();
    }
    expect(code).toBe(127);
    expect(err.join('').match(/Error: /g)).toHaveLength(1);
  });

  it('a child that exits non-zero keeps its own code', async () => {
    const r = await runCommandResult(
      [process.execPath, '-e', 'process.exit(3)'],
      false,
    );
    expect(r.exitCode).toBe(3);
    expect(r.stderr).toBe('');
  });

  it('getdotenv -S -c <missing command> exits non-zero with a clear message (repro)', async () => {
    const r = await runCase({
      kind: 'cli',
      group: 'getdotenv',
      host: 'getdotenv',
      id: '#75 alias repro',
      source: '#75',
      mode: 'child',
      args: ['-S', '-c', 'baseline-missing-command'],
    });
    expect(r.exitCode).not.toBe(0);
    expect(r.stderr).not.toMatch(/NaN|out of range/);
    expect(r.stderr).toMatch(/baseline-missing-command/);
  });
});
