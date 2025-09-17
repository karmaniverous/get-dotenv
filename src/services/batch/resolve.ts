/**
 * Batch services (neutral): resolve command and shell settings.
 * Shared by the generator path and the batch plugin to avoid circular deps.
 */

// Minimal Scripts shape (kept local to avoid generator coupling).
export type Scripts = Record<
  string,
  string | { cmd: string; shell?: string | boolean }
>;

/**
 * Resolve a command string from the {@link Scripts} table.
 * A script may be expressed as a string or an object with a `cmd` property.
 *
 * @param scripts - Optional scripts table.
 * @param command - User-provided command name or string.
 * @returns Resolved command string (falls back to the provided command).
 */
export const resolveCommand = (
  scripts: Scripts | undefined,
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
export const resolveShell = (
  scripts: Scripts | undefined,
  command: string,
  shell: string | boolean | undefined,
): string | boolean | URL =>
  scripts && typeof scripts[command] === 'object'
    ? ((scripts[command] as { shell?: string | boolean }).shell ?? false)
    : (shell ?? false);
