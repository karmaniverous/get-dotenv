import { describe, expect, it } from 'vitest';

describe('interop/createCli (ESM dynamic)', () => {
  it('exposes named createCli and runs help', async () => {
    // Ensure tests-only path disables process.exit for help/version flows.
    process.env.GETDOTENV_TEST = '1';

    // Dynamic import ensures we exercise ESM resolution in test runtime.
    const mod = (await import('../index')) as unknown as {
      createCli?: (opts?: { alias?: string; branding?: string }) => {
        run: (argv: string[]) => Promise<void>;
      };
    };
    expect(typeof mod.createCli).toBe('function');

    // Construct a CLI and run with "-h" to ensure parse completes.
    // Use a short alias to minimize output width; branding is optional.
    const cli = mod.createCli?.({
      alias: 'getdotenv',
      branding: 'getdotenv (test)',
    });
    expect(cli && typeof cli.run === 'function').toBe(true);

    // Help should print and return without throwing or exiting the process.
    // If a runtime change regresses, this will throw and fail the test.
    await cli?.run(['-h']);
  }, 20000);
});
