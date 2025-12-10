import { execa } from 'execa';
import { describe, expect, it } from 'vitest';

// Helper: robust “ends with a blank line” check
// - Trim trailing horizontal whitespace per line
// - Accept CRLF or LF
// - Allow shells/Commander to emit extra whitespace before the final newline
const endsWithBlankLine = (txt: string) =>
  /\r?\n\s*\r?\n$/.test(txt.replace(/[ \t]+$/gm, ''));

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
      stripFinalNewline: false,
    });
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/Usage:\s+getdotenv batch/i);
    // Subcommand help should not render a self "Plugin options — batch" section.
    expect(stdout.includes('Plugin options — batch')).toBe(false);
    // Must end with at least one blank line for prompt separation (CRLF-safe)
    // Tolerant to chunked writes and trailing spaces.
    expect(endsWithBlankLine(stdout)).toBe(true);
  });

  it('aws -h prints aws help without global options and no self plugin group', async () => {
    const { stdout, exitCode } = await execa(nodeBin, CLI('aws', '-h'), {
      env: { ...process.env, GETDOTENV_STDIO: 'pipe' },
      stripFinalNewline: false,
    });
    expect(exitCode).toBe(0);
    // Subcommand usage
    expect(stdout).toMatch(/Usage:\s+getdotenv aws/i);
    // No Commander "Global Options:" block (we do not show root flags here)
    expect(stdout.includes('Global Options:')).toBe(false);
    // Nested composition: whoami should be listed under aws
    expect(stdout).toMatch(/\bwhoami\b/i);
    // No self plugin group duplication
    expect(stdout.includes('Plugin options — aws')).toBe(false);
    // Must end with at least one blank line for prompt separation (CRLF-safe)
    // Tolerant to chunked writes and trailing spaces.
    expect(endsWithBlankLine(stdout)).toBe(true);
  });

  it('cmd -h prints cmd help', async () => {
    const { stdout, exitCode } = await execa(nodeBin, CLI('cmd', '-h'), {
      env: { ...process.env, GETDOTENV_STDIO: 'pipe' },
      stripFinalNewline: false,
    });
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/Usage:\s+getdotenv cmd/i);
    // Must end with at least one blank line for prompt separation (CRLF-safe)
    // Tolerant to chunked writes and trailing spaces.
    expect(endsWithBlankLine(stdout)).toBe(true);
  });

  it('root -h shows plugin options before commands (hybrid ordering)', async () => {
    const { stdout, exitCode } = await execa(nodeBin, CLI('-h'), {
      env: { ...process.env, GETDOTENV_STDIO: 'pipe' },
      stripFinalNewline: false,
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
    // Must end with at least one blank line for prompt separation (CRLF-safe)
    // Tolerant to chunked writes and trailing spaces.
    expect(endsWithBlankLine(stdout)).toBe(true);
  });
});
