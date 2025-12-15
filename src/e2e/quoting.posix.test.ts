import { execaCommand } from 'execa';
import { describe, expect, it } from 'vitest';

// Platform-guarded E2E test for POSIX shell quoting/interpolation.
// Skips on Windows where /bin/bash is not expected to exist.
describe('E2E quoting (POSIX)', () => {
  const isWindows = process.platform === 'win32';
  const shell = '/bin/bash';

  if (isWindows) {
    it.skip('outer shell expands unquoted and double-quoted variables; single quotes are literal', async () => {});
  } else {
    it('outer shell expands unquoted and double-quoted variables; single quotes are literal', async () => {
      const env = { ...process.env, APP_SETTING: 'posix_value' };

      // Unquoted: $APP_SETTING is expanded by the shell.
      const unquoted = await execaCommand('echo $APP_SETTING', {
        shell,
        env,
      });
      expect(unquoted.stdout.trim()).toBe('posix_value');

      // Double-quoted: still expanded by the shell.
      const doubleQuoted = await execaCommand('echo "$APP_SETTING"', {
        shell,
        env,
      });
      expect(doubleQuoted.stdout.trim()).toBe('posix_value');

      // Single-quoted: literal, no expansion.
      const singleQuoted = await execaCommand("echo '$APP_SETTING'", {
        shell,
        env,
      });
      expect(singleQuoted.stdout.trim()).toBe('$APP_SETTING');
    });
  }
});
