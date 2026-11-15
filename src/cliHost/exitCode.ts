/**
 * Record a child's exit code as the process's exit code.
 *
 * A non-zero code is kept for when the process exits; a zero code leaves an
 * earlier failure in place.
 *
 * @param code - The child's exit code.
 */
export const propagateExitCode = (code: number): void => {
  if (code !== 0) process.exitCode = code;
};
