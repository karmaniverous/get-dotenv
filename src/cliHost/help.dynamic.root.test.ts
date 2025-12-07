import { describe, expect, it } from 'vitest';

import type { ResolvedHelpConfig } from './GetDotEnvCli';
import { GetDotenvCli } from './index';

describe('GetDotenvCli root dynamic help', () => {
  it('shows default labels for key root toggles (shell/log/load-process)', () => {
    // Build a host with root options and install passOptions so the instance
    // has consistent help/grouping behavior.
    const cli = new GetDotenvCli('test').attachRootOptions().passOptions();

    // Evaluate dynamic descriptions with an explicit resolved config bag.
    // Set OFF defaults for shell/log/loadProcess to assert "(default)" tags.
    const cfg: ResolvedHelpConfig = {
      shell: false,
      loadProcess: false,
      log: false,
      plugins: {},
    };

    cli.evaluateDynamicOptions(cfg);

    // Render help and assert the OFF variants include "(default)".
    const help = cli.helpInformation();

    // Shell OFF is the default, so the OFF toggle should show "(default)".
    expect(help).toMatch(/-S, --shell-off[\s\S]*\(default\)/i);

    // Load process OFF is the default; assert the OFF toggle shows "(default)".
    expect(help).toMatch(/-P, --load-process-off[\s\S]*\(default\)/i);

    // Log OFF is the default; assert the OFF toggle shows "(default)".
    expect(help).toMatch(/-L, --log-off[\s\S]*\(default\)/i);
  });
});
