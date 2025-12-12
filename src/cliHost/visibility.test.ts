import { describe, expect, it } from 'vitest';

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
