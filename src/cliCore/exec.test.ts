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
});
