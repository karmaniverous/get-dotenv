/**
 * Regression tests for #91: a child CLI keeps the parent's `shell: false`
 * (`-S`) even when its own default shell is a string.
 */
import { describe, expect, it } from 'vitest';

import { runFixtureCli } from '@/test/support/fixtureCli';

import { resolveCliOptions } from './resolveCliOptions';
import type { RootOptionsShape } from './types';

const osShell = process.platform === 'win32' ? 'powershell.exe' : '/bin/bash';

const shellOf = (
  raw: Record<string, unknown>,
  defaults: Partial<RootOptionsShape>,
  parent?: Partial<RootOptionsShape>,
) =>
  resolveCliOptions<RootOptionsShape>(
    raw,
    defaults,
    parent ? JSON.stringify(parent) : undefined,
  ).merged.shell;

describe('#91 parent shell: false reaches a child with a string default', () => {
  it('the issue repro: parent { shell: false } beats a /bin/zsh default', () => {
    expect(shellOf({}, { shell: '/bin/zsh' }, { shell: false })).toBe(false);
    expect(shellOf({}, { shell: true }, { shell: false })).toBe(false);
  });

  it('the child own flags still win over the parent', () => {
    expect(shellOf({ shell: '/bin/sh' }, {}, { shell: false })).toBe('/bin/sh');
    expect(shellOf({ shell: true }, {}, { shell: false })).toBe(osShell);
    expect(shellOf({ shellOff: true }, { shell: '/bin/zsh' })).toBe(false);
  });

  it('true or unset gives the OS default shell; a string default is kept', () => {
    expect(shellOf({}, {})).toBe(osShell);
    expect(shellOf({}, { shell: true })).toBe(osShell);
    expect(shellOf({}, { shell: '/bin/zsh' })).toBe('/bin/zsh');
    expect(shellOf({}, { shell: '/bin/zsh' }, { shell: '/bin/sh' })).toBe(
      '/bin/sh',
    );
  });

  it('a nested createCli child with a string default shell keeps the parent -S', async () => {
    const prev = process.env.getDotenvCliOptions;
    process.env.getDotenvCliOptions = JSON.stringify({ shell: false });
    try {
      const run = await runFixtureCli(
        ['probe'],
        {},
        {
          rootOptionDefaults: { shell: '/bin/zsh' },
        },
      );
      expect(run.error).toBeUndefined();
      expect(run.bag?.shell).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.getDotenvCliOptions;
      else process.env.getDotenvCliOptions = prev;
    }
  });
});
