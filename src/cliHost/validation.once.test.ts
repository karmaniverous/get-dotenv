/**
 * Regression tests for #61: env validation (`requiredKeys`/`schema`) runs
 * once per invocation, so each issue is reported once.
 */
import { describe, expect, it } from 'vitest';

import { cmdPlugin } from '@/src/plugins/cmd';
import { type FixtureRun, runFixtureCli } from '@/test/support/fixtureCli';

import type { GetDotenvCli } from './GetDotenvCli';

const files = {
  'getdotenv.config.json': JSON.stringify({ requiredKeys: ['MISSING_KEY'] }),
};

const reports = (run: FixtureRun) =>
  run.output.filter((l) => l.includes('[requiredKeys] missing: MISSING_KEY'))
    .length;

const withCmd = {
  compose: (p: GetDotenvCli) =>
    p.use(
      cmdPlugin({ asDefault: true, optionAlias: '-c, --cmd <command...>' }),
    ),
};

describe('#61 env validation runs once', () => {
  it('the issue repro: a subcommand run reports a missing key once', async () => {
    const run = await runFixtureCli(['-P', 'probe'], files);
    expect(reports(run)).toBe(1);
  });

  it('a nested subcommand run reports it once', async () => {
    const run = await runFixtureCli(
      ['-P', '-S', 'cmd', 'node', '-e', '0'],
      files,
      withCmd,
    );
    expect(reports(run)).toBe(1);
  });

  it('a root action (the -c alias) reports it once', async () => {
    const run = await runFixtureCli(['-P', '-c', 'node -e 0'], files, withCmd);
    expect(reports(run)).toBe(1);
  });

  it('a valid env reports nothing', async () => {
    const run = await runFixtureCli(
      ['-P', '-v', 'MISSING_KEY=1', 'probe'],
      files,
    );
    expect(reports(run)).toBe(0);
  });
});
