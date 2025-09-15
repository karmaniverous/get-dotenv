import { describe, expect, it } from 'vitest';

import type { Scripts } from './GetDotenvCliOptions';
import { resolveCommand, resolveShell } from './resolve';

describe('resolve helpers', () => {
  describe('resolveCommand', () => {
    it('returns command when no script matches', () => {
      expect(resolveCommand(undefined, 'echo ok')).toBe('echo ok');
    });
    it('resolves string script', () => {
      const scripts: Scripts = { build: 'npm run build' };
      expect(resolveCommand(scripts, 'build')).toBe('npm run build');
    });
    it('resolves object script cmd', () => {
      const scripts: Scripts = { serve: { cmd: 'node server.js' } };
      expect(resolveCommand(scripts, 'serve')).toBe('node server.js');
    });
  });

  describe('resolveShell', () => {
    it('prefers script-level override', () => {
      const scripts: Scripts = { serve: { cmd: 'x', shell: '/bin/zsh' } };
      expect(resolveShell(scripts, 'serve', false)).toBe('/bin/zsh');
    });
    it('falls back to provided shell', () => {
      expect(resolveShell(undefined, 'anything', true)).toBe(true);
      expect(resolveShell(undefined, 'anything', '/bin/bash')).toBe(
        '/bin/bash',
      );
    });
    it('defaults to false when neither provided', () => {
      expect(resolveShell(undefined, 'cmd', undefined)).toBe(false);
    });
  });
});
