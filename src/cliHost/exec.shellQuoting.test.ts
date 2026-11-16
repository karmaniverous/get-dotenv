/**
 * #51: `shell: true` means the OS default shell wherever it is set (scripts,
 * plugin config, the executor), and an argv array joined for a shell is
 * quoted by that shell's own rules.
 */
import { spawnSync } from 'node:child_process';

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

// Every shell on each CI leg, cmd.exe included.
const everyShell =
  process.platform === 'win32'
    ? ['powershell.exe', 'cmd.exe']
    : ['/bin/bash', '/bin/sh'];

describe('an empty argument survives every shell (review 5916926264 #3)', () => {
  it.each(everyShell)('%s passes an empty argument', async (shell) => {
    const args = ['a', '', 'b', ''];
    const { stdout, exitCode } = await runCommandResult(
      [...printArgv, ...args],
      shell,
    );
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toEqual(args);
  });
});

/**
 * Arguments built to break out of a shell's quoting (review 5916926264 #1,
 * #2): PowerShell's curly single quotes and `--%`, command substitution,
 * escapes, separators, line breaks, empty and blank arguments, trailing
 * backslashes, variable references and quotes.
 */
const HOSTILE = [
  'x\u2019; Write-Output PWNED; \u2019',
  '\u2018',
  '\u2019',
  '\u201A',
  '\u201B',
  "'",
  "it's",
  '--%',
  'x|hostname;#',
  '$(whoami)',
  '${env:PATH}',
  '`t',
  '`',
  ';',
  '&',
  '|',
  'a && echo PWNED',
  'line1\nline2',
  'cr\r\nlf',
  '',
  ' ',
  '\t',
  'tail\\',
  'a b\\',
  'a\\\\b',
  '%PATH%',
  '%PATH%x',
  '!PATH!',
  '"',
  '\\"',
  'q"r',
  'a "b" c',
  '"quoted words"',
  'a"b & echo PWNED',
  '^',
  '<in>',
  '(x)',
  '{y}',
  '@z',
  '#c',
  '-a.b',
  '-foo:bar',
  '\u00e9',
  '\u201C\u201D',
];

// Prints argv as JSON with every non-ASCII character escaped, so the
// comparison is exact whatever the console code page.
const printArgvAscii = [
  process.execPath,
  '-e',
  'console.log(JSON.stringify(process.argv.slice(1)).replace(/[\\u0080-\\uffff]/g,(c)=>"\\\\u"+c.charCodeAt(0).toString(16).padStart(4,"0")))',
];

const echoBack = async (shell: string, args: readonly string[]) => {
  const { stdout, stderr, exitCode } = await runCommandResult(
    [...printArgvAscii, ...args],
    shell,
  );
  return { argv: JSON.parse(stdout) as unknown, stderr, exitCode };
};

// pwsh is optional on a developer machine; both CI legs have it.
const hasPwsh =
  spawnSync('pwsh', ['-NoProfile', '-Command', 'exit 0']).status === 0;

describe('hostile arguments arrive byte for byte (review 5916926264 #1)', () => {
  it.each(
    process.platform === 'win32'
      ? ['powershell.exe']
      : ['/bin/bash', '/bin/sh'],
  )('%s', async (shell) => {
    expect(await echoBack(shell, HOSTILE)).toEqual({
      argv: HOSTILE,
      stderr: '',
      exitCode: 0,
    });
  });

  // cmd.exe exists only on Windows (review 5916926264 #2). It can't carry
  // a line break; joinForShell throws for those (see shell.test.ts).
  it.skipIf(process.platform !== 'win32')('cmd.exe', async () => {
    const args = HOSTILE.filter((a) => !/[\r\n]/.test(a));
    expect(await echoBack('cmd.exe', args)).toEqual({
      argv: args,
      stderr: '',
      exitCode: 0,
    });
  });

  // Skipped where pwsh is not installed (review 5916926264 #1).
  it.skipIf(!hasPwsh)('pwsh', async () => {
    expect(await echoBack('pwsh', HOSTILE)).toEqual({
      argv: HOSTILE,
      stderr: '',
      exitCode: 0,
    });
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
