/**
 * #88: the env passed to the child is complete, so execa must not merge
 * `process.env` back in. On Windows (case-insensitive keys) a dotenv key that
 * differs only in case from an ambient variable otherwise loses to it.
 */
import { describe, expect, it } from 'vitest';

import { withEnv } from '@/test/support/fixtureCli';

import { runCommandResult } from './exec';
import { buildSpawnEnv } from './spawnEnv';

const printCase = [
  process.execPath,
  '-e',
  'const k=Object.keys(process.env).filter(k=>k.toLowerCase()==="gdv_case");console.log(JSON.stringify(k.map(x=>[x,process.env[x]])))',
];

describe('child env is not re-extended with process.env (#88)', () => {
  // Windows-only by nature (#88): on POSIX, keys are case-sensitive and
  // GDV_CASE and Gdv_Case are two different variables.
  it.skipIf(process.platform !== 'win32')(
    'a dotenv key differing only in case beats the ambient one (repro)',
    async () => {
      const { stdout } = await withEnv({ GDV_CASE: 'ambient' }, async () => {
        const env = buildSpawnEnv(process.env, { Gdv_Case: 'dotenv' });
        return runCommandResult(printCase, false, { env });
      });
      expect(JSON.parse(stdout)).toEqual([['Gdv_Case', 'dotenv']]);
    },
  );

  it('a key removed from the supplied env stays removed in the child', async () => {
    const { stdout } = await withEnv({ GDV_CASE: 'ambient' }, async () => {
      const env = buildSpawnEnv(process.env);
      Reflect.deleteProperty(env, 'GDV_CASE');
      return runCommandResult(printCase, false, { env });
    });
    expect(JSON.parse(stdout)).toEqual([]);
  });

  it('the shell path honours the supplied env too', async () => {
    const { stdout } = await withEnv({ GDV_CASE: 'ambient' }, async () => {
      const env = buildSpawnEnv(process.env);
      Reflect.deleteProperty(env, 'GDV_CASE');
      return runCommandResult(
        `"${process.execPath}" -e "console.log(process.env.GDV_CASE ?? 'unset')"`,
        process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
        { env },
      );
    });
    expect(stdout.trim()).toBe('unset');
  });
});
