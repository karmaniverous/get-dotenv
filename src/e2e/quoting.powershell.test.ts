import { execaCommand } from 'execa';
import { describe, expect, it } from 'vitest';

// Platform-guarded E2E test for PowerShell quoting/interpolation.
// Skips on non-Windows platforms.
describe('E2E quoting (PowerShell)', () => {
  const isWindows = process.platform === 'win32';
  const shell = 'powershell.exe';

  it('skips on non-Windows platforms', () => {
    if (!isWindows) {
      // This assert is here only to make the intent explicit; real tests are below.
      expect(true).toBe(true);
    }
  });

  (!isWindows ? it.skip : it)(
    'double-quoted interpolates $env:VAR; single-quoted is literal',
    async () => {
      const env = { ...process.env, APP_SETTING: 'ps_value' };

      // Double-quoted: interpolated by PowerShell.
      const interpolated = await execaCommand(
        'Write-Output "$env:APP_SETTING"',
        {
          shell,
          env,
        },
      );
      expect(interpolated.stdout.trim()).toBe('ps_value');

      // Single-quoted: literal.
      // Note: PowerShell single-quoted strings are literals; use doubled single quotes
      // only when embedding single quotes inside the literal (not required here).
      const literal = await execaCommand("Write-Output '$env:APP_SETTING'", {
        shell,
        env,
      });
      expect(literal.stdout.trim()).toBe('$env:APP_SETTING');
    },
  );
});
