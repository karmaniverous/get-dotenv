import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock execa to capture invocations without spawning a shell.
const execMock =
  vi.fn<(command: string, opts: Record<string, unknown>) => Promise<void>>();
vi.mock('execa', () => ({
  execaCommand: (cmd: string, opts: Record<string, unknown>) =>
    execMock(cmd, opts),
}));

import '../../cliCore/enhanceGetDotenvCli';

import { GetDotenvCli } from '../../cliHost/GetDotenvCli';
import { cmdPlugin } from './index';

describe('plugins/cmd option alias', () => {
  beforeEach(() => {
    execMock.mockClear();
    delete process.env.APP_SETTING;
  });

  it('executes alias when provided on parent (variadic join)', async () => {
    const cli = new GetDotenvCli('test')
      .attachRootOptions()
      .use(cmdPlugin({ asDefault: true, optionAlias: '--cmd <command...>' }))
      .passOptions();

    await cli.parseAsync(['node', 'test', '--cmd', 'echo', 'OK']);

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
    const cli = new GetDotenvCli('test')
      .attachRootOptions()
      .use(cmdPlugin({ asDefault: true, optionAlias: '--cmd <command...>' }))
      .passOptions();

    await cli.parseAsync(['node', 'test', '--cmd', 'echo', '$FOO']);

    expect(execMock).toHaveBeenCalledTimes(1);
    const [command] = execMock.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    // $FOO should be expanded to BAR before execution
    expect(command).toBe('echo BAR');
  });

  it('conflicts when alias and cmd subcommand are both provided', async () => {
    // Spy process.exit to avoid terminating the test process
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as never);

    const cli = new GetDotenvCli('test')
      .attachRootOptions()
      .use(cmdPlugin({ asDefault: true, optionAlias: '--cmd <command...>' }))
      .passOptions();

    await expect(
      cli.parseAsync([
        'node',
        'test',
        '--cmd',
        'echo',
        'OK',
        'cmd',
        'echo',
        'X',
      ]),
    ).rejects.toThrow(/process\.exit called/);

    expect(execMock).toHaveBeenCalledTimes(0);
    exitSpy.mockRestore();
  });
});
