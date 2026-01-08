import { describe, expect, it } from 'vitest';

import { getAwsRegion } from './utils';

describe('plugins/aws/utils', () => {
  it('returns region when present in ctx.plugins.aws', () => {
    const ctx = {
      plugins: {
        aws: { region: 'us-east-1' },
      },
    };
    expect(getAwsRegion(ctx)).toBe('us-east-1');
  });

  it('returns undefined when plugins is missing', () => {
    expect(getAwsRegion({})).toBeUndefined();
  });

  it('returns undefined when aws is missing or invalid', () => {
    expect(getAwsRegion({ plugins: {} })).toBeUndefined();
    expect(getAwsRegion({ plugins: { aws: 'invalid' } })).toBeUndefined();
  });

  it('returns undefined when region is missing', () => {
    expect(getAwsRegion({ plugins: { aws: {} } })).toBeUndefined();
  });
});
