/**
 * Regression tests for #96 (acceptance addendum, 2026-11-21): a project with
 * `.env` files and no schema anywhere — no config file at all, or a
 * JSON/YAML config with neither `schema` nor `requiredKeys` — must load env
 * vars with zero validation issues, with and without `--strict`.
 */
import { describe, expect, it, vi } from 'vitest';

import { type FixtureRun, runFixtureCli } from '@/test/support/fixtureCli';

const envFile = { '.env': 'FOO=bar\n' };

/** Lines that look like a reported validation issue (`[schema]`/`[requiredKeys]`). */
const issueLines = (run: FixtureRun) =>
  run.output.filter(
    (l) => l.includes('[schema]') || l.includes('[requiredKeys]'),
  );

describe('#96 no schema anywhere: zero validation issues', () => {
  describe('(a) no config files at all', () => {
    it('loads the env with zero issues (no --strict)', async () => {
      const run = await runFixtureCli(['-P', 'probe'], envFile);
      expect(issueLines(run)).toEqual([]);
      expect(run.ctx?.dotenv.FOO).toBe('bar');
    });

    it('loads the env with zero issues and does not exit under --strict', async () => {
      const exit = vi
        .spyOn(process, 'exit')
        .mockImplementation((() => undefined) as never);
      try {
        const run = await runFixtureCli(['-P', '--strict', 'probe'], envFile);
        expect(issueLines(run)).toEqual([]);
        expect(run.ctx?.dotenv.FOO).toBe('bar');
        expect(exit).not.toHaveBeenCalled();
      } finally {
        exit.mockRestore();
      }
    });
  });

  describe('(b) a JSON config with neither schema nor requiredKeys', () => {
    const files = {
      ...envFile,
      'getdotenv.config.json': JSON.stringify({ vars: { BAR: 'baz' } }),
    };

    it('loads the env with zero issues (no --strict)', async () => {
      const run = await runFixtureCli(['-P', 'probe'], files);
      expect(issueLines(run)).toEqual([]);
      expect(run.ctx?.dotenv.FOO).toBe('bar');
      expect(run.ctx?.dotenv.BAR).toBe('baz');
    });

    it('loads the env with zero issues and does not exit under --strict', async () => {
      const exit = vi
        .spyOn(process, 'exit')
        .mockImplementation((() => undefined) as never);
      try {
        const run = await runFixtureCli(['-P', '--strict', 'probe'], files);
        expect(issueLines(run)).toEqual([]);
        expect(run.ctx?.dotenv.FOO).toBe('bar');
        expect(run.ctx?.dotenv.BAR).toBe('baz');
        expect(exit).not.toHaveBeenCalled();
      } finally {
        exit.mockRestore();
      }
    });
  });
});
