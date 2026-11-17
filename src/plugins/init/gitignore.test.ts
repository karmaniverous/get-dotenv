/**
 * #58: `init` never rewrites an existing `.gitignore` (blank lines and line
 * endings are kept; only missing lines are appended), and the no-op
 * `--dynamic` flag is gone.
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runCase } from '@/test/baseline/harness';

import { ensureLines } from './io';

const NEEDED = ['getdotenv.config.local.*', '*.local'];

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'gdv-58-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('ensureLines (#58)', () => {
  it('keeps blank lines and CRLF and appends only the missing lines (repro)', async () => {
    const file = path.join(dir, '.gitignore');
    await writeFile(file, 'node_modules\r\n\r\n# local\r\n*.local\r\n');
    const r = await ensureLines(file, NEEDED);
    expect(r).toEqual({ created: false, changed: true });
    expect(await readFile(file, 'utf-8')).toBe(
      'node_modules\r\n\r\n# local\r\n*.local\r\ngetdotenv.config.local.*\r\n',
    );
  });

  it('adds a line ending first when the file lacks a final one (LF)', async () => {
    const file = path.join(dir, '.gitignore');
    await writeFile(file, 'a\n\nb');
    await ensureLines(file, NEEDED);
    expect(await readFile(file, 'utf-8')).toBe(
      'a\n\nb\ngetdotenv.config.local.*\n*.local\n',
    );
  });

  it('leaves a file that has every line untouched', async () => {
    const file = path.join(dir, '.gitignore');
    const content = '*.local\r\n\r\ngetdotenv.config.local.*';
    await writeFile(file, content);
    expect(await ensureLines(file, NEEDED)).toEqual({
      created: false,
      changed: false,
    });
    expect(await readFile(file, 'utf-8')).toBe(content);
  });

  it('creates a missing file with the lines', async () => {
    const file = path.join(dir, 'sub', '.gitignore');
    expect(await ensureLines(file, NEEDED)).toEqual({
      created: true,
      changed: true,
    });
    expect(await readFile(file, 'utf-8')).toBe(
      'getdotenv.config.local.*\n*.local\n',
    );
  });

  it('appends to an empty file without a leading blank line', async () => {
    const file = path.join(dir, '.gitignore');
    await writeFile(file, '');
    await ensureLines(file, ['x']);
    expect(await readFile(file, 'utf-8')).toBe('x\n');
  });
});

describe('init --dynamic (#58)', () => {
  it('is not an option', async () => {
    const r = await runCase({
      kind: 'cli',
      group: 'getdotenv',
      host: 'getdotenv',
      id: '#58 dynamic flag',
      source: '#58',
      args: ['init', '--dynamic', '--yes'],
    });
    expect(r.exitCode).not.toBe(0);
    expect(r.stderr).toContain("unknown option '--dynamic'");
  });

  it('init help does not offer --dynamic', async () => {
    const r = await runCase({
      kind: 'cli',
      group: 'getdotenv',
      host: 'getdotenv',
      id: '#58 init help',
      source: '#58',
      args: ['init', '-h'],
    });
    expect(r.stdout).toContain('--config-format');
    expect(r.stdout).not.toContain('--dynamic');
  });
});
