/**
 * #62: the runner's error boundary covers plugin install and top-level help,
 * not only the parse. Every error is one line on stderr and exit code 1.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { definePlugin } from '@/src/cliHost';
import { captureOutput, inFixture } from '@/test/support/fixtureCli';

import { createCli } from './createCli';

const prevExitCode = process.exitCode;
afterEach(() => {
  process.exitCode = prevExitCode;
});

/** Run a host; return its output, rejection (if any) and exit code. */
const runHost = (
  args: string[],
  files: Record<string, string> = {},
  compose?: Parameters<typeof createCli>[0]['compose'],
) =>
  inFixture(files, async () => {
    process.exitCode = undefined;
    let rejected: string | undefined;
    const { output } = await captureOutput(async () => {
      try {
        await createCli({
          importMetaUrl: import.meta.url,
          alias: 'fixture',
          ...(compose ? { compose } : {}),
        })(args);
      } catch (e) {
        rejected = e instanceof Error ? e.message : String(e);
      }
    });
    const exitCode = process.exitCode;
    process.exitCode = undefined;
    return { output, rejected, exitCode };
  });

describe('error boundary (#62)', () => {
  it('top-level -h with an invalid config prints one line and exits 1 (the issue repro)', async () => {
    const r = await runHost(['-h'], { 'getdotenv.config.json': '{ nope' });
    expect(r.rejected).toBeUndefined();
    expect(r.exitCode).toBe(1);
    const errors = r.output.filter((l) => l.startsWith('Error: '));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/config/i);
    expect(r.output.some((l) => /^\s+at /.test(l))).toBe(false);
  });

  it('a plugin setup error is presented by the boundary', async () => {
    const broken = definePlugin({
      ns: 'broken',
      setup() {
        throw new Error('setup failed');
      },
    });
    const r = await runHost(['broken'], {}, (p) => p.use(broken));
    expect(r.rejected).toBeUndefined();
    expect(r.exitCode).toBe(1);
    expect(r.output).toContain('Error: setup failed');
  });

  it('an install error reads the typed argv: --<alias>-debug prints the stack', async () => {
    const broken = definePlugin({
      ns: 'broken',
      setup() {
        throw new Error('setup failed');
      },
    });
    const r = await runHost(['--fixture-debug', 'broken'], {}, (p) =>
      p.use(broken),
    );
    expect(r.exitCode).toBe(1);
    expect(r.output.some((l) => /^\s+at /.test(l))).toBe(true);
  });

  it('a normalization error is a usage error: one line, exit 1, no stack', async () => {
    const r = await runHost(['--fixture-envv', 'x']);
    expect(r.rejected).toBeUndefined();
    expect(r.exitCode).toBe(1);
    expect(r.output).toContain(
      "Unknown option '--fixture-envv' (the '--fixture-' prefix is reserved for fixture)",
    );
    expect(r.output.some((l) => /^\s+at /.test(l))).toBe(false);
  });

  it('prints the stack under --debug', async () => {
    const broken = definePlugin({
      ns: 'broken',
      setup() {
        throw new Error('setup failed');
      },
    });
    const r = await runHost(['--debug', 'broken'], {}, (p) => p.use(broken));
    expect(r.exitCode).toBe(1);
    expect(r.output).toContain('Error: setup failed');
    expect(r.output.some((l) => /^\s+at /.test(l))).toBe(true);
  });
});
