/**
 * `userArgsOf` mirrors Commander 15's `_prepareUserArgs` (spec 4.4, `{ from }`).
 */
import { afterEach, describe, expect, it } from 'vitest';

import { userArgsOf } from './userArgs';

const saved = {
  argv: process.argv,
  execArgv: process.execArgv,
  electron: Object.getOwnPropertyDescriptor(process.versions, 'electron'),
  defaultApp: (process as { defaultApp?: boolean | undefined }).defaultApp,
};

const setElectron = (version: string | undefined) => {
  if (version === undefined)
    Reflect.deleteProperty(process.versions, 'electron');
  else
    Object.defineProperty(process.versions, 'electron', {
      value: version,
      configurable: true,
      enumerable: true,
    });
};

afterEach(() => {
  process.argv = saved.argv;
  process.execArgv = saved.execArgv;
  if (saved.electron)
    Object.defineProperty(process.versions, 'electron', saved.electron);
  else setElectron(undefined);
  (process as { defaultApp?: boolean | undefined }).defaultApp =
    saved.defaultApp;
});

describe('userArgsOf', () => {
  const full = ['app', 'script', 'a', 'b'];

  it("explicit argv defaults to 'node': two entries dropped", () => {
    expect(userArgsOf(full)).toEqual(['a', 'b']);
    expect(userArgsOf(full, { from: 'node' })).toEqual(['a', 'b']);
  });

  it("'user' keeps every entry", () => {
    expect(userArgsOf(full, { from: 'user' })).toEqual(full);
  });

  it("'electron' drops two with process.defaultApp, else one", () => {
    (process as { defaultApp?: boolean | undefined }).defaultApp = true;
    expect(userArgsOf(full, { from: 'electron' })).toEqual(['a', 'b']);
    (process as { defaultApp?: boolean | undefined }).defaultApp = undefined;
    expect(userArgsOf(full, { from: 'electron' })).toEqual([
      'script',
      'a',
      'b',
    ]);
  });

  it('returns a copy', () => {
    const argv = ['x'];
    const out = userArgsOf(argv, { from: 'user' });
    expect(out).toEqual(['x']);
    expect(out).not.toBe(argv);
  });

  it('argv omitted: reads process.argv as node', () => {
    setElectron(undefined);
    process.execArgv = [];
    process.argv = ['node', 'vc', '-e', 'dev'];
    expect(userArgsOf(undefined)).toEqual(['-e', 'dev']);
  });

  it.each(['-e', '--eval', '-p', '--print'])(
    'argv omitted under node %s: drops one entry',
    (flag) => {
      setElectron(undefined);
      process.execArgv = [flag, 'code'];
      process.argv = ['node', 'a', 'b'];
      expect(userArgsOf(undefined)).toEqual(['a', 'b']);
    },
  );

  it('argv omitted under electron: electron rules; eval wins over it', () => {
    setElectron('30.0.0');
    process.execArgv = [];
    process.argv = ['electron', 'app', 'x'];
    (process as { defaultApp?: boolean | undefined }).defaultApp = undefined;
    expect(userArgsOf(undefined)).toEqual(['app', 'x']);
    (process as { defaultApp?: boolean | undefined }).defaultApp = true;
    expect(userArgsOf(undefined)).toEqual(['x']);
    process.execArgv = ['-p'];
    expect(userArgsOf(undefined)).toEqual(['app', 'x']);
  });

  it('argv omitted with an explicit from: no auto-detection', () => {
    setElectron(undefined);
    process.execArgv = ['-e'];
    process.argv = ['node', 'vc', 'a'];
    expect(userArgsOf(undefined, { from: 'node' })).toEqual(['a']);
  });

  it('rejects a non-array argv and an unknown from, as Commander does', () => {
    expect(() => userArgsOf('x' as unknown as string[])).toThrow(
      'first parameter to parse must be array or undefined',
    );
    expect(() =>
      userArgsOf(['a'], { from: 'bogus' as unknown as 'user' }),
    ).toThrow("unexpected parse option { from: 'bogus' }");
  });
});
