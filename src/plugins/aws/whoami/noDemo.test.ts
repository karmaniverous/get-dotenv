/**
 * #57: the demo `aws whoami really` subcommand (which printed
 * SECRET_IDENTITY) is not part of the production CLI.
 */
import { describe, expect, it } from 'vitest';

import { runCase } from '@/test/baseline/harness';

const run = (id: string, args: string[]) =>
  runCase({
    kind: 'cli',
    group: 'getdotenv',
    host: 'getdotenv',
    id,
    source: '#57',
    args,
  });

describe('aws whoami has no demo subcommand (#57)', () => {
  it('whoami help lists no subcommands', async () => {
    const r = await run('#57 whoami help', ['aws', 'whoami', '-h']);
    expect(r.stdout).toContain('Usage: getdotenv aws whoami [options]');
    expect(r.stdout).not.toMatch(/really|SECRET_IDENTITY/);
  });

  it('aws whoami really is rejected and prints no secret (repro)', async () => {
    const r = await run('#57 whoami really', ['aws', 'whoami', 'really']);
    expect(r.exitCode).not.toBe(0);
    expect(r.stdout).not.toMatch(/secret identity/i);
    expect(r.stderr).toContain("too many arguments for 'whoami'");
  });
});
