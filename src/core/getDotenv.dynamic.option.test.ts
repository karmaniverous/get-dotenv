import fs from 'fs-extra';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { getDotenv } from './getDotenv';

describe('getDotenv programmatic dynamic', () => {
  it('applies dynamic map without dynamicPath', async () => {
    const vars = await getDotenv({
      dotenvToken: '.testenv',
      env: 'test',
      paths: ['./test/full'],
      dynamic: {
        PROG_DYNAMIC: ({ APP_SETTING = '' }) => `${APP_SETTING}-P`,
      },
    });
    expect(vars.PROG_DYNAMIC).toBe('deep_app_setting-P');
  });

  it('dynamicPath overrides programmatic dynamic when both provided', async () => {
    // Create a temporary JS dynamic module with a conflicting key
    const dir = path.posix.join('.tsbuild', 'getdotenv-tests');
    const dynJs = path.posix.join(dir, 'dynamic.override.js');
    await fs.ensureDir(dir);
    await fs.writeFile(
      dynJs,
      `export default { PROG_DYNAMIC: "from-path" };`,
      'utf-8',
    );

    const vars = await getDotenv({
      dotenvToken: '.testenv',
      env: 'test',
      paths: ['./test/full'],
      dynamicPath: dynJs,
      dynamic: {
        PROG_DYNAMIC: 'from-programmatic',
      },
    });
    expect(vars.PROG_DYNAMIC).toBe('from-path');

    await fs.remove(dynJs);
  });
});
