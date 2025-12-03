import { execa } from 'execa';
import { describe, expect, it } from 'vitest';

// E2E: ensure "-h" after a subcommand prints that subcommand's help,
// and root help renders plugin groups before "Commands".

const nodeBin = process.execPath;
const CLI = (...args: string[]) => [
  '--import',
  'tsx',
  'src/cli/getdotenv',
  ...args,
];

describe('E2E help (subcommand and ordering)', () => {
  it('batch -h prints batch help', async () => {
    const { stdout, exitCode } = await execa(nodeBin, CLI('batch', '-h'), {
      env: { ...process.env, GETDOTENV_STDIO: 'pipe' },
    });
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/Usage:\s+getdotenv batch/i);
  }, 30000);

  it('cmd -h prints cmd help', async () => {
    const { stdout, exitCode } = await execa(nodeBin, CLI('cmd', '-h'), {
      env: { ...process.env, GETDOTENV_STDIO: 'pipe' },
    });
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/Usage:\s+getdotenv cmd/i);
  }, 30000);

  it('root -h shows plugin options before commands (hybrid ordering)', async () => {
    const { stdout, exitCode } = await execa(nodeBin, CLI('-h'), {
      env: { ...process.env, GETDOTENV_STDIO: 'pipe' },
    });
    expect(exitCode).toBe(0);
    // Basic sanity: must be root help
    expect(stdout).toMatch(/Usage:\s+getdotenv \[options] \[command]/i);

    // Find sections: Options, Plugin options (cmd), Commands.
    const idxOptions = stdout.indexOf('Options:');
    const idxPluginCmd = stdout.indexOf('Plugin options — cmd');
    const idxCommands = stdout.indexOf('Commands:');

    expect(idxOptions).toBeGreaterThanOrEqual(0);
    // The cmd plugin attaches a parent-level alias; it should appear as a plugin group.
    expect(idxPluginCmd).toBeGreaterThanOrEqual(0);
    expect(idxCommands).toBeGreaterThanOrEqual(0);

    expect(idxOptions).toBeLessThan(idxPluginCmd);
    expect(idxPluginCmd).toBeLessThan(idxCommands);
  }, 30000);
});
