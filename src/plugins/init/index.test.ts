import fs from 'fs-extra';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { GetDotenvCli } from '../../cliHost/GetDotenvCli';
import { initPlugin } from './index';

const TROOT = path.posix.join('.tsbuild', 'init-tests');

describe('plugins/init', () => {
  it('scaffolds json config and CLI skeleton (force)', async () => {
    const dir = path.posix.join(TROOT, 'case1');
    await fs.remove(dir);
    const cli = new GetDotenvCli('test').use(initPlugin({ logger: console }));
    await cli.parseAsync([
      'node',
      'test',
      'init',
      dir,
      '--config-format',
      'json',
      '--with-local',
      '--cli-name',
      'acme',
      '--force',
    ]);
    const cfg = path.posix.join(dir, 'getdotenv.config.json');
    const cfgLocal = path.posix.join(dir, 'getdotenv.config.local.json');
    const cliIndex = path.posix.join(dir, 'src', 'cli', 'acme', 'index.ts');
    const hello = path.posix.join(
      dir,
      'src',
      'cli',
      'acme',
      'plugins',
      'hello.ts',
    );
    expect(await fs.pathExists(cfg)).toBe(true);
    expect(await fs.pathExists(cfgLocal)).toBe(true);
    const indexTxt = await fs.readFile(cliIndex, 'utf-8');
    expect(indexTxt).toMatch(/acme/);
    expect(await fs.pathExists(hello)).toBe(true);
  }, 15000);

  it('idempotence with --yes (skip)', async () => {
    const dir = path.posix.join(TROOT, 'case2');
    await fs.remove(dir);
    const cli = new GetDotenvCli('test').use(initPlugin({ logger: console }));
    await cli.parseAsync([
      'node',
      'test',
      'init',
      dir,
      '--config-format',
      'json',
      '--force',
    ]);
    const cfg = path.posix.join(dir, 'getdotenv.config.json');
    await fs.writeFile(cfg, 'CHANGED', 'utf-8');
    await cli.parseAsync([
      'node',
      'test',
      'init',
      dir,
      '--config-format',
      'json',
      '--yes',
    ]);
    const after = await fs.readFile(cfg, 'utf-8');
    expect(after).toBe('CHANGED');
  }, 15000);

  it('scaffolds ts config with dynamic', async () => {
    const dir = path.posix.join(TROOT, 'case3');
    await fs.remove(dir);
    const cli = new GetDotenvCli('test').use(initPlugin({ logger: console }));
    await cli.parseAsync([
      'node',
      'test',
      'init',
      dir,
      '--config-format',
      'ts',
      '--force',
    ]);
    const cfg = path.posix.join(dir, 'getdotenv.config.ts');
    expect(await fs.pathExists(cfg)).toBe(true);
    const txt = await fs.readFile(cfg, 'utf-8');
    expect(txt).toMatch(/dynamic:/);
  }, 15000);
});
