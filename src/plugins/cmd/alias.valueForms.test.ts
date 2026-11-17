/**
 * The parent alias reads its value in every Commander shape: a variadic
 * array (the default `--cmd <command...>`), a single string (a non-variadic
 * alias such as `--run <command>`), and a short-only alias whose conflict
 * message names its attribute.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const execMock = vi.fn<
  (command: string, opts: Record<string, unknown>) => Promise<unknown>
>(() => Promise.resolve({ exitCode: 0, stdout: '', stderr: '' }));
vi.mock('execa', () => ({
  execa: (command: string, opts: Record<string, unknown>) =>
    execMock(command, opts),
}));

import { createCli } from '@/src/cli';

import { cmdPlugin } from './index';

const host = (optionAlias: string) =>
  createCli({
    importMetaUrl: import.meta.url,
    alias: 'test',
    compose: (p) => p.use(cmdPlugin({ asDefault: true, optionAlias })),
  });

describe('cmd alias value forms', () => {
  beforeEach(() => {
    execMock.mockClear();
    process.exitCode = undefined;
  });

  it('a non-variadic alias runs its single string value', async () => {
    await host('--run <command>')(['--run', 'echo one two']);
    expect(execMock).toHaveBeenCalledTimes(1);
    expect(execMock.mock.calls[0]?.[0]).toBe('echo one two');
  });

  it('a short-only alias names its attribute in the conflict message', async () => {
    const errors: string[] = [];
    const spy = vi
      .spyOn(console, 'error')
      .mockImplementation((...a: unknown[]) => {
        errors.push(a.map(String).join(' '));
      });
    try {
      // `-e dev` ends the variadic value, so `cmd echo` is the subcommand.
      await host('-x <command...>')(['-x', 'echo', '-e', 'dev', 'cmd', 'echo']);
    } finally {
      spy.mockRestore();
    }
    expect(execMock).not.toHaveBeenCalled();
    expect(errors.join('\n')).toContain(
      '--x option conflicts with cmd subcommand.',
    );
    expect(process.exitCode).toBe(1);
    process.exitCode = undefined;
  });
});
