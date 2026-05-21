import path from 'node:path';

import fs from 'fs-extra';
import { beforeEach, describe, expect, it } from 'vitest';

import { GetDotenvCli } from './GetDotenvCli';

const ROOT = path.posix.join('.tsbuild', 'defaultEnvKey.tests');

describe('defaultEnvKey pre-pass resolution', () => {
  beforeEach(() => {
    delete process.env.DEFAULT_ENV;
    delete process.env.MY_DEFAULT_ENV;
    delete process.env.APP_SETTING;
    delete process.env.ENV_SETTING;
  });

  it('resolves env from DEFAULT_ENV in global private file when env is not set', async () => {
    const base = path.posix.join(ROOT, 'global-private');
    await fs.remove(base);
    await fs.ensureDir(base);

    // Global public: APP_SETTING
    await fs.writeFile(
      path.posix.join(base, '.testenv'),
      'APP_SETTING=app_value\n',
      { encoding: 'utf-8' },
    );
    // Global private: DEFAULT_ENV=dev
    await fs.writeFile(
      path.posix.join(base, '.testenv.secret'),
      'DEFAULT_ENV=dev\n',
      { encoding: 'utf-8' },
    );
    // Env-scoped public: ENV_SETTING for dev
    await fs.writeFile(
      path.posix.join(base, '.testenv.dev'),
      'ENV_SETTING=from_dev\n',
      { encoding: 'utf-8' },
    );

    try {
      const cli = new GetDotenvCli('test');
      const ctx = await cli.resolveAndLoad({
        dotenvToken: '.testenv',
        privateToken: 'secret',
        paths: [base],
        loadProcess: false,
      });

      // Pre-pass should have picked DEFAULT_ENV=dev from global private,
      // causing the cascade to load .testenv.dev
      expect(ctx.dotenv.ENV_SETTING).toBe('from_dev');
      expect(ctx.dotenv.APP_SETTING).toBe('app_value');
    } finally {
      await fs.remove(base);
    }
  });

  it('resolves env from DEFAULT_ENV in global public file', async () => {
    const base = path.posix.join(ROOT, 'global-public');
    await fs.remove(base);
    await fs.ensureDir(base);

    // Global public: DEFAULT_ENV=staging
    await fs.writeFile(
      path.posix.join(base, '.testenv'),
      'DEFAULT_ENV=staging\n',
      { encoding: 'utf-8' },
    );
    // Env-scoped public for staging
    await fs.writeFile(
      path.posix.join(base, '.testenv.staging'),
      'ENV_SETTING=from_staging\n',
      { encoding: 'utf-8' },
    );

    try {
      const cli = new GetDotenvCli('test');
      const ctx = await cli.resolveAndLoad({
        dotenvToken: '.testenv',
        privateToken: 'secret',
        paths: [base],
        loadProcess: false,
      });

      expect(ctx.dotenv.ENV_SETTING).toBe('from_staging');
    } finally {
      await fs.remove(base);
    }
  });

  it('explicit env wins over DEFAULT_ENV from files', async () => {
    const base = path.posix.join(ROOT, 'explicit-wins');
    await fs.remove(base);
    await fs.ensureDir(base);

    // Global public: DEFAULT_ENV=dev
    await fs.writeFile(path.posix.join(base, '.testenv'), 'DEFAULT_ENV=dev\n', {
      encoding: 'utf-8',
    });
    // Env-scoped for dev
    await fs.writeFile(
      path.posix.join(base, '.testenv.dev'),
      'ENV_SETTING=from_dev\n',
      { encoding: 'utf-8' },
    );
    // Env-scoped for prod
    await fs.writeFile(
      path.posix.join(base, '.testenv.prod'),
      'ENV_SETTING=from_prod\n',
      { encoding: 'utf-8' },
    );

    try {
      const cli = new GetDotenvCli('test');
      const ctx = await cli.resolveAndLoad({
        dotenvToken: '.testenv',
        privateToken: 'secret',
        paths: [base],
        env: 'prod',
        loadProcess: false,
      });

      // Explicit env=prod should win over DEFAULT_ENV=dev
      expect(ctx.dotenv.ENV_SETTING).toBe('from_prod');
    } finally {
      await fs.remove(base);
    }
  });

  it('DEFAULT_ENV from files overrides config-level defaultEnv', async () => {
    const base = path.posix.join(ROOT, 'overrides-config');
    await fs.remove(base);
    await fs.ensureDir(base);

    // Global public: DEFAULT_ENV=dev
    await fs.writeFile(path.posix.join(base, '.testenv'), 'DEFAULT_ENV=dev\n', {
      encoding: 'utf-8',
    });
    // Env-scoped for dev
    await fs.writeFile(
      path.posix.join(base, '.testenv.dev'),
      'ENV_SETTING=from_dev\n',
      { encoding: 'utf-8' },
    );
    // Env-scoped for fallback
    await fs.writeFile(
      path.posix.join(base, '.testenv.fallback'),
      'ENV_SETTING=from_fallback\n',
      { encoding: 'utf-8' },
    );

    try {
      const cli = new GetDotenvCli('test');
      const ctx = await cli.resolveAndLoad({
        dotenvToken: '.testenv',
        privateToken: 'secret',
        paths: [base],
        defaultEnv: 'fallback',
        loadProcess: false,
      });

      // DEFAULT_ENV=dev from file should override defaultEnv=fallback
      expect(ctx.dotenv.ENV_SETTING).toBe('from_dev');
    } finally {
      await fs.remove(base);
    }
  });

  it('falls through to config defaultEnv when DEFAULT_ENV is absent from files', async () => {
    const base = path.posix.join(ROOT, 'fallthrough');
    await fs.remove(base);
    await fs.ensureDir(base);

    // Global public: no DEFAULT_ENV
    await fs.writeFile(
      path.posix.join(base, '.testenv'),
      'APP_SETTING=app_value\n',
      { encoding: 'utf-8' },
    );
    // Env-scoped for fallback
    await fs.writeFile(
      path.posix.join(base, '.testenv.fallback'),
      'ENV_SETTING=from_fallback\n',
      { encoding: 'utf-8' },
    );

    try {
      const cli = new GetDotenvCli('test');
      const ctx = await cli.resolveAndLoad({
        dotenvToken: '.testenv',
        privateToken: 'secret',
        paths: [base],
        defaultEnv: 'fallback',
        loadProcess: false,
      });

      // No DEFAULT_ENV in files → should fall through to config defaultEnv
      expect(ctx.dotenv.ENV_SETTING).toBe('from_fallback');
    } finally {
      await fs.remove(base);
    }
  });

  it('treats empty-string DEFAULT_ENV as unset and falls through', async () => {
    const base = path.posix.join(ROOT, 'empty-string');
    await fs.remove(base);
    await fs.ensureDir(base);

    // Global public: DEFAULT_ENV set to empty string
    await fs.writeFile(path.posix.join(base, '.testenv'), 'DEFAULT_ENV=\n', {
      encoding: 'utf-8',
    });
    // Env-scoped for fallback
    await fs.writeFile(
      path.posix.join(base, '.testenv.fallback'),
      'ENV_SETTING=from_fallback\n',
      { encoding: 'utf-8' },
    );

    try {
      const cli = new GetDotenvCli('test');
      const ctx = await cli.resolveAndLoad({
        dotenvToken: '.testenv',
        privateToken: 'secret',
        paths: [base],
        defaultEnv: 'fallback',
        loadProcess: false,
      });

      // Empty DEFAULT_ENV should be treated as unset → falls through to defaultEnv
      expect(ctx.dotenv.ENV_SETTING).toBe('from_fallback');
    } finally {
      await fs.remove(base);
    }
  });

  it('pre-pass is immune to excludeGlobal and result does not contaminate output', async () => {
    const base = path.posix.join(ROOT, 'exclude-global');
    await fs.remove(base);
    await fs.ensureDir(base);

    // Global public: DEFAULT_ENV=dev and GLOBAL_ONLY=should_not_appear
    await fs.writeFile(
      path.posix.join(base, '.testenv'),
      'DEFAULT_ENV=dev\nGLOBAL_ONLY=should_not_appear\n',
      { encoding: 'utf-8' },
    );
    // Env-scoped public for dev
    await fs.writeFile(
      path.posix.join(base, '.testenv.dev'),
      'ENV_SETTING=from_dev\n',
      { encoding: 'utf-8' },
    );

    try {
      const cli = new GetDotenvCli('test');
      const ctx = await cli.resolveAndLoad({
        dotenvToken: '.testenv',
        privateToken: 'secret',
        paths: [base],
        excludeGlobal: true,
        loadProcess: false,
      });

      // Pre-pass should still resolve DEFAULT_ENV=dev despite excludeGlobal
      expect(ctx.dotenv.ENV_SETTING).toBe('from_dev');
      // But global values from the pre-pass should NOT leak into output
      expect(ctx.dotenv.GLOBAL_ONLY).toBeUndefined();
      expect(ctx.dotenv.DEFAULT_ENV).toBeUndefined();
    } finally {
      await fs.remove(base);
    }
  });

  it('supports custom defaultEnvKey', async () => {
    const base = path.posix.join(ROOT, 'custom-key');
    await fs.remove(base);
    await fs.ensureDir(base);

    // Global public: MY_DEFAULT_ENV=test
    await fs.writeFile(
      path.posix.join(base, '.testenv'),
      'MY_DEFAULT_ENV=test\n',
      { encoding: 'utf-8' },
    );
    // Env-scoped for test
    await fs.writeFile(
      path.posix.join(base, '.testenv.test'),
      'ENV_SETTING=from_test\n',
      { encoding: 'utf-8' },
    );

    try {
      const cli = new GetDotenvCli('test');
      const ctx = await cli.resolveAndLoad({
        dotenvToken: '.testenv',
        privateToken: 'secret',
        paths: [base],
        defaultEnvKey: 'MY_DEFAULT_ENV',
        loadProcess: false,
      });

      expect(ctx.dotenv.ENV_SETTING).toBe('from_test');
    } finally {
      await fs.remove(base);
    }
  });
});
