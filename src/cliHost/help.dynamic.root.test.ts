import { describe, expect, it, vi } from 'vitest';

import { createCli } from '@/src/cli';

describe('GetDotenvCli root dynamic help', () => {
  it('prints dynamic labels for root toggles (shell/log/load-process)', async () => {
    const run = createCli({ alias: 'test' });

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

    // Redact flags are present at the root level.
    expect(help).toMatch(/\s--redact\b/i);
    expect(help).toMatch(/\s--redact-off\b/i);
  });
});
