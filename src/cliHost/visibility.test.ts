import { describe, expect, it, vi } from 'vitest';

import { runFixtureCli, withEnv } from '@/test/support/fixtureCli';

import { attachRootOptions } from './attachRootOptions';
import { GetDotenvCli } from './GetDotenvCli';
import type { RootOptionsShape } from './types';
import { applyRootVisibility, mergeRootVisibility } from './visibility';

const findOption = (cli: GetDotenvCli, long: string) =>
  cli.options.find((o) => (o as { long?: string }).long === long);

describe('cliHost/visibility', () => {
  it('mergeRootVisibility applies left-to-right precedence', () => {
    const base = { shell: false, capture: true } as Partial<
      Record<keyof RootOptionsShape, boolean>
    >;
    const mid = { shell: true } as Partial<
      Record<keyof RootOptionsShape, boolean>
    >;
    const top = { capture: false } as Partial<
      Record<keyof RootOptionsShape, boolean>
    >;

    const merged = mergeRootVisibility(base, mid, top);
    expect(merged.shell).toBe(true); // mid overrides base
    expect(merged.capture).toBe(false); // top overrides base
  });

  it('applyRootVisibility hides expected long flags', () => {
    const cli = new GetDotenvCli('test');
    // Register the full set of root flags
    attachRootOptions(cli, {});

    // Hide shell family and a single flag (capture)
    applyRootVisibility(cli, {
      shell: false,
      capture: false,
    });

    const shellOn = findOption(cli, '--shell');
    const shellOff = findOption(cli, '--shell-off');
    const capture = findOption(cli, '--capture');

    // Commander stores the hidden state on the Option object
    expect(shellOn && (shellOn as { hidden?: boolean }).hidden).toBe(true);
    expect(shellOff && (shellOff as { hidden?: boolean }).hidden).toBe(true);
    expect(capture && (capture as { hidden?: boolean }).hidden).toBe(true);
  });
});

describe('#60 visibility resolution (the help rendering half is S13)', () => {
  const hidden = (cli: GetDotenvCli, long: string) => {
    const opt = findOption(cli, long);
    expect(opt?.long).toBe(long);
    return opt?.hidden;
  };

  it('the issue repro: env, outputPath, defaultEnvKey, debug and excludeAll map to flags', () => {
    const cli = new GetDotenvCli('test');
    attachRootOptions(cli, {});
    applyRootVisibility(cli, {
      env: false,
      outputPath: false,
      defaultEnvKey: false,
      debug: false,
      excludeAll: false,
    });
    const longs = [
      '--env',
      '--output-path',
      '--default-env-key',
      '--debug',
      '--debug-off',
      '--exclude-all',
      '--exclude-all-off',
    ];
    expect(longs.map((l) => [l, hidden(cli, l)])).toEqual(
      longs.map((l) => [l, true]),
    );
    expect(hidden(cli, '--default-env')).toBe(false);
  });

  it('every flag of the root options can be hidden', () => {
    const cli = new GetDotenvCli('test');
    attachRootOptions(cli, {});
    const keys = [
      ...new Set(
        cli.options
          .map((o) => o.attributeName())
          .map((k) => k.replace(/Off$/, ''))
          .map((k) =>
            k === 'entropyWarn'
              ? 'warnEntropy'
              : k === 'redactPattern'
                ? 'redactPatterns'
                : k,
          ),
      ),
    ] as Array<keyof RootOptionsShape>;
    applyRootVisibility(cli, Object.fromEntries(keys.map((k) => [k, false])));
    expect(cli.options.filter((o) => !o.hidden).map((o) => o.long)).toEqual([]);
  });

  it('true shows a flag an earlier layer hid (config undoes createCli)', () => {
    const cli = new GetDotenvCli('test');
    attachRootOptions(cli, {});
    const createCliLayer = { shell: false, capture: false };
    applyRootVisibility(cli, createCliLayer);
    expect(hidden(cli, '--shell')).toBe(true);

    applyRootVisibility(
      cli,
      mergeRootVisibility(createCliLayer, { shell: true }),
    );
    expect(hidden(cli, '--shell')).toBe(false);
    expect(hidden(cli, '--shell-off')).toBe(false);
    expect(hidden(cli, '--capture')).toBe(true);
  });

  it('createCli top-level -h applies config true over createCli false', async () => {
    let program: GetDotenvCli | undefined;
    const write = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    try {
      await withEnv({ GETDOTENV_STDOUT: 'pipe' }, () =>
        runFixtureCli(
          ['-h'],
          {
            'getdotenv.config.json': JSON.stringify({
              rootOptionVisibility: { shell: true, trace: false },
            }),
          },
          {
            rootOptionVisibility: { shell: false, capture: false },
            compose: (p) => (program = p),
          },
        ),
      );
    } finally {
      write.mockRestore();
    }
    expect(program).toBeDefined();
    if (!program) return;
    expect(hidden(program, '--shell')).toBe(false);
    expect(hidden(program, '--capture')).toBe(true);
    expect(hidden(program, '--trace')).toBe(true);
  });
});
