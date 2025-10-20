import { createRequire } from 'node:module';
import path from 'node:path';

import fs from 'fs-extra';
import { describe, expect, it } from 'vitest';

describe('interop/createCli (CJS require of dist)', () => {
  it('requires dist/index.cjs and runs help (skips if dist missing)', async () => {
    const cjsPath = path.resolve('dist', 'index.cjs');
    const exists = await fs.pathExists(cjsPath);
    if (!exists) {
      // Build does not run before tests in this repo; treat as a skip.
      return;
    }
    // Ensure tests-only path disables process.exit for help/version flows.
    process.env.GETDOTENV_TEST = '1';

    const req = createRequire(import.meta.url);
    const mod = req(cjsPath) as {
      createCli?: (opts?: { alias?: string; branding?: string }) => {
        run: (argv: string[]) => Promise<void>;
      };
    };
    expect(typeof mod.createCli).toBe('function');
    const cli = mod.createCli?.({
      alias: 'getdotenv',
      branding: 'getdotenv (test-cjs)',
    });
    expect(cli && typeof cli.run === 'function').toBe(true);
    await cli?.run(['-h']);
  });
});
