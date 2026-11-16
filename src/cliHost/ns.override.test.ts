/**
 * Regression tests for #44: `.use(plugin, { ns })` mounts the plugin at the
 * override, keys its config slice by the realized mount path, and scopes its
 * `afterResolve` hook by that path. Sibling collisions get the guided
 * duplicate-namespace error at every level, the root included.
 */
import fs from 'fs-extra';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createCli } from '@/src/cli';

import { definePlugin } from './definePlugin';
import { GetDotenvCli } from './GetDotenvCli';

const TROOT = path.resolve(
  '.tsbuild',
  `ns-override-tests.${String(process.pid)}.${process.env.VITEST_WORKER_ID ?? '0'}`,
);

/** Events recorded by the fixture plugins: `<kind>:<label>[:<target>]`. */
const events: string[] = [];

/**
 * The #44 repro plugin. Each call is a fresh instance with default ns
 * `deploy`, a typed config slice, an afterResolve hook and a `go` action that
 * reads the instance's config.
 */
const deployPlugin = (label = 'deploy') => {
  const p = definePlugin({
    ns: 'deploy',
    configSchema: z.object({ target: z.string().optional() }),
    setup(cli) {
      cli
        .command('go')
        .description('deploy')
        .action(() => {
          events.push(`go:${label}:${p.readConfig(cli).target ?? '-'}`);
        });
    },
    afterResolve() {
      events.push(`afterResolve:${label}`);
    },
  });
  return p;
};

/** A plain parent plugin with an afterResolve hook. */
const parentPlugin = () =>
  definePlugin({
    ns: 'parent',
    setup: () => undefined,
    afterResolve() {
      events.push('afterResolve:parent');
    },
  });

type CommandNode = { name: () => string; commands: readonly CommandNode[] };

const names = (cmd: CommandNode): string[] => cmd.commands.map((c) => c.name());

const child = (cmd: CommandNode, name: string): CommandNode => {
  const found = cmd.commands.find((c) => c.name() === name);
  if (!found) throw new Error(`no command '${name}'`);
  return found;
};

const writeProject = async (dir: string, plugins: Record<string, unknown>) => {
  await fs.ensureDir(dir);
  await fs.writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'ns-override-tests' }),
    'utf-8',
  );
  await fs.writeFile(
    path.join(dir, 'getdotenv.config.json'),
    JSON.stringify({ plugins }, null, 2),
    'utf-8',
  );
};

