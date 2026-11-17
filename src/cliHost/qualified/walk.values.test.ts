/**
 * The walk records each option's values as Commander takes them (review
 * 5916926264 #5: the `[getdotenv:argv]` line resolves `--redact-pattern`
 * and the other root flags from them). Checked against Commander's own
 * parse of the same argv.
 */
import { Command } from '@commander-js/extra-typings';
import { describe, expect, it } from 'vitest';

import { walkArgv } from './walk';

const program = () =>
  new Command('t')
    .exitOverride()
    .allowUnknownOption()
    .allowExcessArguments()
    .option('-r, --req <v>')
    .option('-o, --opt [v]')
    .option('-l, --list <v...>')
    .option('-b, --bool')
    .action(() => undefined);

const walked = (argv: string[]) =>
  walkArgv(
    program(),
    argv.map((text) => ({ kind: 'token' as const, text })),
  ).assigned.map((a) => [a.option.attributeName(), a.values]);

/** Commander's option values, folded the way the walk's values give them. */
const fold = (pairs: Array<[string, string[]]>) => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of pairs)
    out[k] =
      k === 'list'
        ? [...((out[k] as string[] | undefined) ?? []), ...v]
        : (v[v.length - 1] ?? true);
  return out;
};

const commander = (argv: string[]) => {
  const p = program();
  p.parse(argv, { from: 'user' });
  return p.opts();
};

describe('walk values (review 5916926264 #5)', () => {
  it.each<[string[], Array<[string, string[]]>]>([
    [['-r', 'x'], [['req', ['x']]]],
    [['--req=x=y'], [['req', ['x=y']]]],
    [['-rx'], [['req', ['x']]]],
    [
      ['-br', 'x'],
      [
        ['bool', []],
        ['req', ['x']],
      ],
    ],
    [
      ['-bry'],
      [
        ['bool', []],
        ['req', ['y']],
      ],
    ],
    [['-o'], [['opt', []]]],
    [['-o', 'v'], [['opt', ['v']]]],
    [['-ov'], [['opt', ['v']]]],
    [['--opt=v'], [['opt', ['v']]]],
    [
      ['-l', 'a', 'b', '-b', 'c'],
      [
        ['list', ['a', 'b']],
        ['bool', []],
      ],
    ],
    [['--list=a', 'b'], [['list', ['a']]]],
    [
      ['-l', 'a', '-l', 'b'],
      [
        ['list', ['a']],
        ['list', ['b']],
      ],
    ],
  ])('%j', (argv, expected) => {
    expect(walked(argv)).toEqual(expected);
    expect(commander(argv)).toEqual(fold(expected));
  });
});
