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

describe('generated CLI (root cmd: scripts & shell overrides)', () => {
  beforeEach(() => {
    execaMock.mockReset().mockResolvedValue({ exitCode: 0 });
  });

  it('resolves scripts and honors per-script shell overrides', async () => {
    const program = await generateGetDotenvCli({
      importMetaUrl: import.meta.url,
      alias: 'gen',
      description: 'Generated CLI',
      logger: console,
      // Provide scripts with differing shell preferences
      scripts: {
        'bash-only': { cmd: 'echo $SHELL && echo OK', shell: '/bin/bash' },
        plain: { cmd: 'node -v', shell: false },
      },
    });

    // 1) bash-only: expect shell override to /bin/bash
    await program.parseAsync(['node', 'gen', 'cmd', 'bash-only']);
    expect(execaMock).toHaveBeenCalledTimes(1);
    {
      const [command, opts] = execaMock.mock.calls[0] as [
        string,
        {
          env?: Record<string, string>;
          shell?: string | boolean | URL;
          stdio?: 'inherit' | 'pipe';
        },
      ];
      expect(command).toBe('echo $SHELL && echo OK');
      expect(opts.stdio).toBe('inherit');
      expect(typeof opts.shell === 'string' ? opts.shell : '').toBe(
        '/bin/bash',
      );
    }
    execaMock.mockClear();

    // 2) plain: expect shell override to false (plain execa)
    await program.parseAsync(['node', 'gen', 'cmd', 'plain']);
    expect(execaMock).toHaveBeenCalledTimes(1);
    {
      const [command, opts] = execaMock.mock.calls[0] as [
        string,
        {
          env?: Record<string, string>;
          shell?: string | boolean | URL;
          stdio?: 'inherit' | 'pipe';
        },
      ];
      expect(command).toBe('node -v');
      expect(opts.shell).toBe(false);
      expect(opts.stdio).toBe('inherit');
    }
  });

  it('returns early (no-op) when no positional tokens are provided', async () => {
    const program = await generateGetDotenvCli({
      importMetaUrl: import.meta.url,
      alias: 'gen',
      description: 'Generated CLI',
      logger: console,
    });

    await program.parseAsync(['node', 'gen', 'cmd']);
    expect(execaMock).not.toHaveBeenCalled();
  });
});
