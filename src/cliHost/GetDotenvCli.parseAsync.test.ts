/**
 * `GetDotenvCli.parseAsync` (spec 4.4, "Where it runs"): every host
 * normalizes, `createCli` or not; `{ from }` as in Commander; errors through
 * `this.error()`; the `[getdotenv:argv]` debug line; sync `parse()` throws.
 */
import { CommanderError } from '@commander-js/extra-typings';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { captureOutput, inFixture } from '@/test/support/fixtureCli';
import { vcProgram } from '@/test/support/qualifiedHosts';

import { GetDotenvCli } from './GetDotenvCli';
import { runArgvRequestsDebug } from './parseHost';

/** A direct host (no createCli) with one subcommand that records. */
const directHost = () => {
  const seen: { greet?: Record<string, unknown>; args?: string[] } = {};
  const host = new GetDotenvCli('tool');
  host.enablePositionalOptions().option('--level <n>', 'root level');
  host
    .command('greet')
    .option('--loud', 'shout')
    .option('--name <who>', 'who')
    .argument('[rest...]')
    .action((_rest, opts, cmd) => {
      seen.greet = opts;
      seen.args = cmd.args;
    });
  host.exitOverride();
  host.configureOutput({
    writeOut: () => undefined,
    writeErr: () => undefined,
  });
  return { host, seen };
};

const savedDebug = process.env.GETDOTENV_DEBUG;
afterEach(() => {
  if (savedDebug === undefined) delete process.env.GETDOTENV_DEBUG;
  else process.env.GETDOTENV_DEBUG = savedDebug;
  vi.restoreAllMocks();
});

describe('parseAsync on a direct host (no createCli)', () => {
  it('normalizes qualified options to their owners', async () => {
    const { host, seen } = directHost();
    await host.parseAsync(['greet', 'x', '--tool-greet-name', 'ann'], {
      from: 'user',
    });
    expect(seen.greet).toEqual({ name: 'ann' });
    expect(seen.args).toEqual(['x']);
    expect((host as unknown as { rawArgs: string[] }).rawArgs).toEqual([
      'greet',
      '--name=ann',
      'x',
    ]);
  });

  it("honours { from }: 'node' (the default for an explicit argv), 'user', 'electron'", async () => {
    const a = directHost();
    await a.host.parseAsync(['node', 'tool', 'greet', '--tool-greet-loud']);
    expect(a.seen.greet).toEqual({ loud: true });
    const b = directHost();
    await b.host.parseAsync(['greet', '--loud'], { from: 'user' });
    expect(b.seen.greet).toEqual({ loud: true });
    const c = directHost();
    await c.host.parseAsync(['app', 'greet', '--loud'], { from: 'electron' });
    expect(c.seen.greet).toEqual({ loud: true });
  });

  it('reads process.argv when argv is omitted', async () => {
    const saved = process.argv;
    process.argv = ['node', 'tool', 'greet', '--tool-greet-name=bo'];
    try {
      const { host, seen } = directHost();
      await host.parseAsync();
      expect(seen.greet).toEqual({ name: 'bo' });
    } finally {
      process.argv = saved;
    }
  });

  it('reports a normalization error through this.error() (exit 1, exitOverride)', async () => {
    const { host } = directHost();
    const err = await host
      .parseAsync(['greet', '--tool-greet-nope'], { from: 'user' })
      .then(
        () => undefined,
        (e: unknown) => e,
      );
    expect(err).toBeInstanceOf(CommanderError);
    expect(err).toMatchObject({
      exitCode: 1,
      code: 'commander.error',
      message:
        "Unknown option '--tool-greet-nope' (the '--tool-' prefix is reserved for tool)",
    });
  });

  it('writes the message to the error output, as Commander usage errors do', async () => {
    const host = new GetDotenvCli('tool');
    host.command('greet').action(() => undefined);
    host.exitOverride();
    const writeErr = vi.fn();
    host.configureOutput({ writeErr, writeOut: () => undefined });
    await expect(
      host.parseAsync(['--tool-greet-x=1'], { from: 'user' }),
    ).rejects.toMatchObject({ exitCode: 1 });
    expect(writeErr).toHaveBeenCalledWith(
      "Unknown option '--tool-greet-x' (the '--tool-' prefix is reserved for tool)\n",
    );
  });

  it('a non-normalization error from install passes through', async () => {
    const host = new GetDotenvCli('tool');
    host.use({
      ns: 'bad',
      setup() {
        throw new Error('boom');
      },
    } as unknown as Parameters<typeof host.use>[0]);
    await expect(host.parseAsync([], { from: 'user' })).rejects.toThrow('boom');
  });

  it('sync parse() throws', () => {
    const { host } = directHost();
    const parse = host.parse.bind(host) as (
      argv: string[],
      options: { from: 'user' },
    ) => unknown;
    expect(() => parse(['greet'], { from: 'user' })).toThrow(
      'parse() is not supported on a get-dotenv host; use parseAsync().',
    );
  });

  it('top-level -h renders top-level help and parses nothing', async () => {
    const { host, seen } = directHost();
    await inFixture({}, async () => {
      await host.parseAsync(['-h', '--tool-level', '3'], { from: 'user' });
    });
    expect(seen.greet).toBeUndefined();
  });
});

