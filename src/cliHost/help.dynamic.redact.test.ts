import { describe, expect, it } from 'vitest';

import { GetDotenvCli } from './GetDotenvCli';
import { toHelpConfig } from './helpConfig';

describe('GetDotenvCli dynamic help (redact)', () => {
  it('marks --redact as (default) when redact is true', () => {
    const cli = new GetDotenvCli('test').attachRootOptions();
    // Evaluate dynamic labels with redact ON
    cli.evaluateDynamicOptions(
      toHelpConfig(
        {
          redact: true,
        },
        {},
      ),
    );
    const help = cli.helpInformation();
    // Expect "--redact" to include "(default)"
    expect(help).toMatch(/--redact[^\n]*\(default\)/i);
    // And "--redact-off" should not carry the default tag in this case
    // (be tolerant of spacing and ordering)
    const offLine = help.split(/\r?\n/).find((l) => /\s--redact-off\b/.test(l));
    expect(offLine && /\(default\)/i.test(offLine)).toBe(false);
  });

  it('marks --redact-off as (default) when redact is false', () => {
    const cli = new GetDotenvCli('test').attachRootOptions();
    // Evaluate dynamic labels with redact OFF
    cli.evaluateDynamicOptions(
      toHelpConfig(
        {
          redact: false,
        },
        {},
      ),
    );
    const help = cli.helpInformation();
    // Expect "--redact-off" to include "(default)"
    expect(help).toMatch(/--redact-off[^\n]*\(default\)/i);
    // "--redact" should not carry the default tag now
    const onLine = help.split(/\r?\n/).find((l) => /\s--redact\b/.test(l));
    expect(onLine && /\(default\)/i.test(onLine)).toBe(false);
  });
});
