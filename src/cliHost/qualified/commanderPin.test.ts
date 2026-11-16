/**
 * Review 5916926264 #8: the argv walk (`walk.ts`) replays Commander
 * 15.1.0's private `parseOptions` and `_parseCommand` loop, and
 * `versionOption.ts` and `commander.ts` read its private fields. Those were
 * checked against 15.1.0 only, so get-dotenv pins Commander (and its typings)
 * to exactly that version. This guard fails if the pin or the installed
 * Commander moves; the private-field guards are in `commander.test.ts` and
 * `../versionOption.commanderPrivate.test.ts`. Before bumping Commander,
 * re-check the walk against the new `parseOptions` (the parity fixture,
 * `parity.test.ts`, and `walk.values.test.ts`) and update this version.
 */
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import pkg from '../../../package.json';

/** The Commander version the walk was checked against. */
const CHECKED = '15.1.0';

const require = createRequire(import.meta.url);
// The installed version: the package.json above the resolved entry (the
// packages' exports don't expose package.json).
const installed = (name: string): string => {
  let dir = path.dirname(require.resolve(name));
  while (!existsSync(path.join(dir, 'package.json'))) dir = path.dirname(dir);
  return (
    JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')) as {
      version: string;
    }
  ).version;
};

describe('Commander pin (review 5916926264 #8)', () => {
  it('package.json pins commander and its typings exactly', () => {
    expect(pkg.dependencies.commander).toBe(CHECKED);
    expect(pkg.dependencies['@commander-js/extra-typings']).toBe(CHECKED);
  });

  it('the installed commander is the version the walk was checked against', () => {
    expect(installed('commander')).toBe(CHECKED);
    expect(installed('@commander-js/extra-typings')).toBe(CHECKED);
  });
});
