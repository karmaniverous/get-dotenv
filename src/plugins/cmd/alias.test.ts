import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock execa to capture invocations without spawning a shell.
const execMock =
  vi.fn<(command: string, opts: Record<string, unknown>) => Promise<void>>();
vi.mock('execa', () => ({
  execaCommand: (cmd: string, opts: Record<string, unknown>) =>
    execMock(cmd, opts),
}));

import { createCli } from '@/src/cli';

import { cmdPlugin } from './index';

describe('plugins/cmd option alias', () => {
  beforeEach(() => {
    execMock.mockClear();
    delete process.env.APP_SETTING;
  });

  it('executes alias when provided on parent (variadic join)', async () => {
    const run = createCli({
      alias: 'test',
      compose: (p) =>
        p.use(
          cmdPlugin({ asDefault: true, optionAlias: '--cmd <command...>' }),
        ),
    });
    await run(['node', 'test', '--cmd', 'echo', 'OK']);

    expect(execMock).toHaveBeenCalledTimes(1);
    const [command, opts] = execMock.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(command).toBe('echo OK');
    expect((opts as { stdio?: string }).stdio).toBe('inherit');
  });

  it('expands alias value with dotenv expansion by default', async () => {
    process.env.FOO = 'BAR';
    const run = createCli({
      alias: 'test',
      compose: (p) =>
        p.use(
          cmdPlugin({ asDefault: true, optionAlias: '--cmd <command...>' }),
        ),
    });
    await run(['node', 'test', '--cmd', 'echo', '$FOO']);

    expect(execMock).toHaveBeenCalledTimes(1);
    const [command] = execMock.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    // $FOO should be expanded to BAR before execution
    expect(command).toBe('echo BAR');
  });

  it('conflicts when alias and cmd subcommand are both provided', async () => {
    // Spy logger.error to detect conflict message; no process exit under tests.
    const errSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined as unknown as void);
    const run = createCli({
      alias: 'test',
      compose: (p) =>
        p.use(
          cmdPlugin({ asDefault: true, optionAlias: '--cmd <command...>' }),
        ),
    });

    await run([
      'node',
      'test',
      '--cmd',
      'echo',
      'OK',
      '--',
      'cmd',
      'echo',
      'X',
    ]);

    expect(execMock).toHaveBeenCalledTimes(0);
    expect(
      errSpy.mock.calls.some((c) =>
        String(c[0] ?? '').includes(
          '--cmd option conflicts with cmd subcommand',
        ),
      ),
    ).toBe(true);
    errSpy.mockRestore();
  });
});
