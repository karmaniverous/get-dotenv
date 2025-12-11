import { describe, expect, it, vi } from 'vitest';

import { createCli } from '@/src/cli';

describe('GetDotenvCli root dynamic help', () => {
  it('shows dynamic labels for key root toggles (shell/log/load-process)', async () => {
    // Build a CLI and render top-level help via the factory runner.
    const run = createCli({ alias: 'test' });

    // Capture stdout written by help output.
    const writes: string[] = [];
    const spy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation((chunk: unknown) => {
        writes.push(String(chunk));
        return true;
      });

    const prev = process.env.GETDOTENV_STDIO;
    process.env.GETDOTENV_STDIO = 'pipe';
    try {
      await run(['-h']);
    } finally {
      spy.mockRestore();
      if (prev === undefined) delete process.env.GETDOTENV_STDIO;
      else process.env.GETDOTENV_STDIO = prev;
    }

    const help = writes.join('');

    // Shell default is ON (default OS shell); ensure label mentions that.
    expect(help).toMatch(/-s, --shell \[string][\s\S]*default OS shell/i);

    // Load process default is ON; ON toggle shows "(default)".
    expect(help).toMatch(/-p, --load-process[\s\S]*\(default\)/i);

    // Log default is OFF (unset); OFF toggle shows "(default)".
    expect(help).toMatch(/-L, --log-off[\s\S]*\(default\)/i);
  });
});
