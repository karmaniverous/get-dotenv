import { withBuiltInEntropyWhitelist } from '@/src/defaults';
import { defaultsDeep } from '@/src/util';

import { resolveExclusion, resolveToggle, setOptionalFlag } from './flagUtils';
import { osDefaultShell } from './shell';
import type { RootOptionsShape, ScriptsTable } from './types';

/**
 * Minimal shape accepted by {@link resolveCliOptions}.
 *
 * This exists to document the `scripts` property used for nesting and to avoid
 * undocumented inline intersections in generated TypeDoc output.
 *
 * @public
 */
export interface ResolveCliOptionsShape extends Partial<RootOptionsShape> {
  /**
   * Optional scripts table, typically injected from configuration sources and/or
   * inherited from a parent invocation via `process.env.getDotenvCliOptions`.
   */
  scripts?: ScriptsTable;
}

/**
 * Result of CLI option resolution.
 */
export interface ResolveCliOptionsResult<T> {
  /**
   * The merged options object after applying defaults, inherited parent
   * values, and the current CLI flags. This bag is used as the effective
   * root options for the current invocation.
   */
  merged: T;
  /**
   * Positional command (string) resolved for invokers that accept a command
   * payload (e.g., batch parent or cmd alias). When absent, no command is set.
   */
  command?: string;
}

/**
 * ON/OFF families other than the exclusions: the bag key, then the raw
 * Commander keys of its ON and OFF flags.
 */
const TOGGLE_FAMILIES = [
  ['debug', 'debug', 'debugOff'],
  ['loadProcess', 'loadProcess', 'loadProcessOff'],
  ['log', 'log', 'logOff'],
  ['redact', 'redact', 'redactOff'],
  ['warnEntropy', 'entropyWarn', 'entropyWarnOff'],
] as const satisfies ReadonlyArray<
  readonly [keyof RootOptionsShape, string, string]
>;

/** Exclusion families: the bag key, then the raw key of its OFF flag. */
const EXCLUSION_FAMILIES = [
  ['excludeDynamic', 'excludeDynamicOff'],
  ['excludeEnv', 'excludeEnvOff'],
  ['excludeGlobal', 'excludeGlobalOff'],
  ['excludePrivate', 'excludePrivateOff'],
  ['excludePublic', 'excludePublicOff'],
] as const satisfies ReadonlyArray<readonly [keyof RootOptionsShape, string]>;

/** Raw Commander keys that select a value and never enter the bag. */
const RAW_ONLY_KEYS = [
  ...TOGGLE_FAMILIES.map(([, , off]) => off),
  ...EXCLUSION_FAMILIES.map(([, off]) => off),
  'entropyWarn',
  'excludeAll',
  'excludeAllOff',
  'shellOff',
  'command',
  'scripts',
  // `--redact-pattern` (Commander key `redactPattern`) sets `redactPatterns`.
  'redactPattern',
];

const asBoolean = (v: unknown): boolean | undefined =>
  typeof v === 'boolean' ? v : undefined;

/**
 * Merge and normalize raw Commander options (current + parent + defaults)
 * into a GetDotenvCliOptions-like object. Types are intentionally wide to
 * avoid cross-layer coupling; callers may cast as needed.
 *
 * ON/OFF families resolve from the raw flags of this invocation: an explicit
 * ON flag gives `true`, an explicit OFF flag gives `false`, and otherwise the
 * value comes from the stack (defaults \< parent bag). For the exclusions,
 * an individual flag beats `-a`/`-A`, which beat the stack.
 */
export const resolveCliOptions = <T extends ResolveCliOptionsShape>(
  rawCliOptions: unknown,
  defaults: Partial<T>,
  parentJson?: string,
): ResolveCliOptionsResult<T> => {
  const parent: Partial<T> | undefined =
    typeof parentJson === 'string' && parentJson.length > 0
      ? (JSON.parse(parentJson) as Partial<T>)
      : undefined;

  const raw = rawCliOptions as Record<string, unknown>;
  const { command, scripts, shellOff } = raw;

  const current: Partial<T> = Object.fromEntries(
    Object.entries(raw).filter(([k]) => !RAW_ONLY_KEYS.includes(k)),
  ) as Partial<T>;
  if (Array.isArray(raw.redactPattern))
    (current as Record<string, unknown>).redactPatterns = raw.redactPattern;
  if (typeof scripts === 'string') {
    try {
      (current as Record<string, unknown>).scripts = JSON.parse(
        scripts,
      ) as ScriptsTable;
    } catch {
      // ignore parse errors; leave scripts undefined
    }
  }

  // The stack below this invocation's flags: defaults < parent bag.
  const stack = defaultsDeep<Partial<T>>({}, defaults, parent ?? {});
  const merged = defaultsDeep<Required<T>>({}, stack, current) as T;

  for (const [key, on, off] of TOGGLE_FAMILIES) {
    setOptionalFlag(
      merged,
      key,
      resolveToggle(raw[on], raw[off], asBoolean(stack[key])),
    );
  }
  for (const [key, off] of EXCLUSION_FAMILIES) {
    setOptionalFlag(
      merged,
      key,
      resolveExclusion(
        raw[key],
        raw[off],
        raw.excludeAll,
        raw.excludeAllOff,
        // A stacked individual default beats a stacked `excludeAll`.
        asBoolean(stack[key]) ?? (stack.excludeAll === true || undefined),
      ),
    );
  }
  // `excludeAll` only selects the five exclusions; it never enters the bag.
  setOptionalFlag(merged, 'excludeAll', undefined);

  // A user entropy whitelist extends the built-in one (#46).
  merged.entropyWhitelist = withBuiltInEntropyWhitelist(
    merged.entropyWhitelist,
  );

  // Normalize shell for predictability: -S (or a `false` from any layer,
  // such as a parent's -S) gives no shell; a string is kept; `true` or
  // unset gives the OS default shell.
  const shell = merged.shell;
  merged.shell =
    shellOff === true || shell === false
      ? false
      : typeof shell === 'string'
        ? shell
        : osDefaultShell();

  const cmd = typeof command === 'string' ? command : undefined;
  return cmd !== undefined ? { merged, command: cmd } : { merged };
};