describe('cliHost .use(plugin, { ns }) overrides (#44)', () => {
  let prevCwd = '';
  let dir = '';

  beforeEach(async (t) => {
    events.length = 0;
    prevCwd = process.cwd();
    dir = path.join(TROOT, t.task.id);
    await fs.remove(dir);
    await writeProject(dir, {
      deploy: { target: 'default' },
      'deploy-api': { target: 'api' },
      'deploy-web': { target: 'web' },
      'parent/who2': { target: 'who2' },
      'parent/deploy': { target: 'nested-default' },
    });
    process.chdir(dir);
  });

  afterEach(async () => {
    process.chdir(prevCwd);
    await fs.remove(dir);
  });

  describe('mount (A1)', () => {
    it('mounts two instances of one plugin at sibling overrides', async () => {
      const cli = new GetDotenvCli('test')
        .use(deployPlugin(), { ns: 'deploy-api' })
        .use(deployPlugin(), { ns: 'deploy-web' });
      await cli.install();

      expect(names(cli)).toEqual(['deploy-api', 'deploy-web']);
    });

    it('mounts a child override under its parent plugin', async () => {
      const cli = new GetDotenvCli('test').use(
        parentPlugin().use(deployPlugin(), { ns: 'who2' }).use(deployPlugin()),
      );
      await cli.install();

      expect(names(child(cli, 'parent'))).toEqual(['who2', 'deploy']);
    });
  });

  describe('config slices (A2)', () => {
    it('keys each sibling instance by its override', async () => {
      const api = deployPlugin();
      const web = deployPlugin();
      const cli = new GetDotenvCli('test')
        .use(api, { ns: 'deploy-api' })
        .use(web, { ns: 'deploy-web' });

      const ctx = await cli.resolveAndLoad({ paths: [], loadProcess: false });

      expect(api.readConfig(cli)).toEqual({ target: 'api' });
      expect(web.readConfig(cli)).toEqual({ target: 'web' });
      expect(Object.keys(ctx.pluginConfigs ?? {}).sort()).toEqual([
        'deploy-api',
        'deploy-web',
      ]);
    });

    it('keys a nested override by the parent path and the override', async () => {
      const renamed = deployPlugin();
      const plain = deployPlugin();
      const cli = new GetDotenvCli('test').use(
        parentPlugin().use(renamed, { ns: 'who2' }).use(plain),
      );

      const ctx = await cli.resolveAndLoad({ paths: [], loadProcess: false });

      expect(renamed.readConfig(cli)).toEqual({ target: 'who2' });
      expect(plain.readConfig(cli)).toEqual({ target: 'nested-default' });
      expect(Object.keys(ctx.pluginConfigs ?? {}).sort()).toEqual([
        'parent',
        'parent/deploy',
        'parent/who2',
      ]);
    });
  });

  describe('afterResolve scoping (A3)', () => {
    const siblings = () =>
      createCli({
        importMetaUrl: import.meta.url,
        alias: 'test',
        compose: (p) =>
          p
            .use(deployPlugin('api'), { ns: 'deploy-api' })
            .use(deployPlugin('web'), { ns: 'deploy-web' }),
      });

    it('runs the invoked sibling override only, with its own config', async () => {
      await siblings()(['deploy-api', 'go']);
      expect(events).toEqual(['afterResolve:api', 'go:api:api']);

      events.length = 0;
      await siblings()(['deploy-web', 'go']);
      expect(events).toEqual(['afterResolve:web', 'go:web:web']);
    });

    it('runs the parent and the invoked nested override only', async () => {
      const run = createCli({
        importMetaUrl: import.meta.url,
        alias: 'test',
        compose: (p) =>
          p.use(
            parentPlugin()
              .use(deployPlugin('who2'), { ns: 'who2' })
              .use(deployPlugin('plain')),
          ),
      });

      await run(['parent', 'who2', 'go']);

      expect(events).toEqual([
        'afterResolve:parent',
        'afterResolve:who2',
        'go:who2:who2',
      ]);
    });
  });

  describe('duplicate namespaces', () => {
    it('gives the guided error for root siblings with one default ns', async () => {
      const cli = new GetDotenvCli('test')
        .use(deployPlugin())
        .use(deployPlugin());

      await expect(cli.install()).rejects.toThrow(
        "Duplicate namespace 'deploy' under 'root'. Override via .use(plugin, { ns: '...' }).",
      );
      expect(names(cli)).toEqual([]);
    });

    it('gives the guided error when an override collides with a default ns', async () => {
      const cli = new GetDotenvCli('test')
        .use(deployPlugin())
        .use(parentPlugin(), { ns: 'deploy' });

      await expect(cli.install()).rejects.toThrow(
        /^Duplicate namespace 'deploy' under 'root'\./,
      );
    });

    it('names the realized parent path for a nested collision at install', async () => {
      const inner = parentPlugin();
      inner.children.push(
        { plugin: deployPlugin(), override: { ns: 'x' } },
        { plugin: deployPlugin(), override: { ns: 'x' } },
      );
      const cli = new GetDotenvCli('test').use(
        parentPlugin().use(inner, { ns: 'inner' }),
        { ns: 'outer' },
      );

      await expect(cli.install()).rejects.toThrow(
        /^Duplicate namespace 'x' under 'outer\/inner'\./,
      );
    });

    it('lets one default ns be reused when the siblings are overridden', async () => {
      const cli = new GetDotenvCli('test')
        .use(deployPlugin())
        .use(deployPlugin(), { ns: 'deploy-web' });
      await cli.install();

      expect(names(cli)).toEqual(['deploy', 'deploy-web']);
    });
  });
});
