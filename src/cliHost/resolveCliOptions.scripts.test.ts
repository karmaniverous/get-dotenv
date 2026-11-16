/**
 * `resolveCliOptions` takes a raw `scripts` value given as a JSON string (the
 * 7.x form, kept) and puts the parsed table in the merged bag; a string that
 * isn't JSON leaves the stacked scripts alone.
 */
import { describe, expect, it } from 'vitest';

import { resolveCliOptions } from './resolveCliOptions';
import type { RootOptionsShape } from './types';

const scriptsOf = (
  raw: Record<string, unknown>,
  defaults: Partial<RootOptionsShape> = {},
) => resolveCliOptions<RootOptionsShape>(raw, defaults).merged.scripts;

describe('resolveCliOptions: raw scripts', () => {
  it('a JSON string becomes the scripts table', () => {
    expect(
      scriptsOf({ scripts: JSON.stringify({ build: 'npm run build' }) }),
    ).toEqual({ build: 'npm run build' });
  });

  it('a string that is not JSON is ignored: the defaults stand', () => {
    expect(
      scriptsOf({ scripts: '{not json' }, { scripts: { test: 'vitest' } }),
    ).toEqual({ test: 'vitest' });
  });
});
