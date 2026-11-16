/**
 * #87: `brand()` registers `-V, --version` once (Decision 23 addendum), so a
 * second `brand()` and a second `run()` of a `createCli` runner are safe, and
 * `--version` prints the latest version.
 */
import { describe, expect, it, vi } from 'vitest';

import { createCli } from '@/src/cli';
import { captureOutput, inFixture } from '@/test/support/fixtureCli';

import { GetDotenvCli } from './GetDotenvCli';

/** Thrown by the `process.exit` stand-in. */
class ExitSignal extends Error {}

/** Run `fn` with `process.exit` stubbed; return what it wrote to stdout. */
const stdoutOf = async (fn: () => Promise<unknown>): Promise<string> => {
  let out = '';
  const write = vi.spyOn(process.stdout, 'write').mockImplementation((c) => {
    out += String(c);
    return true;
  });
  const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
    throw new ExitSignal();
  });
  try {
    await fn();
  } catch (e) {
    if (!(e instanceof ExitSignal)) throw e;
  } finally {
    write.mockRestore();
    exit.mockRestore();
  }
  return out;
};

describe('#87 brand() registers -V, --version once', () => {
  it('a createCli runner runs twice (issue repro)', async () => {
    const ran: string[] = [];
    const run = createCli({
      importMetaUrl: import.meta.url,
      alias: 'gdv5',
      compose: (p) => {
        p.command('noop').action(() => {
          ran.push('noop');
        });
        return p;
      },
    });
    await inFixture({}, async () => {
      await run(['noop']);
      await run(['noop']);
    });
    expect(ran).toEqual(['noop', 'noop']);
  });

  it('a second brand() updates the version without a second option', async () => {
    const cli = new GetDotenvCli('twice');
    await cli.brand({ version: '1.0.0' });
    await expect(cli.brand({ version: '2.0.0' })).resolves.toBe(cli);
    expect(cli.options.filter((o) => o.long === '--version')).toHaveLength(1);
    expect(cli.version()).toBe('2.0.0');
    const out = await stdoutOf(() =>
      cli.parseAsync(['--version'], { from: 'user' }),
    );
    expect(out).toBe('2.0.0\n');
  });

  it('-V prints the first version when brand() ran once', async () => {
    const cli = new GetDotenvCli('once');
    await cli.brand({ version: '1.0.0' });
    const out = await stdoutOf(() => cli.parseAsync(['-V'], { from: 'user' }));
    expect(out).toBe('1.0.0\n');
  });

  it('--version exits through exitOverride with commander.version', async () => {
    const cli = new GetDotenvCli('exits');
    await cli.brand({ version: '3.0.0' });
    let code: string | undefined;
    cli.exitOverride((err) => {
      code = err.code;
      throw err;
    });
    const out = await stdoutOf(() =>
      cli.parseAsync(['--version'], { from: 'user' }).catch(() => undefined),
    );
    expect(out).toBe('3.0.0\n');
    expect(code).toBe('commander.version');
  });

  it('the help header follows the latest version', async () => {
    const cli = new GetDotenvCli('twice');
    await cli.brand({ version: '1.0.0' });
    await cli.brand({ version: '2.0.0' });
    let help = '';
    cli.configureOutput({
      writeOut: (s) => {
        help += s;
      },
    });
    cli.outputHelp();
    expect(help.startsWith('twice v2.0.0\n')).toBe(true);
  });

  it('brand() with no version registers no -V', async () => {
    const cli = new GetDotenvCli('nover');
    await cli.brand({ name: 'nover' });
    expect(cli.options.some((o) => o.long === '--version')).toBe(false);
  });

  it('an empty version is given, not omitted: the package version is not read', async () => {
    // importMetaUrl's package (get-dotenv's own) has a version, but the
    // package supplies it only when `version` is omitted.
    const cli = new GetDotenvCli('empty');
    await cli.brand({ importMetaUrl: import.meta.url, version: '' });
    expect(cli.options.some((o) => o.long === '--version')).toBe(false);
    expect(cli.version()).toBeUndefined();
  });

  it('a runner second run keeps one --version option', async () => {
    let program: GetDotenvCli | undefined;
    const run = createCli({
      importMetaUrl: import.meta.url,
      alias: 'gdv6',
      compose: (p) => (program = p),
    });
    await inFixture({}, async () => {
      await captureOutput(async () => {
        await run([]);
        await run([]);
      });
    });
    expect(program?.options.filter((o) => o.long === '--version')).toHaveLength(
      1,
    );
  });
});
