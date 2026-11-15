/**
 * #90: only a scripts table's own keys are script names. A command named
 * after an inherited object property runs as typed instead of crashing the
 * executor (`command.map is not a function`).
 */
import { describe, expect, it } from 'vitest';

import { runCase } from '@/test/baseline/harness';

import { resolveCommand, resolveShell } from './resolve';
import type { ScriptsTable } from './types';

const scripts: ScriptsTable = {
  'git-status': { cmd: 'git status', shell: true },
};

describe('resolveCommand / resolveShell: own keys only (#90)', () => {
  it.each([
    'toString',
    'constructor',
    '__proto__',
    'valueOf',
    'hasOwnProperty',
  ])('%s resolves to itself with the global shell', (name) => {
    expect(resolveCommand(scripts, name)).toBe(name);
    expect(resolveShell(scripts, name, '/bin/zsh')).toBe('/bin/zsh');
  });

  it('still resolves real scripts, string and object forms', () => {
    const table: ScriptsTable = {
      s: 'echo s',
      o: { cmd: 'echo o', shell: '/bin/sh' },
      n: { cmd: 'echo n' },
    };
    expect(resolveCommand(table, 's')).toBe('echo s');
    expect(resolveShell(table, 's', '/bin/zsh')).toBe('/bin/zsh');
    expect(resolveCommand(table, 'o')).toBe('echo o');
    expect(resolveShell(table, 'o', '/bin/zsh')).toBe('/bin/sh');
    expect(resolveCommand(table, 'n')).toBe('echo n');
    expect(resolveShell(table, 'n', '/bin/zsh')).toBe(false);
    expect(resolveCommand(undefined, 'x')).toBe('x');
    expect(resolveShell(undefined, 'x', undefined)).toBe(false);
  });

  it('honours an own script named after an object property', () => {
    const table = JSON.parse(
      '{"toString":"echo own","__proto__":{"cmd":"echo proto","shell":"/bin/sh"}}',
    ) as ScriptsTable;
    expect(resolveCommand(table, 'toString')).toBe('echo own');
    expect(resolveCommand(table, '__proto__')).toBe('echo proto');
    expect(resolveShell(table, '__proto__', '/bin/zsh')).toBe('/bin/sh');
  });
});

// Shell off: PowerShell's command-not-found lookup takes up to a minute on
// CI Windows runners, and the crash did not depend on the shell.
describe('getdotenv toString (#90 repro)', () => {
  it.each([
    ['-S toString', ['-S', 'toString']],
    ['-S constructor', ['-S', 'constructor']],
  ])('%s runs the command instead of crashing', async (_label, args) => {
    const r = await runCase({
      kind: 'cli',
      group: 'getdotenv',
      host: 'getdotenv',
      id: `#90 ${args.join(' ')}`,
      source: '#90',
      mode: 'child',
      args,
    });
    expect(r.stderr).not.toMatch(/is not a function/);
  });
});
