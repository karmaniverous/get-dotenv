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
    const first = a[0];
    expect(first).toBeDefined();
    if (!first) throw new Error('Expected provenance entry for APP_SETTING.');
    expect(first.kind).toBe('file');
    if (first.kind !== 'file') {
      throw new Error(`Expected kind='file' for APP_SETTING provenance.`);
    }
    expect(first.path).toBe('./test/full'); // as provided
    expect(first.file).toBe('.testenv'); // global public token
  });
});
