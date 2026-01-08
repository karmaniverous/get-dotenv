import { describe, expect, it } from 'vitest';

import type { ProcessEnv } from '@/src/core';

import { dotenvExpand, dotenvExpandAll } from './dotenvExpand';

describe('dotenvExpand (extras)', () => {
  it('preserves escaped dollar signs', () => {
    process.env.FOO = 'bar';
    const input = 'price \\$5 and $FOO';
    const result = dotenvExpand(input);
    expect(result).toBe('price $5 and bar');
  });

  it('progressively expands values left-to-right when enabled', () => {
    const values = { A: '$FOO', B: '${A}-x' };
    const ref = { FOO: 'bar' } as ProcessEnv;
    const progressive = dotenvExpandAll(values, { ref, progressive: true });
    expect(progressive).toEqual({ A: 'bar', B: 'bar-x' });
  });

  it('non-progressive expansion does not see prior keys', () => {
    const values = { A: '$FOO', B: '${A}-x' };
    const ref = { FOO: 'bar' } as ProcessEnv;
    const nonProgressive = dotenvExpandAll(values, { ref, progressive: false });
    expect(nonProgressive).toEqual({ A: 'bar', B: '-x' });
  });
});
