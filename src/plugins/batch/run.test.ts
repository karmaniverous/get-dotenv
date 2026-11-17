/**
 * `runBatch` in-process (the forms tests in `forms.test.ts` run the CLI in a
 * child process, which coverage can't see): the request each form hands the
 * batch executor, and the usage error when there is nothing to run.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const execMock = vi.fn<(arg: Record<string, unknown>) => number>(() => 0);
vi.mock('./execShellCommandBatch', () => ({
  execShellCommandBatch: (arg: Record<string, unknown>) =>
    Promise.resolve(execMock(arg)),
}));

import { createCli } from '@/src/cli';

import { batchPlugin } from './index';
import type { BatchPluginOptions } from './types';

const run = (args: string[], options: BatchPluginOptions = {}) =>
  createCli({
    importMetaUrl: import.meta.url,
    alias: 'test',
    compose: (p) => p.use(batchPlugin(options)),
  })(args);

const lastRequest = (): Record<string, unknown> => {
  expect(execMock).toHaveBeenCalledTimes(1);
  return (execMock.mock.calls[0] as [Record<string, unknown>])[0];
};

describe('runBatch', () => {
  beforeEach(() => {
    execMock.mockClear();
    process.exitCode = undefined;
  });

  it('batch -l X lists with X as extra globs and runs nothing', async () => {
    await run(['batch', '-g', 'pkgA', '-l', 'pkgB']);
    expect(lastRequest()).toMatchObject({ list: true, globs: 'pkgA pkgB' });
  });

  it('batch cmd -l with no command lists, with no extra globs', async () => {
    await run(['batch', '-g', 'pkgA', '-l', 'cmd']);
    expect(lastRequest()).toMatchObject({ list: true, globs: 'pkgA' });
  });

  it('positionals beat --command and keep their argv', async () => {
    await run(['batch', '-c', 'echo other', 'echo', 'mine']);
    expect(lastRequest()).toMatchObject({
      list: false,
      command: ['echo', 'mine'],
    });
  });

  it('positionals naming a script run the script with its shell', async () => {
    await run(['batch', 'build'], {
      scripts: { build: { cmd: 'npm run build', shell: '/bin/zsh' } },
    });
    expect(lastRequest()).toMatchObject({
      command: 'npm run build',
      shell: '/bin/zsh',
    });
  });

  it('with the shell off, a node -e positional keeps its code as one token', async () => {
    await run(['batch', 'node', '-e', 'console.log(1)'], { shell: false });
    expect(lastRequest()).toMatchObject({
      command: ['node', '-e', 'console.log(1)'],
      shell: false,
    });
  });

  it('passes the merged options bag, capture included', async () => {
    await run(['--capture', 'batch', 'echo', 'x']);
    expect(lastRequest().getDotenvCliOptions).toMatchObject({ capture: true });
  });

  it('a non-zero batch result becomes the exit code', async () => {
    execMock.mockImplementationOnce(() => 3);
    await run(['batch', 'echo', 'x']);
    expect(process.exitCode).toBe(3);
    process.exitCode = undefined;
  });

  it('no command and no --list is a usage error: logged, exit 1', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(((
      code?: number,
    ) => {
      throw new Error(`exit ${String(code)}`);
    }) as typeof process.exit);
    const errors: string[] = [];
    const log = vi
      .spyOn(console, 'error')
      .mockImplementation((...a: unknown[]) => {
        errors.push(a.map(String).join(' '));
      });
    try {
      // The runner's error boundary may catch the thrown sentinel.
      await run(['batch']).catch(() => undefined);
      expect(exit.mock.calls[0]).toEqual([1]);
    } finally {
      exit.mockRestore();
      log.mockRestore();
    }
    process.exitCode = undefined;
    expect(errors.join('\n')).toContain(
      'No command provided. Use --command or --list.',
    );
    expect(execMock).not.toHaveBeenCalled();
  });
});
