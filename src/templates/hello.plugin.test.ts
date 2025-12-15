import fs from 'fs-extra';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';

import { createCli } from '@/src/cli';
import { helloPlugin } from '@/templates/cli/plugins/hello';

const TROOT = path.resolve('.tsbuild', 'template-hello-plugin-tests');

const writeProject = async (dir: string, cfg: unknown) => {
  await fs.ensureDir(dir);
  await fs.writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'template-hello-plugin-tests' }, null, 2),
    'utf-8',
  );
  await fs.writeFile(
    path.join(dir, 'getdotenv.config.json'),
    JSON.stringify(cfg, null, 2),
    'utf-8',
  );
};

const withCwd = async (dir: string, fn: () => Promise<void>) => {
  const prev = process.cwd();
  process.chdir(dir);
  try {
    await fn();
  } finally {
    process.chdir(prev);
  }
};

describe('templates/cli/plugins/hello', () => {
  it('uses config default loud=true when no flags are provided', async () => {
    const dir = path.join(TROOT, 'case1');
    await fs.remove(dir);
    await writeProject(dir, { plugins: { hello: { loud: true } } });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      await withCwd(dir, async () => {
        const run = createCli({
          alias: 'test',
          compose: (p) => p.use(helloPlugin()),
        });
        await run(['node', 'test', '--exclude-all', 'hello']);
      });

      expect(logSpy).toHaveBeenCalledTimes(1);
      const label = String(logSpy.mock.calls[0]?.[0] ?? '');
      expect(label).toMatch(/HELLO, STRANGER!/);
    } finally {
      logSpy.mockRestore();
      await fs.remove(dir);
    }
  });

  it('supports -L to override config loud=true (loud off)', async () => {
    const dir = path.join(TROOT, 'case2');
    await fs.remove(dir);
    await writeProject(dir, { plugins: { hello: { loud: true } } });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      await withCwd(dir, async () => {
        const run = createCli({
          alias: 'test',
          compose: (p) => p.use(helloPlugin()),
        });
        await run(['node', 'test', '--exclude-all', 'hello', '-L']);
      });

      expect(logSpy).toHaveBeenCalledTimes(1);
      const label = String(logSpy.mock.calls[0]?.[0] ?? '');
      expect(label).toMatch(/Hello, stranger!/);
      expect(label).not.toMatch(/HELLO, STRANGER!/);
    } finally {
      logSpy.mockRestore();
      await fs.remove(dir);
    }
  });

  it('supports -l to override config loud=false (loud on)', async () => {
    const dir = path.join(TROOT, 'case3');
    await fs.remove(dir);
    await writeProject(dir, { plugins: { hello: { loud: false } } });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      await withCwd(dir, async () => {
        const run = createCli({
          alias: 'test',
          compose: (p) => p.use(helloPlugin()),
        });
        await run(['node', 'test', '--exclude-all', 'hello', '-l']);
      });

      expect(logSpy).toHaveBeenCalledTimes(1);
      const label = String(logSpy.mock.calls[0]?.[0] ?? '');
      expect(label).toMatch(/HELLO, STRANGER!/);
    } finally {
      logSpy.mockRestore();
      await fs.remove(dir);
    }
  });

  it('supports the stranger subcommand and reads SECRET_IDENTITY from ctx', async () => {
    const dir = path.join(TROOT, 'case4');
    await fs.remove(dir);
    await writeProject(dir, { plugins: { hello: {} } });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      await withCwd(dir, async () => {
        const run = createCli({
          alias: 'test',
          compose: (p) => p.use(helloPlugin()),
        });
        await run([
          'node',
          'test',
          '--exclude-all',
          '-v',
          'SECRET_IDENTITY=Batman',
          'hello',
          'stranger',
        ]);
      });

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith('My secret identity is Batman.');
    } finally {
      logSpy.mockRestore();
      await fs.remove(dir);
    }
  });
});