describe('[getdotenv:argv] debug line', () => {
  const stderrOf = async (argv: string[], env?: string) => {
    if (env === undefined) delete process.env.GETDOTENV_DEBUG;
    else process.env.GETDOTENV_DEBUG = env;
    const writes: string[] = [];
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      writes.push(String(chunk));
      return true;
    });
    const { host } = directHost();
    host.option('--debug', 'debug');
    await host.parseAsync(argv, { from: 'user' });
    vi.restoreAllMocks();
    return writes.filter((w) => w.startsWith('[getdotenv:argv]'));
  };

  it('prints typed and normalized argv when the root gets --debug (plain or qualified)', async () => {
    expect(await stderrOf(['--tool-debug', 'greet'])).toEqual([
      '[getdotenv:argv] typed: ["--tool-debug","greet"] normalized: ["--debug","greet"]\n',
    ]);
    expect(await stderrOf(['--debug', 'greet'])).toHaveLength(1);
  });

  it('prints it under GETDOTENV_DEBUG', async () => {
    expect(await stderrOf(['greet'], '1')).toEqual([
      '[getdotenv:argv] typed: ["greet"] normalized: ["greet"]\n',
    ]);
  });

  it('is silent otherwise, including --debug given to a subcommand or as an operand', async () => {
    expect(await stderrOf(['greet'])).toEqual([]);
    expect(await stderrOf(['greet', '--', '--debug'])).toEqual([]);
  });

  it('shows terminators in the normalized argv', async () => {
    const vc = await vcProgram();
    vc.exitOverride();
    process.env.GETDOTENV_DEBUG = '1';
    const { output } = await inFixture({}, () =>
      captureOutput(() =>
        vc.parseAsync(['--vc-shell', 'smoz', 'openapi'], { from: 'user' }),
      ),
    );
    expect(output.find((l) => l.startsWith('[getdotenv:argv]'))).toBe(
      '[getdotenv:argv] typed: ["--vc-shell","smoz","openapi"] normalized: ["--shell","--vc-q1r1s","smoz","openapi"]',
    );
  });
});

describe('stack-trace rule: the argv it reads', () => {
  it('reads the typed argv until normalization succeeds, then the normalized one', async () => {
    const { host } = directHost();
    host.option('--debug', 'debug');
    // Install error: typed argv, where --tool-debug counts.
    host.use({
      ns: 'bad',
      setup() {
        throw new Error('boom');
      },
    } as unknown as Parameters<typeof host.use>[0]);
    await expect(
      host.parseAsync(['--tool-debug'], { from: 'user' }),
    ).rejects.toThrow('boom');
    expect(runArgvRequestsDebug(host)).toBe(true);

    const ok = directHost();
    ok.host.option('--debug', 'debug');
    await ok.host.parseAsync(['--tool-debug', 'greet'], { from: 'user' });
    expect(runArgvRequestsDebug(ok.host)).toBe(true);
    await ok.host.parseAsync(['greet'], { from: 'user' });
    expect(runArgvRequestsDebug(ok.host)).toBe(false);

    // After normalization it reads the normalized argv: a qualified option
    // written as --debug counts there, though the typed argv has neither
    // --debug nor --tool-debug.
    const sub = directHost();
    sub.host.commands[0]?.option('--debug', 'greet debug');
    await sub.host.parseAsync(['greet', '--tool-greet-debug'], {
      from: 'user',
    });
    expect(runArgvRequestsDebug(sub.host)).toBe(true);
    expect(runArgvRequestsDebug(new GetDotenvCli('fresh'))).toBe(false);
  });
});
