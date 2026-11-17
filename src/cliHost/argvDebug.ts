/**
 * The `[getdotenv:argv]` debug line (spec 3.10.5): the typed and the
 * normalized argv, on stderr under `--debug` or `GETDOTENV_DEBUG`.
 *
 * With redaction on, the line masks secrets (review 5916926264 #5): each
 * `-v`/`--vars` value whole (plain, `--<alias>-vars`, inline after `=` or
 * in a short-flag group), and the value of any `KEY=VALUE` token whose key
 * matches the redaction patterns. Redaction is resolved the way the run
 * resolves it: the root's CLI flags, then the parent's bag, config and the
 * host's defaults. Any `-v` in the argv counts, a child command's included,
 * so the line may mask more than the root's vars. With redaction off the
 * line, an opt-in diagnostic, shows the argv as given.
 */
import type { Option } from '@commander-js/extra-typings';

import {
  redactDisplay,
  REDACTION_MASK,
  type RedactOptions,
} from '@/src/diagnostics/redact';

import type { GetDotenvCli } from './GetDotenvCli';
import type { Normalization } from './qualified';
import { qualifiedNameTableOf } from './qualified/table';
import { resolveHostRootOptions } from './topLevelHelp';

/** The root's CLI flags, by attribute name, as Commander would set them. */
const rootFlags = (
  program: GetDotenvCli,
  n: Normalization,
): Record<string, unknown> => {
  const raw: Record<string, unknown> = {};
  const take = (option: Option, values: readonly string[]) => {
    const key = option.attributeName();
    const prev = raw[key];
    if (option.variadic)
      raw[key] = [
        ...(Array.isArray(prev) ? (prev as string[]) : []),
        ...values,
      ];
    else
      raw[key] = values.length > 0 ? values[values.length - 1] : !option.negate;
  };
  for (const a of n.walk.assigned)
    if (a.command === program) take(a.option, a.values);
  for (const c of n.claims)
    if (c.entry.command === program)
      take(c.entry.option, c.value === undefined ? [] : [c.value]);
  return raw;
};

/** The redaction the run will use. */
const runRedaction = async (
  program: GetDotenvCli,
  n: Normalization,
): Promise<RedactOptions> => {
  try {
    const { merged } = await resolveHostRootOptions(
      program,
      rootFlags(program, n),
    );
    return { redact: merged.redact, redactPatterns: merged.redactPatterns };
  } catch {
    // Config that can't be read fails the run in the root hooks; until
    // then, mask.
    return { redact: true };
  }
};

/** The root's vars flags: long names (plain and qualified) and short letter. */
interface VarsFlags {
  long: string[];
  short: string | undefined;
}

const varsFlagsOf = (program: GetDotenvCli): VarsFlags => {
  const option = program.options.find((o) => o.attributeName() === 'vars');
  if (!option) return { long: [], short: undefined };
  const qualified = [...(qualifiedNameTableOf(program)?.entries.values() ?? [])]
    .filter((e) => e.kind === 'option' && e.option === option)
    .map((e) => e.name);
  return {
    long: [option.long, ...qualified].filter(
      (f): f is string => typeof f === 'string',
    ),
    short: option.short?.slice(1),
  };
};

/**
 * Mask an argv for display: each vars value, and the value of each
 * `KEY=VALUE` token whose key `opts` redacts.
 */
const maskArgv = (
  argv: readonly string[],
  flags: VarsFlags,
  opts: RedactOptions,
): string[] => {
  const out: string[] = [];
  let maskNext = false;
  for (const token of argv) {
    if (maskNext) {
      out.push(REDACTION_MASK);
      maskNext = false;
      continue;
    }
    const eq = token.indexOf('=');
    const name = eq < 0 ? token : token.slice(0, eq);
    if (flags.long.includes(name)) {
      maskNext = eq < 0;
      out.push(maskNext ? token : `${name}=${REDACTION_MASK}`);
      continue;
    }
    // A short-flag group holding the vars letter: the rest of the group,
    // or else the next token, is its value.
    const at =
      flags.short && /^-[^-]/.test(token) ? token.indexOf(flags.short, 1) : -1;
    if (at > 0) {
      maskNext = at === token.length - 1;
      out.push(maskNext ? token : `${token.slice(0, at + 1)}${REDACTION_MASK}`);
      continue;
    }
    out.push(
      eq > 0 && redactDisplay(name, 'x', opts) === REDACTION_MASK
        ? `${name}=${REDACTION_MASK}`
        : token,
    );
  }
  return out;
};

/**
 * The `[getdotenv:argv]` line, masked when redaction is on.
 *
 * @param program - The host root.
 * @param typed - The argv as typed.
 * @param n - Its normalization.
 * @returns The line, newline-terminated.
 */
export const argvDebugLine = async (
  program: GetDotenvCli,
  typed: readonly string[],
  n: Normalization,
): Promise<string> => {
  const opts = await runRedaction(program, n);
  const show = (argv: readonly string[]) =>
    JSON.stringify(
      opts.redact ? maskArgv(argv, varsFlagsOf(program), opts) : argv,
    );
  return `[getdotenv:argv] typed: ${show(typed)} normalized: ${show(n.argv)}\n`;
};
