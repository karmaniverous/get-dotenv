import fs from 'fs-extra';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { GetDotenvCli } from '@/src/cliHost';

import { initPlugin } from './index';

const TROOT = path.posix.join('.tsbuild', 'init-tests');

describe('plugins/init', () => {
  it('scaffolds json config and CLI skeleton (force)', async () => {
    const dir = path.posix.join(TROOT, 'case1');
    await fs.remove(dir);

    const cli = new GetDotenvCli('test').use(initPlugin());
    await cli.install();

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
    expect(await fs.pathExists(cfg)).toBe(true);
    expect(await fs.pathExists(cfgLocal)).toBe(true);
    // .gitignore should include local patterns
    const gi = path.posix.join(dir, '.gitignore');
    expect(await fs.pathExists(gi)).toBe(true);
    const giTxt = await fs.readFile(gi, 'utf-8');
    expect(giTxt).toContain('getdotenv.config.local.*');
    expect(giTxt).toContain('*.local');

    const cliIndex = path.posix.join(dir, 'src', 'cli', 'acme', 'index.ts');
    const hello = path.posix.join(
      dir,
      'src',
      'cli',
      'acme',
      'plugins',
      'hello.ts',
    );
    expect(await fs.pathExists(cliIndex)).toBe(true);
    expect(await fs.pathExists(hello)).toBe(true);
    // validate token substitution coverage across skeleton files
    const helloTxt = await fs.readFile(hello, 'utf-8');
    expect(helloTxt).toMatch(/Say hello with current dotenv context/i);
  });

  it('idempotence with --yes (skip)', async () => {
    const dir = path.posix.join(TROOT, 'case2');
    await fs.remove(dir);

    const cli = new GetDotenvCli('test').use(initPlugin());
    await cli.install();

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
  });

  it('scaffolds ts config with dynamic', async () => {
    const dir = path.posix.join(TROOT, 'case3');
    await fs.remove(dir);

    const cli = new GetDotenvCli('test').use(initPlugin());
    await cli.install();

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
    // skeleton should also be created with tokens replaced
    const cliIndex = path.posix.join(dir, 'src', 'cli', 'case3', 'index.ts');
    const hello = path.posix.join(
      dir,
      'src',
      'cli',
      'case3',
      'plugins',
      'hello.ts',
    );
    expect(await fs.pathExists(cliIndex)).toBe(true);
    expect(await fs.pathExists(hello)).toBe(true);
    // Compose-first template with fixed alias; validate wiring and alias.
    await expect(fs.readFile(cliIndex, 'utf-8')).resolves.toMatch(
      /createCli\(/,
    );
    await expect(fs.readFile(cliIndex, 'utf-8')).resolves.toMatch(
      /alias:\s*'mycli'/,
    );
    await expect(fs.readFile(hello, 'utf-8')).resolves.toMatch(
      /Say hello with current dotenv context/i,
    );
  });

  it('forces overwrite in non-interactive/CI scenarios (force precedence)', async () => {
    const dir = path.posix.join(TROOT, 'case4');
    await fs.remove(dir);
    await fs.ensureDir(dir);
    const cfg = path.posix.join(dir, 'getdotenv.config.json');
    // Precreate with sentinel content
    await fs.writeFile(cfg, 'OLD', 'utf-8');

    const cli = new GetDotenvCli('test').use(initPlugin());
    await cli.install();

    await cli.parseAsync([
      'node',
      'test',
      'init',
      dir,
      '--config-format',
      'json',
      '--force',
    ]);

    const after = await fs.readFile(cfg, 'utf-8');
    expect(after).not.toBe('OLD'); // overwritten
  });

  it('auto-skips in CI-like environments when no flags are provided', async () => {
    const dir = path.posix.join(TROOT, 'case5');
    await fs.remove(dir);
    await fs.ensureDir(dir);
    const cfg = path.posix.join(dir, 'getdotenv.config.json');
    await fs.writeFile(cfg, 'OLD', 'utf-8');

    // Simulate CI; note: tests generally run non-interactive already,
    // this asserts that CI heuristic does not make behavior less safe.
    const prev = process.env.CI;
    process.env.CI = 'true';
    try {
      const cli = new GetDotenvCli('test').use(initPlugin());
      await cli.install();

      await cli.parseAsync([
        'node',
        'test',
        'init',
        dir,
        '--config-format',
        'json',
      ]);

      const after = await fs.readFile(cfg, 'utf-8');
      expect(after).toBe('OLD'); // skipped
    } finally {
      if (prev === undefined) delete process.env.CI;
      else process.env.CI = prev;
    }
  });
});
