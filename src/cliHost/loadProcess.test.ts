/**
 * Regression tests for #47: the host's `loadProcess` effect follows the
 * library's rule. A string sets the key; an `undefined` value, or a key a
 * dynamic `null` deleted, deletes it from `process.env`.
 */
import { describe, expect, it } from 'vitest';

import { runFixtureCli, withEnv } from '@/test/support/fixtureCli';

import { definePlugin } from './definePlugin';
import type { GetDotenvCli } from './GetDotenvCli';

const KEYS = ['EMPTY', 'GONE', 'SET'] as const;

/** Run the host and record what `process.env` holds when the action runs. */
const seenAfter = async (args: string[], files: Record<string, string>) => {
  const seen: Record<string, { present: boolean; value?: string }> = {};
  const envProbe = definePlugin({
    ns: 'envprobe',
    setup(cli) {
      cli.action(() => {
        for (const k of KEYS) {
          const value = process.env[k];
          seen[k] = {
            present: k in process.env,
            ...(value !== undefined ? { value } : {}),
          };
        }
      });
    },
  });
  await withEnv({ EMPTY: 'ambient', GONE: 'ambient' }, () =>
    runFixtureCli([...args, 'envprobe'], files, {
      compose: (p: GetDotenvCli) => p.use(envProbe),
    }),
  );
  return seen;
};

const files = {
  '.env': 'EMPTY=\nSET=yes\n',
  'getdotenv.config.mjs': 'export default { dynamic: { GONE: () => null } };\n',
};

describe('#47 host loadProcess deletes unset keys', () => {
  it('the issue repro: an empty value deletes the key, not "undefined"', async () => {
    const seen = await seenAfter([], files);
    expect(seen.EMPTY).toEqual({ present: false });
    expect(seen.SET).toEqual({ present: true, value: 'yes' });
  });

  it('a key deleted by a dynamic null is deleted from process.env', async () => {
    const seen = await seenAfter([], files);
    expect(seen.GONE).toEqual({ present: false });
  });

  it('-P leaves process.env alone', async () => {
    const seen = await seenAfter(['-P'], files);
    expect(seen.EMPTY).toEqual({ present: true, value: 'ambient' });
    expect(seen.GONE).toEqual({ present: true, value: 'ambient' });
    expect(seen.SET).toEqual({ present: false });
  });
});
