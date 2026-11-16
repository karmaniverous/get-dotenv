/**
 * The Commander 15 rules the argv walk restates or reads (`commander.ts`).
 *
 * Guard: the walk reads private Commander members (`_enablePositionalOptions`,
 * `_passThroughOptions`, `_combineFlagAndOptionalValue`,
 * `_defaultCommandName`, `_getHelpOption()`, `_getHelpCommand()`). These
 * tests fail if a Commander upgrade renames or removes any of them.
 */
import { Command, Option } from '@commander-js/extra-typings';
import { describe, expect, it } from 'vitest';

import {
  canBeValue,
  defaultSwitchOf,
  findCommand,
  findOption,
  helpCommandOf,
  isHelpFlag,
  maybeOption,
  negativeNumberArg,
  parseFlagsOf,
  registerDefaultSwitch,
} from './commander';

describe('Commander predicates', () => {
  it('maybeOption: longer than one character and starts with -', () => {
    expect(maybeOption('-x')).toBe(true);
    expect(maybeOption('--')).toBe(true);
    expect(maybeOption('-')).toBe(false);
    expect(maybeOption('x-')).toBe(false);
    expect(maybeOption('')).toBe(false);
  });

  it('negativeNumberArg: numbers, unless a digit short option is in the hierarchy', () => {
    const root = new Command('r');
    const leaf = new Command('l');
    root.addCommand(leaf);
    for (const n of ['-5', '-1.5', '-.5', '-1e3', '-1.5E+3', '-2e-1'])
      expect(negativeNumberArg(leaf, n)).toBe(true);
    for (const n of ['-x', '--5', '-5x', '-1.', '5', '-e3'])
      expect(negativeNumberArg(leaf, n)).toBe(false);
    root.option('-1, --one');
    expect(negativeNumberArg(leaf, '-5')).toBe(false);
    expect(negativeNumberArg(root, '-5')).toBe(false);
  });

  it('canBeValue: not an option, or a negative number', () => {
    const c = new Command('c');
    expect(canBeValue(c, 'x')).toBe(true);
    expect(canBeValue(c, '-5')).toBe(true);
    expect(canBeValue(c, '-x')).toBe(false);
    expect(canBeValue(c, '--')).toBe(false);
  });

  it('findOption / findCommand: by flag, by name or alias', () => {
    const c = new Command('c').option('-a, --all').option('--no-color');
    const sub = new Command('sub').alias('s');
    c.addCommand(sub);
    expect(findOption(c, '-a')?.long).toBe('--all');
    expect(findOption(c, '--all')?.long).toBe('--all');
    expect(findOption(c, '--no-color')?.negate).toBe(true);
    expect(findOption(c, '--color')).toBeUndefined();
    expect(findCommand(c, 'sub')).toBe(sub);
    expect(findCommand(c, 's')).toBe(sub);
    expect(findCommand(c, 'x')).toBeUndefined();
    expect(findCommand(c, undefined)).toBeUndefined();
  });
});

describe('Commander private members (guard)', () => {
  it('parse flags', () => {
    const root = new Command('r').enablePositionalOptions();
    const pass = new Command('p');
    const plain = new Command('q');
    root.addCommand(pass, { isDefault: true }).addCommand(plain);
    pass.passThroughOptions();
    (
      pass as unknown as { _combineFlagAndOptionalValue: boolean }
    )._combineFlagAndOptionalValue = false;
    expect(parseFlagsOf(root)).toEqual({
      positional: true,
      passThrough: false,
      combine: true,
      defaultName: 'p',
    });
    expect(parseFlagsOf(pass)).toEqual({
      positional: true,
      passThrough: true,
      combine: false,
      defaultName: undefined,
    });
    expect(parseFlagsOf(plain).positional).toBe(false);
  });

  it('help option and implicit help command', () => {
    const parent = new Command('p').addCommand(new Command('x'));
    expect(isHelpFlag(parent, '-h')).toBe(true);
    expect(isHelpFlag(parent, '--help')).toBe(true);
    expect(isHelpFlag(parent, '-x')).toBe(false);
    expect(helpCommandOf(parent)?.name()).toBe('help');
    // An action, no subcommands, or helpOption(false)/helpCommand(false):
    // no implicit help command / help flag.
    expect(helpCommandOf(new Command('a').action(() => undefined))).toBe(
      undefined,
    );
    const withAction = new Command('w').action(() => undefined);
    withAction.addCommand(new Command('y'));
    expect(helpCommandOf(withAction)).toBeUndefined();
    const off = new Command('o').helpOption(false).helpCommand(false);
    off.addCommand(new Command('z'));
    expect(isHelpFlag(off, '-h')).toBe(false);
    expect(helpCommandOf(off)).toBeUndefined();
    const custom = new Command('c').helpOption('-?, --ayuda');
    expect(isHelpFlag(custom, '-?')).toBe(true);
    expect(isHelpFlag(custom, '-h')).toBe(false);
  });
});

describe('default switches', () => {
  it('registers an option as switching its command default', () => {
    const o = new Option('-c, --cmd <x...>');
    expect(defaultSwitchOf(o)).toBeUndefined();
    registerDefaultSwitch(o, 'cmd');
    expect(defaultSwitchOf(o)).toBe('cmd');
  });
});
