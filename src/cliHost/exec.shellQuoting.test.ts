/**
 * #51: `shell: true` means the OS default shell wherever it is set (scripts,
 * plugin config, the executor), and an argv array joined for a shell is
 * quoted by that shell's own rules.
 */
import { describe, expect, it } from 'vitest';

import { runCase } from '@/test/baseline/harness';

import { runCommandResult } from './exec';

const printArgv = [
  process.execPath,
  '-e',
  'console.log(JSON.stringify(process.argv.slice(1)))',
];

const tokens = [
  'a b',
  'x$y',
  'q"r',
  "it's",
  'a,b',
  '(x)',
  '{y}',
  '@z',
  '`t',
  'semi;colon',
  'amp&er',
  'pipe|d',
  '<in>',
  'back\\slash',
  'tail\\',
  'sp ace\\',
  '"quoted words"',
  'a "b" c',
  'x "y',
  '"',
];

// Shells available on each CI leg.
const shells =
  process.platform === 'win32' ? ['powershell.exe'] : ['/bin/bash', '/bin/sh'];

describe('argv quoting follows the target shell (#51)', () => {
  it.each(shells)('%s passes every token intact', async (shell) => {
    const { stdout, exitCode } = await runCommandResult(
      [...printArgv, ...tokens],
      shell,
    );
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toEqual(tokens);
  });
});

describe('shell: true is the OS default shell (#51)', () => {
  // A command whose output tells PowerShell from cmd.exe, and bash from sh.
  const probe =
    process.platform === 'win32'
      ? 'node probe.mjs (1+1)'
      : 'node probe.mjs ${BASH_VERSION:+bash}';
  const expected = process.platform === 'win32' ? ['2'] : ['bash'];

  it('the executor maps true to the OS default shell', async () => {
    const { stdout } = await runCommandResult(
      process.platform === 'win32'
        ? 'Write-Output (1+1)'
        : 'echo ${BASH_VERSION:+bash}',
      true,
    );
    expect(stdout.trim()).toBe(expected[0]);
  });

  it('a script with shell: true runs in the OS default shell (repro)', async () => {
    const r = await runCase({
      kind: 'cli',
      group: 'getdotenv',
      host: 'getdotenv',
      id: '#51 script shell true repro',
      source: '#51',
      args: ['cmd', 'sh'],
      files: {
        'getdotenv.config.json': JSON.stringify({
          scripts: { sh: { cmd: probe, shell: true } },
        }),
      },
    });
    expect(r.children?.map((c) => c.argv)).toEqual([expected]);
  });

  it('batch plugin config shell: true runs in the OS default shell', async () => {
    const r = await runCase({
      kind: 'cli',
      group: 'getdotenv',
      host: 'getdotenv',
      id: '#51 batch plugin shell true',
      source: '#51',
      args: ['batch', '-g', 'pkgA', '-c', probe],
      files: {
        'getdotenv.config.json': JSON.stringify({
          plugins: { batch: { shell: true } },
        }),
      },
    });
    expect(r.children?.map((c) => c.argv)).toEqual([expected]);
  });

  it('batch positionals are quoted for the default shell (repro)', async () => {
    const r = await runCase({
      kind: 'cli',
      group: 'getdotenv',
      host: 'getdotenv',
      id: '#51 batch argv quoting repro',
      source: '#51',
      args: ['batch', '-g', 'pkgA', 'node', 'probe.mjs', 'a b', 'x$y', 'q"r'],
    });
    expect(r.children?.map((c) => c.argv)).toEqual([['a b', 'x$y', 'q"r']]);
  });
});
