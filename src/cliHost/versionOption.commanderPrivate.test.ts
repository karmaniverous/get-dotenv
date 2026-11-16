/**
 * Guard for the private Commander API `setVersion` relies on
 * (`./versionOption.ts`): `_version`, the field `version()` reads, and
 * `_exit`, the exit path that honours `exitOverride`. If a Commander upgrade
 * renames either, these tests fail before `--version` silently prints a stale
 * version or stops exiting.
 */
import { Command, CommanderError } from '@commander-js/extra-typings';
import { describe, expect, it } from 'vitest';

interface VersionSlots {
  _version?: unknown;
  _exit?: unknown;
}

const slotsOf = (c: Command) => c as unknown as VersionSlots;

describe("Commander's private _version and _exit (version option guard)", () => {
  it('version(str) stores the string in _version, which version() returns', () => {
    const program = new Command().version('1.0.0');
    expect(slotsOf(program)._version).toBe('1.0.0');
    slotsOf(program)._version = '2.0.0';
    expect(program.version()).toBe('2.0.0');
  });

  it('_exit(code, name, message) calls the exitOverride callback with a CommanderError', () => {
    let caught: unknown;
    const program = new Command().exitOverride((err) => {
      caught = err;
      throw err;
    });
    const exit = slotsOf(program)._exit as (
      code: number,
      name: string,
      message: string,
    ) => void;
    expect(typeof exit).toBe('function');
    expect(() => {
      exit.call(program, 0, 'commander.version', '9.9.9');
    }).toThrow(CommanderError);
    expect(caught).toMatchObject({
      exitCode: 0,
      code: 'commander.version',
      message: '9.9.9',
    });
  });
});
