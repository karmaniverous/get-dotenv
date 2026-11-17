import { Command } from '@commander-js/extra-typings';
import { describe, expect, it } from 'vitest';

import { GetDotenvCli } from './GetDotenvCli';
import type { GetDotenvCliOptions } from './GetDotenvCliOptions';
import { readMergedOptions } from './readMergedOptions';

describe('readMergedOptions', () => {
  it("returns the root host's bag from any command under it", () => {
    const root = new GetDotenvCli('host');
    const leaf = new Command('leaf');
    root.addCommand(new Command('mid').addCommand(leaf));
    const bag = { env: 'dev' } as unknown as GetDotenvCliOptions;
    root._setOptionsBag(bag);
    expect(readMergedOptions(leaf)).toBe(bag);
  });

  it('throws when the root is not a GetDotenvCli', () => {
    const root = new Command('plain');
    const leaf = new Command('leaf');
    root.addCommand(leaf);
    expect(() => readMergedOptions(leaf)).toThrow(
      'readMergedOptions: root command is not a GetDotenvCli.',
    );
  });

  it('throws when the host has no bag yet', () => {
    const root = new GetDotenvCli('host');
    const leaf = new Command('leaf');
    root.addCommand(leaf);
    expect(() => readMergedOptions(leaf)).toThrow(
      'readMergedOptions: merged options are unavailable.',
    );
  });
});
