/**
 * #46 (W1): the library `-l` path (`getDotenv({ log: true })`) reads the
 * redaction and entropy settings from the resolved options, so the built-in
 * entropy whitelist applies, a caller's whitelist extends it, and custom
 * redaction patterns add to the built-in ones.
 */
import { describe, expect, it } from 'vitest';

import { inFixture } from '../../test/support/fixtureCli';
import { getDotenv } from './getDotenv';
import type { GetDotenvOptions } from './GetDotenvOptions';

const HIGH = 'Zx8Qp2Lm9Rt4Vb7Nc1Kd6Hf3Jg5Ws0Ya';

const logged = async (env: string, options: Partial<GetDotenvOptions> = {}) =>
  inFixture({ '.env': env }, async (dir) => {
    const lines: unknown[] = [];
    const logger = {
      debug: () => undefined,
      info: (v: unknown) => {
        lines.push(v);
      },
      warn: () => undefined,
      error: () => undefined,
    };
    await getDotenv({ paths: [dir], log: true, logger, ...options });
    return {
      map: lines[0],
      entropy: lines.slice(1).map((l) => /key=(\S+)/.exec(String(l))?.[1]),
    };
  });

describe('getDotenv -l (#46)', () => {
  it('applies the built-in entropy whitelist', async () => {
    const { entropy } = await logged(`GIT_L1=${HIGH}\nL1_OTHER=${HIGH}\n`);
    expect(entropy).toEqual(['L1_OTHER']);
  });

  it("a caller's whitelist extends the built-in one", async () => {
    const { entropy } = await logged(
      `GIT_L2=${HIGH}\nL2_MINE=${HIGH}\nL2_OTHER=${HIGH}\n`,
      { entropyWhitelist: ['^L2_MINE$'] },
    );
    expect(entropy).toEqual(['L2_OTHER']);
  });

  it('warnEntropy false turns the warnings off', async () => {
    const { entropy } = await logged(`L3_OTHER=${HIGH}\n`, {
      warnEntropy: false,
    });
    expect(entropy).toEqual([]);
  });

  it('custom redaction patterns add to the built-in ones', async () => {
    const { map } = await logged('L4_API_SECRET=s\nL4_CODE=c\nL4_APP=a\n', {
      redact: true,
      redactPatterns: ['^L4_CODE$'],
    });
    expect(map).toEqual({
      L4_API_SECRET: '[redacted]',
      L4_CODE: '[redacted]',
      L4_APP: 'a',
    });
  });
});
