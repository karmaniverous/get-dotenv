/**
 * #74: under capture (`--capture` or `GETDOTENV_STDIO=pipe`) the child's
 * buffered stderr is re-emitted to stderr, as its stdout is to stdout.
 */
import { describe, expect, it, vi } from 'vitest';

import { runCase } from '@/test/baseline/harness';

import { runCommand } from './exec';

describe('runCommand capture (#74)', () => {
  it('re-emits stdout to stdout and stderr to stderr', async () => {
    const out: string[] = [];
    const err: string[] = [];
    const spies = [
      vi.spyOn(process.stdout, 'write').mockImplementation((c) => {
        out.push(String(c));
        return true;
      }),
      vi.spyOn(process.stderr, 'write').mockImplementation((c) => {
        err.push(String(c));
        return true;
      }),
    ];
    let code: number;
    try {
      code = await runCommand(
        [process.execPath, '-e', 'console.error(1111);console.log(2222)'],
        false,
        { stdio: 'pipe' },
      );
    } finally {
      for (const s of spies) s.mockRestore();
    }
    expect(code).toBe(0);
    expect(out.join('')).toBe('2222\n');
    expect(err.join('')).toBe('1111\n');
  });

  it('getdotenv --capture -c keeps the child stderr (repro)', async () => {
    const r = await runCase({
      kind: 'cli',
      group: 'getdotenv',
      host: 'getdotenv',
      id: '#74 repro',
      source: '#74',
      args: ['--capture', '-c', 'node probe.mjs --stderr 1111'],
    });
    expect(r.stdout).toContain('probe: ["--stderr","1111"]');
    expect(r.stderr).toBe('1111\n');
  });
});
