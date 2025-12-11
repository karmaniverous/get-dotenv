import { describe, expect, it, vi } from 'vitest';

import { createCli } from '@/src/cli';

describe('GetDotenvCli root dynamic help', () => {
  it('shows default labels for key root toggles (shell/log/load-process)', async () => {
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

    try {
      await run(['-h']);
    } finally {
      spy.mockRestore();
    }

    const help = writes.join('');

    // Shell OFF is the default, so the OFF toggle should show "(default)".
    expect(help).toMatch(/-S, --shell-off[\s\S]*\(default\)/i);

    // Load process OFF is the default; OFF toggle shows "(default)".
    expect(help).toMatch(/-P, --load-process-off[\s\S]*\(default\)/i);

    // Log OFF is the default; OFF toggle shows "(default)".
    expect(help).toMatch(/-L, --log-off[\s\S]*\(default\)/i);
  });
});
