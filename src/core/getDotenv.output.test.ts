import { parse as parseDotenv } from 'dotenv';
import fs from 'fs-extra';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { getDotenv } from './getDotenv';

describe('getDotenv output file', () => {
  it('writes consolidated dotenv file and returns vars without output key', async () => {
    const outPath = path.posix.join('.tsbuild', 'getdotenv.output.test.env');
    await fs.ensureDir(path.dirname(outPath));

    const vars = await getDotenv({
      dotenvToken: '.testenv',
      env: 'test',
      privateToken: 'secret',
      paths: ['./test/full'],
      outputPath: outPath,
      loadProcess: false,
    });

    // Returned vars should not include any internal output key and match expected.
    expect(vars).toEqual({
      APP_SETTING: 'deep_app_setting',
      APP_SECRET: 'deep_app_secret',
      ENV_SETTING: 'deep_test_setting',
      ENV_SECRET: 'deep_test_secret',
    });

    // File should exist with the same values.
    const exists = await fs.pathExists(outPath);
    expect(exists).toBe(true);
    const contents = await fs.readFile(outPath, 'utf-8');
    const parsed = parseDotenv(contents);
    expect(parsed).toEqual({
      APP_SETTING: 'deep_app_setting',
      APP_SECRET: 'deep_app_secret',
      ENV_SETTING: 'deep_test_setting',
      ENV_SECRET: 'deep_test_secret',
    });

    // Cleanup
    await fs.remove(outPath);
  });

  it('writes values that dotenv reads back exactly: #, edge whitespace, quotes, backslashes (#72)', async () => {
    const outPath = path.posix.join('.tsbuild', 'getdotenv.output72.test.env');
    await fs.ensureDir(path.dirname(outPath));
    const vars = {
      H: 'x #y',
      W: ' lead',
      M: 'line1\nline2 "q"',
      B: 'C:\\new\\dir',
      N: 'line\nC:\\new',
      Q: `it's "x" #1`,
      CR: 'a\rb',
    };

    const out = await getDotenv({
      paths: [],
      vars,
      outputPath: outPath,
      loadProcess: false,
    });

    expect(out).toEqual(vars);
    const contents = await fs.readFile(outPath, 'utf-8');
    expect(parseDotenv(contents)).toEqual(vars);
    await fs.remove(outPath);
  });
});
