import { defaultsDeep } from '../util/defaultsDeep';
import {
  resolveExclusion,
  resolveExclusionAll,
  setOptionalFlag,
} from './flagUtils';

/**
 * Merge and normalize raw Commander options (current + parent + defaults)
 * into a GetDotenvCliOptions-like object. Types are intentionally wide to
 * avoid cross-layer coupling; callers may cast as needed.
 */
export const resolveCliOptions = (
  rawCliOptions: Record<string, unknown>,
  defaults: Record<string, unknown>,
  parentJson?: string,
): { merged: Record<string, unknown>; command?: string } => {
  const parent =
    typeof parentJson === 'string' && parentJson.length > 0
      ? (JSON.parse(parentJson) as Record<string, unknown>)
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
    scripts,
    shellOff,
    ...rest
  } = rawCliOptions ?? {};

  const current: Record<string, unknown> = { ...rest };
  if (typeof scripts === 'string') {
    try {
      current.scripts = JSON.parse(scripts);
    } catch {
      // ignore parse errors; leave scripts undefined
    }
  }

  const merged = defaultsDeep(parent ?? {}, current) as Record<string, unknown>;

  const d = defaults;
  const boolOrUndef = (v: unknown) => (typeof v === 'boolean' ? v : undefined);

  setOptionalFlag(
    merged,
    'debug',
    resolveExclusion(
      merged.debug as boolean | undefined,
      debugOff as true | undefined,
      boolOrUndef(d.debug),
    ),
  );
  setOptionalFlag(
    merged,
    'excludeDynamic',
    resolveExclusionAll(
      merged.excludeDynamic as boolean | undefined,
      excludeDynamicOff as true | undefined,
      boolOrUndef(d.excludeDynamic),
      excludeAll as true | undefined,
      excludeAllOff as true | undefined,
    ),
  );
  setOptionalFlag(
    merged,
    'excludeEnv',
    resolveExclusionAll(
      merged.excludeEnv as boolean | undefined,
      excludeEnvOff as true | undefined,
      boolOrUndef(d.excludeEnv),
      excludeAll as true | undefined,
      excludeAllOff as true | undefined,
    ),
  );
  setOptionalFlag(
    merged,
    'excludeGlobal',
    resolveExclusionAll(
      merged.excludeGlobal as boolean | undefined,
      excludeGlobalOff as true | undefined,
      boolOrUndef(d.excludeGlobal),
      excludeAll as true | undefined,
      excludeAllOff as true | undefined,
    ),
  );
  setOptionalFlag(
    merged,
    'excludePrivate',
    resolveExclusionAll(
      merged.excludePrivate as boolean | undefined,
      excludePrivateOff as true | undefined,
      boolOrUndef(d.excludePrivate),
      excludeAll as true | undefined,
      excludeAllOff as true | undefined,
    ),
  );
  setOptionalFlag(
    merged,
    'excludePublic',
    resolveExclusionAll(
      merged.excludePublic as boolean | undefined,
      excludePublicOff as true | undefined,
      boolOrUndef(d.excludePublic),
      excludeAll as true | undefined,
      excludeAllOff as true | undefined,
    ),
  );
  setOptionalFlag(
    merged,
    'log',
    resolveExclusion(
      merged.log as boolean | undefined,
      logOff as true | undefined,
      boolOrUndef(d.log),
    ),
  );
  setOptionalFlag(
    merged,
    'loadProcess',
    resolveExclusion(
      merged.loadProcess as boolean | undefined,
      loadProcessOff as true | undefined,
      boolOrUndef(d.loadProcess),
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

  return {
    merged,
    command: typeof command === 'string' ? command : undefined,
  };
};
