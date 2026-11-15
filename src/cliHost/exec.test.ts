import { describe, expect, it } from 'vitest';

import { runCommandResult } from './exec';

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

  it('runs nothing and returns 0 for a blank shell command', async () => {
    const { exitCode } = await runCommandResult('   ', true);
    expect(exitCode).toBe(0);
  });
});
