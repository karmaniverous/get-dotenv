import { describe, expect, it } from 'vitest';

import { runCommandResult, splitCommandString } from './exec';

describe('cliCore/exec.runCommandResult', () => {
  it('captures stdout (plain argv, shell-off)', async () => {
    const nodeBin = process.execPath;
    const code = 'process.stdout.write("ok")';
    const { exitCode, stdout, stderr } = await runCommandResult(
      [nodeBin, '-e', code],
      false,
      { timeoutMs: 5000 },
    );
    expect(exitCode).toBe(0);
    expect(stdout).toBe('ok');
    expect(stderr).toBe('');
  });

  it('runs a command string through the shell', async () => {
    const { exitCode, stdout } = await runCommandResult(
      'echo  shell-ok',
      true,
      {
        timeoutMs: 5000,
      },
    );
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe('shell-ok');
  });

  it('returns NaN for a blank shell command', async () => {
    const { exitCode } = await runCommandResult('   ', true);
    expect(exitCode).toBeNaN();
  });
});

// The execa 9.x `execaCommand` rules (execa 10 removed it).
describe('cliCore/exec.splitCommandString', () => {
  it('returns no tokens for a blank command', () => {
    expect(splitCommandString('')).toEqual([]);
    expect(splitCommandString('   ')).toEqual([]);
  });

  it('trims and splits on runs of spaces', () => {
    expect(splitCommandString('  echo   a b  ')).toEqual(['echo', 'a', 'b']);
  });

  it('joins a backslash-escaped space into one token', () => {
    expect(splitCommandString('echo a\\ b')).toEqual(['echo', 'a b']);
  });

  it('collapses a run of spaces after an escape to one space', () => {
    // execa 10's parseCommandString yields ['echo', 'a ', 'b'] here.
    expect(splitCommandString('echo a\\  b')).toEqual(['echo', 'a b']);
  });

  it('chains escapes across several tokens', () => {
    expect(splitCommandString('a\\ b\\ c d')).toEqual(['a b c', 'd']);
  });

  it('keeps a trailing backslash with nothing after it', () => {
    expect(splitCommandString('echo a\\')).toEqual(['echo', 'a\\']);
    // execa 10 would keep the escaped trailing space: ['echo', 'a ']
    expect(splitCommandString('echo a\\ ')).toEqual(['echo', 'a\\']);
  });

  it('leaves tabs and quotes alone', () => {
    expect(splitCommandString('echo "a\tb"')).toEqual(['echo', '"a\tb"']);
  });
});
