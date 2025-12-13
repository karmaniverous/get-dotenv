import { defaultsDeep } from '@/src/util';

import {
  resolveExclusion,
  resolveExclusionAll,
  setOptionalFlag,
} from './flagUtils';
import type { RootOptionsShape, ScriptsTable } from './types';

/**
 * Result of CLI option resolution.
 */
export interface ResolveCliOptionsResult<T> {
  merged: T;
  command?: string;
}

/**
 * Merge and normalize raw Commander options (current + parent + defaults)
 * into a GetDotenvCliOptions-like object. Types are intentionally wide to
 * avoid cross-layer coupling; callers may cast as needed.
 */
export const resolveCliOptions = <
  T extends Partial<RootOptionsShape> & { scripts?: ScriptsTable },
>(
  rawCliOptions: unknown,
  defaults: Partial<T>,
  parentJson?: string,
): ResolveCliOptionsResult<T> => {
  const parent: Partial<T> | undefined =
    typeof parentJson === 'string' && parentJson.length > 0
      ? (JSON.parse(parentJson) as Partial<T>)
      : undefined;

  const {
    command,
    debugOff,
    excludeAll,
    excludeAllOff,
    excludeDynamicOff,
    excludeEnvOff,
    excludeGlobalOff,
    excludePrivateOff,
    excludePublicOff,
    loadProcessOff,
    logOff,
    entropyWarn,
    entropyWarnOff,
    scripts,
    shellOff,
    ...rest
  } = rawCliOptions as Partial<T> & Record<string, unknown>;

  const current: Partial<T> = { ...(rest as Partial<T>) };
  if (typeof (scripts as unknown) === 'string') {
    try {
      (current as Record<string, unknown>).scripts = JSON.parse(
        scripts as unknown as string,
      ) as ScriptsTable;
    } catch {
      // ignore parse errors; leave scripts undefined
    }
  }

  const merged = defaultsDeep<Required<T>>(
    {} as Required<T>,
    defaults,
    parent ?? ({} as Partial<T>),
    current,
  ) as T;

  const d = defaults;
  setOptionalFlag(
    merged,
    'debug',
    resolveExclusion(merged.debug, debugOff as true | undefined, d.debug),
  );
  setOptionalFlag(
    merged,
    'excludeDynamic',
    resolveExclusionAll(
      merged.excludeDynamic,
      excludeDynamicOff as true | undefined,
      d.excludeDynamic,
      excludeAll as true | undefined,
      excludeAllOff as true | undefined,
    ),
  );
  setOptionalFlag(
    merged,
    'excludeEnv',
    resolveExclusionAll(
      merged.excludeEnv,
      excludeEnvOff as true | undefined,
      d.excludeEnv,
      excludeAll as true | undefined,
      excludeAllOff as true | undefined,
    ),
  );
  setOptionalFlag(
    merged,
    'excludeGlobal',
    resolveExclusionAll(
      merged.excludeGlobal,
      excludeGlobalOff as true | undefined,
      d.excludeGlobal,
      excludeAll as true | undefined,
      excludeAllOff as true | undefined,
    ),
  );
  setOptionalFlag(
    merged,
    'excludePrivate',
    resolveExclusionAll(
      merged.excludePrivate,
      excludePrivateOff as true | undefined,
      d.excludePrivate,
      excludeAll as true | undefined,
      excludeAllOff as true | undefined,
    ),
  );
  setOptionalFlag(
    merged,
    'excludePublic',
    resolveExclusionAll(
      merged.excludePublic,
      excludePublicOff as true | undefined,
      d.excludePublic,
      excludeAll as true | undefined,
      excludeAllOff as true | undefined,
    ),
  );
  setOptionalFlag(
    merged,
    'log',
    resolveExclusion(merged.log, logOff as true | undefined, d.log),
  );
  setOptionalFlag(
    merged,
    'loadProcess',
    resolveExclusion(
      merged.loadProcess,
      loadProcessOff as true | undefined,
      d.loadProcess,
    ),
  );
  // warnEntropy (tri-state)
  setOptionalFlag(
    merged,
    'warnEntropy',
    resolveExclusion(
      merged.warnEntropy,
      entropyWarnOff as true | undefined,
      d.warnEntropy,
    ),
  );

  // Normalize shell for predictability: explicit default shell per OS.
  const defaultShell =
    process.platform === 'win32' ? 'powershell.exe' : '/bin/bash';
  let resolvedShell = merged.shell;
  if (shellOff) resolvedShell = false;
  else if (resolvedShell === true || resolvedShell === undefined) {
    resolvedShell = defaultShell;
  } else if (
    typeof resolvedShell !== 'string' &&
    typeof defaults.shell === 'string'
  ) {
    resolvedShell = defaults.shell;
  }
  merged.shell = resolvedShell;

  const cmd = typeof command === 'string' ? command : undefined;
  return cmd !== undefined ? { merged, command: cmd } : { merged };
};
