import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { definePlugin } from './definePlugin';
import { GetDotenvCli } from './GetDotenvCli';

describe('definePlugin readConfig', () => {
  it('throws a guided error when the host context is not resolved yet', async () => {
    const plugin = definePlugin({
      ns: 'demo',
      configSchema: z.object({ target: z.string().optional() }),
      setup() {
        /* no wiring */
      },
    });
    const cli = new GetDotenvCli('vc').use(plugin);
    await cli.install();
    expect(() => plugin.readConfig(cli)).toThrow(
      'Plugin config not available. Ensure resolveAndLoad() has been called before readConfig().',
    );
  });
});
