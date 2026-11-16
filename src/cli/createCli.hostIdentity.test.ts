/**
 * Host identity (Decision 23): regression tests for #52.
 *
 * #52: a `createCli` host passes its own `import.meta.url`; its package root
 * (the nearest `package.json` above it) supplies the packaged config layer,
 * the version and the description. get-dotenv's own packaged layer no longer
 * applies to it, and when the host root is the project root the packaged
 * layer is skipped so the same file isn't applied twice. A direct
 * `GetDotenvCli` host sets its root through the constructor or
 * `brand({ importMetaUrl })`.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterAll, describe, expect, it, vi } from 'vitest';

import { createCli, type CreateCliOptions } from '@/src/cli';
import { GetDotenvCli } from '@/src/cliHost';
import {
  discoverConfigFiles,
  resolveGetDotenvConfigSources,
} from '@/src/config';
import type * as LoaderModule from '@/src/config/loader';
import { initPlugin } from '@/src/plugins';
import {
  captureOutput,
  type FixtureRun,
  inFixture,
  probePlugin,
  runFixtureCli,
  withEnv,
} from '@/test/support/fixtureCli';

vi.mock('@/src/config/loader', async (importOriginal) => {
  const actual = await importOriginal<typeof LoaderModule>();
  return {
    ...actual,
    resolveGetDotenvConfigSources: vi.fn(actual.resolveGetDotenvConfigSources),
  };
});

/** A fixture host package: version 9.9.9, a description, packaged config. */
const hostDir = mkdtempSync(path.join(os.tmpdir(), 'gdv-host-'));
mkdirSync(path.join(hostDir, 'dist'), { recursive: true });
writeFileSync(
  path.join(hostDir, 'package.json'),
  JSON.stringify({
    name: 'fixture-host',
    version: '9.9.9',
    description: 'Fixture host CLI.',
    type: 'module',
  }),
);
writeFileSync(
  path.join(hostDir, 'getdotenv.config.json'),
  JSON.stringify({
    rootOptionDefaults: { defaultEnv: 'hostdefault' },
    vars: { HOST_PACKAGED: 'from-host' },
  }),
);
writeFileSync(path.join(hostDir, 'dist', 'cli.js'), '');
const hostUrl = pathToFileURL(path.join(hostDir, 'dist', 'cli.js')).href;

afterAll(() => {
  rmSync(hostDir, { recursive: true, force: true });
});

/** Thrown by the `process.exit` stand-in. */
class ExitSignal extends Error {}

/** Run `fn` with `process.exit` stubbed and stdout captured. */
const withStdout = async (fn: () => Promise<unknown>): Promise<string> => {
  let out = '';
  const prevExitCode = process.exitCode;
  const write = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk) => {
      out += String(chunk);
      return true;
    });
  const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
    throw new ExitSignal();
  });
  try {
    await captureOutput(async () => {
      try {
        await fn();
      } catch (e) {
        if (!(e instanceof ExitSignal)) throw e;
      }
    });
  } finally {
    write.mockRestore();
    exit.mockRestore();
    process.exitCode = prevExitCode;
  }
  return out;
};

describe('#52 createCli host identity', () => {
  it('throws a clear error when importMetaUrl is missing', () => {
    expect(() =>
      createCli({ alias: 'x' } as unknown as CreateCliOptions),
    ).toThrow(/createCli requires importMetaUrl/);
    expect(() => createCli({ importMetaUrl: '' })).toThrow(
      /createCli requires importMetaUrl/,
    );
  });

  it("--version prints the host package's version", async () => {
    const out = await inFixture({}, async () =>
      withStdout(() =>
        createCli({ importMetaUrl: hostUrl, alias: 'host' })(['--version']),
      ),
    );
    expect(out.trim()).toBe('9.9.9');
  });

  it("help shows the host package's description and version", async () => {
    let program: GetDotenvCli | undefined;
    const run = await runFixtureCli(
      ['probe'],
      {},
      {
        importMetaUrl: hostUrl,
        alias: 'host',
        compose: (p) => (program = p),
      },
    );
    expect(run.error).toBeUndefined();
    expect(program?.description()).toBe('Fixture host CLI.');
    expect(program?.version()).toBe('9.9.9');
    let help = '';
    program?.configureOutput({
      writeOut: (s) => {
        help += s;
      },
    });
    program?.outputHelp();
    expect(help).toMatch(/^host v9\.9\.9\n/);
    expect(help).toContain('\n\nFixture host CLI.\n');
  });

  it('the version and description options override package.json', async () => {
    let program: GetDotenvCli | undefined;
    await runFixtureCli(
      [],
      {},
      {
        importMetaUrl: hostUrl,
        version: '1.2.3',
        description: 'Overridden.',
        compose: (p) => (program = p),
      },
    );
    expect(program?.version()).toBe('1.2.3');
    expect(program?.description()).toBe('Overridden.');
  });

  it("the host's packaged config applies and get-dotenv's packaged layer doesn't", async () => {
    vi.mocked(resolveGetDotenvConfigSources).mockClear();
    const run = await runFixtureCli(['probe'], {}, { importMetaUrl: hostUrl });
    expect(run.error).toBeUndefined();
    expect(run.bag?.defaultEnv).toBe('hostdefault');
    expect(run.ctx?.dotenv.HOST_PACKAGED).toBe('from-host');
    // Every config discovery in the run is from the host root, never
    // get-dotenv's own root.
    const urls = vi
      .mocked(resolveGetDotenvConfigSources)
      .mock.calls.map(([u]) => u);
    expect(urls.length).toBeGreaterThan(0);
    expect(new Set(urls)).toEqual(new Set([hostUrl]));
  });

  it('top-level -h reads config from the host root and shows its description', async () => {
    vi.mocked(resolveGetDotenvConfigSources).mockClear();
    const out = await inFixture({}, () =>
      withEnv({ GETDOTENV_STDOUT: 'pipe' }, () =>
        withStdout(() =>
          createCli({ importMetaUrl: hostUrl, alias: 'host' })(['-h']),
        ),
      ),
    );
    expect(out).toMatch(/^host v9\.9\.9\n/);
    expect(out).toContain('\n\nFixture host CLI.\n');
    // Help-time defaults and visibility (one discovery), then the context.
    const urls = vi
      .mocked(resolveGetDotenvConfigSources)
      .mock.calls.map(([u]) => u);
    expect(urls).toEqual([hostUrl, hostUrl]);
  });
});

