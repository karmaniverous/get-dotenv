/**
 * #79: with a shell on, the command string reaches the shell untouched: runs
 * of spaces and `\ ` escapes are not re-split by the executor. With the shell
 * off the string is still split into argv (quote-aware).
 */
import { describe, expect, it } from 'vitest';

import { runCase } from '@/test/baseline/harness';

import { runCommandResult } from './exec';

const node = `"${process.execPath}"`;
const shell = process.platform === 'win32' ? 'powershell.exe' : '/bin/bash';
const printArgv = `-e "console.log(JSON.stringify(process.argv.slice(1)))"`;

describe('shell-on command string is passed untouched (#79)', () => {
  it('keeps runs of spaces inside quotes', async () => {
    const { stdout } = await runCommandResult(
      `${process.platform === 'win32' ? '& ' : ''}${node} ${printArgv} "[x   y]"`,
      shell,
    );
    expect(JSON.parse(stdout)).toEqual(['[x   y]']);
  });

  it('keeps a backslash-space inside quotes', async () => {
    const { stdout } = await runCommandResult(
      `${process.platform === 'win32' ? '& ' : ''}${node} ${printArgv} "[a\\ b]"`,
      shell,
    );
    expect(JSON.parse(stdout)).toEqual(['[a\\ b]']);
  });

  it('still splits the string into argv with the shell off', async () => {
    const { stdout } = await runCommandResult(
      `${node} -e "console.log(JSON.stringify(process.argv.slice(1)))" a   "b  c"`,
      false,
    );
    expect(JSON.parse(stdout)).toEqual(['a', 'b  c']);
  });

  it.each([
    ['runs of spaces', 'node probe.mjs "[x   y]"', '[x   y]'],
    ['backslash space', 'node probe.mjs "[a\\ b]"', '[a\\ b]'],
  ])('getdotenv -c with %s (repro)', async (_label, command, arg) => {
    const r = await runCase({
      kind: 'cli',
      group: 'getdotenv',
      host: 'getdotenv',
      id: `#79 ${command}`,
      source: '#79',
      args: ['-c', command],
    });
    expect(r.children?.map((c) => c.argv)).toEqual([[arg]]);
  });
});
