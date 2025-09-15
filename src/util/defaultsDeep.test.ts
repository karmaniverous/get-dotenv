import { describe, expect, it } from 'vitest';

import { defaultsDeep } from './defaultsDeep';

describe('defaultsDeep', () => {
  it('overrides later layers and merges plain objects', () => {
    const result = defaultsDeep<{
      a: number;
      nested: { b?: number; c?: number };
    }>({ a: 1, nested: { b: 2 } }, { nested: { b: 3, c: 4 } });
    expect(result).toEqual({ a: 1, nested: { b: 3, c: 4 } });
  });

  it('replaces arrays instead of merging', () => {
    const result = defaultsDeep(
      { arr: [1, 2] as unknown as unknown[] },
      { arr: [3] as unknown as unknown[] },
    ) as unknown as { arr: number[] };
    expect(result.arr).toEqual([3]);
  });

  it('ignores undefined values (does not overwrite)', () => {
    const base = { a: 1, nested: { b: 2 } };
    const result = defaultsDeep<typeof base>(base, {
      a: undefined,
      nested: { b: undefined },
    } as unknown as typeof base);
    expect(result).toEqual(base);
  });

  it('replaces non-objects', () => {
    const result = defaultsDeep(
      { value: { x: 1 } as unknown },
      { value: 2 as unknown },
    ) as unknown as { value: number };
    expect(result.value).toBe(2);
  });
});