describe('#52 host root = project root (D23 addendum)', () => {
  const files = {
    'getdotenv.config.js':
      'export default { dynamic: { DYN: () => { globalThis.__gdvDynCount = (globalThis.__gdvDynCount ?? 0) + 1; return "x"; } } };\n',
  };

  it('discovery skips the packaged layer when it is the project root', async () => {
    await inFixture(files, async (dir) => {
      const url = pathToFileURL(path.join(dir, 'cli.js')).href;
      const found = await discoverConfigFiles(url);
      expect(found.map((f) => f.scope)).toEqual(['project']);
    });
  });

  it("a repo-local host's config dynamic runs once, not twice", async () => {
    await inFixture(files, async (dir) => {
      const g = globalThis as { __gdvDynCount?: number };
      g.__gdvDynCount = 0;
      const rec: Partial<FixtureRun> = {};
      await captureOutput(() =>
        createCli({
          importMetaUrl: pathToFileURL(path.join(dir, 'cli.js')).href,
          alias: 'local',
          compose: (p) => p.use(probePlugin(rec)),
        })(['probe']),
      );
      expect(rec.ctx?.dotenv.DYN).toBe('x');
      expect(g.__gdvDynCount).toBe(1);
    });
  });

  it('a different host root still gives a packaged layer', async () => {
    await inFixture({}, async () => {
      const found = await discoverConfigFiles(hostUrl);
      expect(found.map((f) => [f.scope, path.dirname(f.path)])).toEqual([
        ['packaged', hostDir],
      ]);
    });
  });
});

describe('#52 init under a host keeps get-dotenv templates', () => {
  it("scaffolds from get-dotenv's own templates, and the host template passes importMetaUrl", async () => {
    await inFixture({}, async (dir) => {
      await captureOutput(() =>
        createCli({
          importMetaUrl: hostUrl,
          alias: 'host',
          compose: (p) => p.use(initPlugin()),
        })(['init', '.', '--cli-name', 'acme', '--force']),
      );
      const index = await readFile(
        path.join(dir, 'src', 'cli', 'acme', 'index.ts'),
        'utf-8',
      );
      expect(index).toContain('importMetaUrl: import.meta.url');
    });
  });
});

describe('#52 GetDotenvCli host root (direct hosts)', () => {
  /** The packaged value a direct host's resolveAndLoad() sees. */
  const packagedSeen = (cli: GetDotenvCli) =>
    inFixture({}, async () => {
      const ctx = await cli.resolveAndLoad(
        { loadProcess: false },
        { runAfterResolve: false },
      );
      return ctx.dotenv.HOST_PACKAGED;
    });

  it('the constructor sets the host root', async () => {
    const cli = new GetDotenvCli('direct', { importMetaUrl: hostUrl });
    expect(await packagedSeen(cli)).toBe('from-host');
  });

  it('brand({ importMetaUrl }) sets it, and the last one given wins', async () => {
    const cli = new GetDotenvCli('direct', { importMetaUrl: hostUrl });
    await cli.brand({ importMetaUrl: import.meta.url });
    expect(await packagedSeen(cli)).toBeUndefined();
    await cli.brand({ importMetaUrl: hostUrl });
    expect(await packagedSeen(cli)).toBe('from-host');
    expect(cli.version()).toBe('9.9.9');
  });

  it("a direct host that gives none keeps get-dotenv's own root", async () => {
    const cli = new GetDotenvCli('direct');
    expect(await packagedSeen(cli)).toBeUndefined();
  });
});
