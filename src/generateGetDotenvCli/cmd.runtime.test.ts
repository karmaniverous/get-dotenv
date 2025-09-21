import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock execaCommand to capture invocations without spawning.
const execaMock = vi.fn<
  (
    cmd: string,
    opts: {
      env?: Record<string, string>;
      shell?: string | boolean | URL;
      stdio?: 'inherit' | 'pipe';
    },
  ) => Promise<{ exitCode: number }>
>();
vi.mock('execa', () => ({
  execaCommand: (cmd: string, opts: Record<string, unknown>) =>
    execaMock(
      cmd,
      opts as {
        env?: Record<string, string>;
        shell?: string | boolean | URL;
        stdio?: 'inherit' | 'pipe';
      },
    ),
}));

import { generateGetDotenvCli } from './index';

const expectedDefaultShell =
  process.platform === 'win32' ? 'powershell.exe' : '/bin/bash';

describe('generated CLI (runtime ergonomics)', () => {
  beforeEach(() => {
    execaMock.mockReset().mockResolvedValue({ exitCode: 0 });
    // Avoid inherited env contaminating expansion behavior across tests.
    delete process.env.FOO;
  });

  it('root cmd executes positional tokens with normalized default shell', async () => {
    const program = await generateGetDotenvCli({
      importMetaUrl: import.meta.url,
      alias: 'gen',
      description: 'Generated CLI',
      logger: console,
    });

    await program.parseAsync(['node', 'gen', 'cmd', 'echo', 'OK']);
    expect(execaMock).toHaveBeenCalledTimes(1);
    const [command, opts] = execaMock.mock.calls[0] as [
      string,
      {
        env?: Record<string, string>;
        shell?: string | boolean | URL;
        stdio?: 'inherit' | 'pipe';
      },
    ];
    expect(command).toBe('echo OK');
    expect(opts.stdio).toBe('inherit');
    expect(typeof opts.env?.getDotenvCliOptions).toBe('string');
    expect(typeof opts.shell === 'string' ? opts.shell : '').toBe(
      expectedDefaultShell,
    );
  });

  it('root --command expands with dotenv and executes via execa', async () => {
    process.env.FOO = 'BAR';

    const program = await generateGetDotenvCli({
      importMetaUrl: import.meta.url,
      alias: 'gen',
      description: 'Generated CLI',
      logger: console,
    });

    await program.parseAsync(['node', 'gen', '--command', 'echo $FOO']);
    expect(execaMock).toHaveBeenCalledTimes(1);
    const [command, opts] = execaMock.mock.calls[0] as [
      string,
      {
        env?: Record<string, string>;
        shell?: string | boolean | URL;
        stdio?: 'inherit' | 'pipe';
      },
    ];
    // Expect expansion to have happened
    expect(command).toBe('echo BAR');
    expect(opts.stdio).toBe('inherit');
    expect(typeof opts.env?.getDotenvCliOptions).toBe('string');
    expect(typeof opts.shell === 'string' ? opts.shell : '').toBe(
      expectedDefaultShell,
    );
  });
});
