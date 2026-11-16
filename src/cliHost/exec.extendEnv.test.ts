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

const printKeys = [
  process.execPath,
  '-e',
  'console.log(JSON.stringify(Object.keys(process.env)))',
];

/**
 * The variables libuv copies from the parent into a Windows child's
 * environment block when the given env lacks them (`required_vars` in
 * libuv's `src/win/process.c`). POSIX adds nothing.
 */
const WINDOWS_MINIMUM = [
  'HOMEDRIVE',
  'HOMEPATH',
  'LOGONSERVER',
  'PATH',
  'SYSTEMDRIVE',
  'SYSTEMROOT',
  'TEMP',
  'USERDOMAIN',
  'USERNAME',
  'USERPROFILE',
  'WINDIR',
];

describe('an explicit env with no values (review 5916926264 #7)', () => {
  it.each([
    ['{}', {}],
    ['all undefined', { GDV_GONE: undefined }],
  ])(
    'env %s gives the child only the platform minimum',
    async (_label, env: NodeJS.ProcessEnv) => {
      const keys = await withEnv({ GDV_AMBIENT: 'leak' }, async () => {
        const { stdout } = await runCommandResult(printKeys, false, { env });
        return JSON.parse(stdout) as string[];
      });
      const minimum = process.platform === 'win32' ? WINDOWS_MINIMUM : [];
      expect(keys).not.toContain('GDV_AMBIENT');
      expect(keys.filter((k) => !minimum.includes(k.toUpperCase()))).toEqual(
        [],
      );
    },
  );
});

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
