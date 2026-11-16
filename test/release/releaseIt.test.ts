/**
 * #41, #42: the release-it config in `package.json`.
 *
 * The `github` block is merged over release-it's own defaults, as release-it
 * merges it, and its templates are rendered by release-it's own `format()`
 * (Eta, `${...}` tags) with the context release-it gives them. The release
 * notes command is then run (git-cliff, the repo's `cliff.toml`) in a
 * throwaway repository, both before the release tag exists (release-it's
 * `beforeRelease`) and after it.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

interface GithubConfig {
  releaseName: string;
  releaseNotes: string | null;
}

interface PackageJson {
  name: string;
  'release-it': { github: Partial<GithubConfig> };
}

const pkg = JSON.parse(
  readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
) as PackageJson;

const releaseItRoot = path.dirname(
  fileURLToPath(import.meta.resolve('release-it/package.json')),
);

/** release-it's defaults (`config/release-it.json`). */
const defaults = JSON.parse(
  readFileSync(path.join(releaseItRoot, 'config', 'release-it.json'), 'utf8'),
) as { github: GithubConfig };

/** The effective `github` options: the local config over the defaults. */
const github: GithubConfig = {
  ...defaults.github,
  ...pkg['release-it'].github,
};

type Format = (template: string, context: Record<string, unknown>) => string;

/** release-it's template renderer (not exported; loaded by file URL). */
let format: Format;

/** git-cliff's CLI entry. */
const cliffCli = fileURLToPath(import.meta.resolve('git-cliff/cli'));

let repo: string;

const git = (...args: string[]): string =>
  execFileSync(
    'git',
    [
      '-c',
      'user.name=Release Test',
      '-c',
      'user.email=release-test@example.com',
      '-c',
      'commit.gpgsign=false',
      '-c',
      'tag.gpgsign=false',
      ...args,
    ],
    { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );

/**
 * Render the release notes command for `context` and run it in `repo`, as
 * release-it's `beforeRelease` does (`npx git-cliff ...`, run with the local
 * git-cliff).
 */
const releaseNotes = (context: Record<string, unknown>): string => {
  expect(typeof github.releaseNotes).toBe('string');
  const command = format(github.releaseNotes as string, context);
  expect(command).toMatch(/^npx git-cliff /);
  expect(command).not.toMatch(/["'\\]/); // plain words: split on spaces
  const args = command.split(' ').slice(2);
  return execFileSync(process.execPath, [cliffCli, ...args], {
    cwd: repo,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
};

beforeAll(async () => {
  ({ format } = (await import(
    pathToFileURL(path.join(releaseItRoot, 'lib', 'util.js')).href
  )) as { format: Format });
  repo = mkdtempSync(path.join(os.tmpdir(), 'gdv-release-'));
  copyFileSync(
    path.join(repoRoot, 'cliff.toml'),
    path.join(repo, 'cliff.toml'),
  );
  git('init', '-q');
  git('commit', '-q', '--allow-empty', '-m', 'feat: first feature');
  git('tag', 'v1.0.0');
  git('commit', '-q', '--allow-empty', '-m', 'fix: second fix');
});

afterAll(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe('release-it config (#41, #42)', () => {
  it('#42 names the GitHub release <package>@<version>', () => {
    const name = format(github.releaseName, {
      name: pkg.name,
      version: '8.0.0',
    });
    expect(pkg.name).toBe('@karmaniverous/get-dotenv');
    expect(name).toBe('get-dotenv@8.0.0');
  });

  it('#41 release notes cover the version being released, before its tag exists', () => {
    // release-it's context in beforeRelease: the new version; latestTag is
    // still the previous release.
    const notes = releaseNotes({ version: '1.1.0', latestTag: 'v1.0.0' });
    expect(notes).toMatch(
      /^## \[1\.1\.0\]\(.*\/compare\/v1\.0\.0\.\.\.v1\.1\.0\)/,
    );
    expect(notes).toContain('Second fix');
    expect(notes).not.toContain('First feature');
    expect(notes).not.toContain('[Unreleased]');
    expect(notes).not.toContain('# Changelog');
  });

  it('#41 release notes still cover the release once its tag exists', () => {
    git('tag', 'v1.1.0');
    try {
      const notes = releaseNotes({ version: '1.1.0', latestTag: 'v1.0.0' });
      expect(notes).toMatch(/^## \[1\.1\.0\]/);
      expect(notes).toContain('Second fix');
      expect(notes).not.toContain('First feature');
    } finally {
      git('tag', '-d', 'v1.1.0');
    }
  });
});
