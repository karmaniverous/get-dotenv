/**
 * Qualified option names (spec 4.2–4.3, Decisions 17, 20, 24, 28).
 *
 * Public: {@link terminatorName} (re-exported from `cliHost`). The rest is
 * internal to the host: the table built in `GetDotenvCli.parseAsync`, its
 * accessor, and the naming helpers host help labels its sections with.
 */
export { NormalizeArgvError } from './errors';
export { commandLabel, commandPathOf } from './names';
export {
  type Normalization,
  normalizeArgv,
  normalizeQualified,
} from './normalize';
export { isTerminatorOption } from './register';
export {
  ensureQualifiedNameTable,
  type QualifiedNameEntry,
  type QualifiedNameTable,
  qualifiedNameTableOf,
} from './table';
export { terminatorName } from './terminator';
