/**
 * #53: the `createCli` runner's argv contract. An explicit argv is user
 * arguments only; `{ from }` selects another convention, as in Commander.
 */
import { describe, expect, it } from 'vitest';

import {
  captureOutput,
  type FixtureRun,
  inFixture,
  probePlugin,
} from '@/test/support/fixtureCli';

import { createCli } from './createCli';

/** Run a host with the probe plugin; return what the probe saw. */
const probe = (
  argv: string[] | undefined,
  from?: 'node' | 'user' | 'electron',
): Promise<Partial<FixtureRun>> =>
  inFixture({}, async () => {
    const rec: Partial<FixtureRun> = {};
    const run = createCli({
      importMetaUrl: import.meta.url,
      alias: 'fixture',
      compose: (p) => p.use(probePlugin(rec)),
    });
    await captureOutput(() =>
      from === undefined ? run(argv) : run(argv, { from }),
    );
    return rec;
  });

describe('createCli runner argv (#53)', () => {
  it('keeps every entry of an args-only argv (the issue repro)', async () => {
    const rec = await probe(['-v', 'APP=hello', 'probe']);
    expect(rec.bag?.vars).toBe('APP=hello');
    expect(rec.ctx?.dotenv.APP).toBe('hello');
  });

  it('keeps a two-entry args-only argv whole', async () => {
    const rec = await probe(['-e', 'dev', 'probe']);
    expect(rec.bag?.env).toBe('dev');
  });

  it("drops two entries with { from: 'node' }", async () => {
    const rec = await probe(['node', 'fixture', '-e', 'dev', 'probe'], 'node');
    expect(rec.bag?.env).toBe('dev');
  });

  it("drops nothing with { from: 'user' }", async () => {
    const rec = await probe(['-e', 'dev', 'probe'], 'user');
    expect(rec.bag?.env).toBe('dev');
  });

  it('reads process.argv when called without an argv', async () => {
    const saved = process.argv;
    process.argv = ['node', 'fixture', '-e', 'qa', 'probe'];
    try {
      const rec = await probe(undefined);
      expect(rec.bag?.env).toBe('qa');
    } finally {
      process.argv = saved;
    }
  });
});
