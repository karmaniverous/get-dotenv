/**
 * #81: top-level help builds its context from the same defaults stack as its
 * labels (createCli \< config rootOptionDefaults \< parent bag, no CLI
 * flags), with no side effects: config dynamic does not run.
 */
import { existsSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import type { GetDotenvCli } from '@/src/cliHost';
import { captureOutput, inFixture } from '@/test/support/fixtureCli';

import { createCli } from './createCli';

const CONFIG = `import fs from 'node:fs';
export default {
  rootOptionDefaults: { paths: './envs' },
  dynamic: {
    SIDE: () => {
      fs.writeFileSync('dynamic-ran.txt', 'yes');
      return 'x';
    },
  },
};
`;

/** Run top-level help; return the help context's dotenv and the cwd marker. */
const helpCtx = (
  files: Record<string, string>,
  rootOptionDefaults?: { env?: string },
) =>
  inFixture(files, async () => {
    let program: GetDotenvCli | undefined;
    await captureOutput(() =>
      createCli({
        importMetaUrl: import.meta.url,
        alias: 'fixture',
        ...(rootOptionDefaults ? { rootOptionDefaults } : {}),
        compose: (p) => {
          program = p;
          return p;
        },
      })(['-h']),
    );
    return {
      dotenv: program?.getCtx().dotenv ?? {},
      dynamicRan: existsSync('dynamic-ran.txt'),
    };
  });

describe('top-level help context (#81)', () => {
  it('uses config rootOptionDefaults and does not run config dynamic (the issue repro)', async () => {
    const r = await helpCtx({
      'getdotenv.config.mjs': CONFIG,
      'envs/.env': 'APP=from-envs\n',
    });
    expect(r.dotenv.APP).toBe('from-envs');
    expect(r.dotenv.SIDE).toBeUndefined();
    expect(r.dynamicRan).toBe(false);
  });

  it('uses createCli rootOptionDefaults', async () => {
    const r = await helpCtx({ '.env.qa': 'STAGE=qa\n' }, { env: 'qa' });
    expect(r.dotenv.STAGE).toBe('qa');
  });
});
