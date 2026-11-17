/**
 * Regression tests for #64: a run composes its dotenv context once, the
 * lazy resolver runs only on bare hosts, and `-z` covers that composition.
 */
import { describe, expect, it } from 'vitest';

import { cmdPlugin } from '@/src/plugins/cmd';
import {
  captureOutput,
  inFixture,
  probePlugin,
  runFixtureCli,
} from '@/test/support/fixtureCli';

import type { FixtureRun } from '../../test/support/fixtureCli';
import { definePlugin } from './definePlugin';
import { GetDotenvCli } from './GetDotenvCli';
import { installRootHooks } from './rootHooks';
import type { GetDotenvCliCtx } from './types';

const files = {
  '.env': 'APP=base\n',
  'getdotenv.config.mjs': [
    'export default {',
    '  dynamic: {',
    "    DYN: () => { console.error('DYN-EVAL'); return 'dyn'; },",
    '  },',
    '};',
    '',
  ].join('\n'),
};

const evals = (run: FixtureRun) =>
  run.output.filter((l) => l === 'DYN-EVAL').length;

const withCmd = {
  compose: (p: GetDotenvCli) =>
    p.use(
      cmdPlugin({ asDefault: true, optionAlias: '-c, --cmd <command...>' }),
    ),
};

describe('#64 one context composition per run', () => {
  it('the issue repro: a subcommand run evaluates the config dynamic once', async () => {
    const run = await runFixtureCli(['probe'], files);
    expect(run.ctx?.dotenv.DYN).toBe('dyn');
    expect(evals(run)).toBe(1);
  });

  it('-z stops every evaluation', async () => {
    const run = await runFixtureCli(['-z', 'probe'], files);
    expect(run.ctx?.dotenv.DYN).toBeUndefined();
    expect(evals(run)).toBe(0);
  });

  it('the -c alias composes once (not three times)', async () => {
    const run = await runFixtureCli(['-c', 'node -e 0'], files, withCmd);
    expect(run.error).toBeUndefined();
    expect(evals(run)).toBe(1);
  });

  it('the cmd subcommand composes once', async () => {
    const run = await runFixtureCli(
      ['-S', 'cmd', 'node', '-e', '0'],
      files,
      withCmd,
    );
    expect(evals(run)).toBe(1);
  });

  it('a second parse of the same host composes again (once each)', async () => {
    await inFixture(files, async () => {
      const rec: Partial<FixtureRun> = {};
      const cli = new GetDotenvCli('hooked').attachRootOptions();
      installRootHooks(cli, {});
      cli.use(probePlugin(rec));
      await cli.install();
      for (const env of ['one', 'two']) {
        const { output } = await captureOutput(() =>
          cli.parseAsync(['node', 'hooked', '-e', env, 'probe']),
        );
        expect(output.filter((l) => l === 'DYN-EVAL')).toHaveLength(1);
        expect(rec.ctx?.env).toBe(env);
      }
    });
  });

  it('a root-only parse composes in preAction, not from an earlier parse', async () => {
    await inFixture(files, async () => {
      const cli = new GetDotenvCli('hooked').attachRootOptions();
      installRootHooks(cli, {});
      await cli.install();
      for (const env of ['one', 'two']) {
        const { output } = await captureOutput(() =>
          cli.parseAsync(['node', 'hooked', '-e', env]),
        );
        expect(output.filter((l) => l === 'DYN-EVAL')).toHaveLength(1);
        expect(cli.getCtx().env).toBe(env);
      }
    });
  });

  it('a bare host (no root hooks) still gets its lazy context', async () => {
    await inFixture(files, async () => {
      let ctx: GetDotenvCliCtx | undefined;
      const cli = new GetDotenvCli('bare').attachRootOptions();
      cli.use(
        definePlugin({
          ns: 'peek',
          setup(child) {
            child.action(() => {
              ctx = child.getCtx();
            });
          },
        }),
      );
      await cli.install();
      const { output } = await captureOutput(() =>
        cli.parseAsync(['node', 'bare', 'peek']),
      );
      expect(ctx?.dotenv.APP).toBe('base');
      expect(output.filter((l) => l === 'DYN-EVAL')).toHaveLength(1);
    });
  });
});
