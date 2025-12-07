/**
 * Batch services (neutral): resolve command and shell settings.
 * Shared by the generator path and the batch plugin to avoid circular deps.
 */

import type { ScriptsTable } from '@/src/cliHost/types';

// Accept undefined as an explicit shell value to interoperate with
// exactOptionalPropertyTypes in plugin-provided configs. Back-compat alias.
export type Scripts = ScriptsTable;

/**
 * Resolve a command string from the {@link Scripts} table.
 * A script may be expressed as a string or an object with a `cmd` property.
 *
 * @param scripts - Optional scripts table.
 * @param command - User-provided command name or string.
 * @returns Resolved command string (falls back to the provided command).
 */
export const resolveCommand = (
  scripts: ScriptsTable | undefined,
  command: string,
) =>
  scripts && typeof scripts[command] === 'object'
    ? (scripts[command] as { cmd: string }).cmd
    : ((scripts?.[command] as string | undefined) ?? command);

/**
 * Resolve the shell setting for a given command:
 * - If the script entry is an object, prefer its `shell` override.
 * - Otherwise use the provided `shell` (string | boolean).
 *
 * @param scripts - Optional scripts table.
 * @param command - User-provided command name or string.
 * @param shell - Global shell preference (string | boolean).
 */
export const resolveShell = <TShell extends string | boolean>(
  scripts: ScriptsTable<TShell> | undefined,
  command: string,
  shell: TShell | undefined,
): TShell | false =>
  scripts && typeof scripts[command] === 'object'
    ? ((scripts[command] as { shell?: TShell | undefined }).shell ?? false)
    : (shell ?? false);
