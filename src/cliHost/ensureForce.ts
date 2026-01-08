/**
 * Non-interactive confirm guard for destructive ops.
 * Returns true when force is provided; otherwise warns and sets exitCode.
 *
 * @param force - The force flag value (truthy allows proceed).
 * @param op - Operation name for the warning message.
 */
export function ensureForce(force: unknown, op: string): boolean {
  if (force) return true;
  console.warn(`${op} requires confirmation. Re-run with --force to proceed.`);
  process.exitCode = 2;
  return false;
}
