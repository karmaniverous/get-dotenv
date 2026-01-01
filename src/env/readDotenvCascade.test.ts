import { describe, expect, it } from 'vitest';

import { readDotenvCascadeWithProvenance } from './readDotenvCascade';

describe('env/readDotenvCascadeWithProvenance', () => {
  it('records file provenance entries using as-provided path and computed filename token', async () => {
    const res = await readDotenvCascadeWithProvenance({
      dotenvToken: '.testenv',
      privateToken: 'secret',
      paths: ['./test/full'],
      env: 'test',
    });

    // Sanity: file-derived values
    expect(res.dotenv.APP_SETTING).toBe('deep_app_setting');
    expect(res.dotenv.ENV_SETTING).toBe('deep_test_setting');
    expect(res.dotenv.APP_SECRET).toBe('deep_app_secret');
    expect(res.dotenv.ENV_SECRET).toBe('deep_test_secret');

    // Provenance: at least one entry per key
    const a = res.provenance.APP_SETTING ?? [];
    expect(a.length).toBe(1);
    expect(a[0]?.kind).toBe('file');
    expect(a[0]?.path).toBe('./test/full'); // as provided
    expect(a[0]?.file).toBe('.testenv'); // global public token
  });
});
