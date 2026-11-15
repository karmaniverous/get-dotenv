// src/e2e/gitStatus.script.test.ts
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { execa } from 'execa';
import { afterAll, describe, expect, it } from 'vitest';

// The scratch repo lives under the checkout so `--import tsx` and the
// tsconfig still resolve from its cwd; `git init` makes it its own repo.
//
// The built-in `git-status` script runs with `shell: true`, which is the OS
// default shell (#51): powershell.exe on Windows, /bin/bash elsewhere. Its
// command must work under both (#51 follow-up: PowerShell 5.1 has no `&&`).

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const cli = path.join(repoRoot, 'src', 'cli', 'getdotenv');
const work = path.join(repoRoot, '.tsbuild', 'e2e-git-status');

// #51 (follow-up): the test needs a real `git`; skip only when it is missing.
const hasGit = spawnSync('git', ['--version']).status === 0;

describe('E2E built-in git-status script (#51 follow-up)', () => {
  afterAll(() => {
    rmSync(work, { recursive: true, force: true });
  });

  it.skipIf(!hasGit)(
    'runs under the default shell and prints the branch line and untracked files',
    async () => {
      rmSync(work, { recursive: true, force: true });
      mkdirSync(work, { recursive: true });
      const init = spawnSync('git', ['init', '-q'], { cwd: work });
      expect(init.status).toBe(0);
      writeFileSync(path.join(work, 'untracked.txt'), 'x\n');

      const { stdout, exitCode } = await execa(
        process.execPath,
        ['--import', 'tsx', cli, 'cmd', 'git-status'],
        {
          cwd: work,
          env: { ...process.env, GETDOTENV_STDIO: 'pipe' },
          reject: false,
        },
      );

      expect(exitCode).toBe(0);
      expect(stdout).toMatch(/^## /m);
      expect(stdout).toMatch(/^\?\? untracked\.txt$/m);
    },
  );
});
