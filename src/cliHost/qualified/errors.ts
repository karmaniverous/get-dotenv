/**
 * The error argv normalization throws (spec 4.4).
 */

/**
 * A usage error found while normalizing argv: an unknown `--<alias>-*`
 * token, a missing or unexpected qualified value, a qualified option whose
 * owner isn't invoked (or takes no options there), or an option given in
 * both its plain and qualified forms.
 *
 * `GetDotenvCli.parseAsync` reports it through Commander's `error()` (exit
 * code 1, honouring `exitOverride()`); a custom host calling
 * `normalizeArgv` can do the same with `program.error(err.message)`.
 */
export class NormalizeArgvError extends Error {
  /**
   * @param message - The message, as the user sees it.
   */
  constructor(message: string) {
    super(message);
    this.name = 'NormalizeArgvError';
  }
}
