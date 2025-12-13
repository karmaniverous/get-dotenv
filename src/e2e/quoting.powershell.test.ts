import { execaCommand } from 'execa';
import { describe, expect, it } from 'vitest';

// Platform-guarded E2E test for PowerShell quoting/interpolation.
// Skips on non-Windows platforms.
describe('E2E quoting (PowerShell)', () => {
  const isWindows = process.platform === 'win32';
  const shell = 'powershell.exe';

  if (!isWindows) {
    it.skip('double-quoted interpolates $env:VAR; single-quoted is literal', async () => {});
  } else {
    it('double-quoted interpolates $env:VAR; single-quoted is literal', async () => {
      const env = { ...process.env, APP_SETTING: 'ps_value' };

      // Double-quoted: interpolated by PowerShell.
      const interpolated = await execaCommand(
        'Write-Output "$env:APP_SETTING"',
        { shell, env },
      );
      expect(interpolated.stdout.trim()).toBe('ps_value');

      // Single-quoted: literal.
      const literal = await execaCommand("Write-Output '$env:APP_SETTING'", {
        shell,
        env,
      });
      expect(literal.stdout.trim()).toBe('$env:APP_SETTING');
    });
  }
});
