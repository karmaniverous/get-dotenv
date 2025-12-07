import { describe, expect, it } from 'vitest';

import type { RootOptionsShape } from '@/src/cliHost/types';
import { getDotenvCliOptions2Options } from '@/src/GetDotenvOptions';

describe('getDotenvCliOptions2Options (compat)', () => {
  it('accepts object vars and array paths', () => {
    const raw = {
      dotenvToken: '.env',
      privateToken: 'local',
      // Provide object vars (data-style config)
      vars: { LOG_LEVEL: 'info', EMPTY_OK: undefined } as unknown,
      // Provide array paths (already split)
      paths: ['./', './env'] as unknown,
    } as unknown as RootOptionsShape;

    const out = getDotenvCliOptions2Options(raw);
    expect(out.vars?.LOG_LEVEL).toBe('info');
    expect(
      Object.prototype.hasOwnProperty.call(out.vars ?? {}, 'EMPTY_OK'),
    ).toBe(false); // undefined dropped
    expect(out.paths).toEqual(['./', './env']);
  });

  it('parses string vars and string paths (legacy CLI style)', () => {
    const raw = {
      dotenvToken: '.env',
      privateToken: 'local',
      vars: 'FOO=bar BAZ=qux',
      varsDelimiter: ' ',
      varsAssignor: '=',
      paths: './ ./env',
      pathsDelimiter: ' ',
    } as unknown as RootOptionsShape;

    const out = getDotenvCliOptions2Options(raw);
    expect(out.vars).toEqual({ FOO: 'bar', BAZ: 'qux' });
    expect(out.paths).toEqual(['./', './env']);
  });
});
