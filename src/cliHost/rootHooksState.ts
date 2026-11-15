/**
 * Per-program state shared by the root hooks, the lazy context resolver and
 * the cmd alias, so a run composes its dotenv context once.
 *
 * Commander gives every parse a fresh `rawArgs` array, which serves as the
 * identity of the current parse.
 */

/** Programs whose root hooks (`installRootHooks`) are installed. */
const ROOT_HOOKS = new WeakSet<object>();

/** Program → the `rawArgs` of the parse in which the root hooks composed. */
const COMPOSED_FOR = new WeakMap<object, unknown>();

const rawArgsOf = (program: object): unknown =>
  (program as { rawArgs?: unknown }).rawArgs;

/**
 * Record that the root hooks are installed on `program`.
 *
 * @param program - The root command.
 */
export const markRootHooks = (program: object): void => {
  ROOT_HOOKS.add(program);
};

/**
 * Whether the root hooks are installed on `program`; a bare host without
 * them relies on the lazy context resolver instead.
 *
 * @param program - The root command.
 * @returns `true` when `installRootHooks` ran for `program`.
 */
export const hasRootHooks = (program: object): boolean =>
  ROOT_HOOKS.has(program);

/**
 * Record that the root hooks composed the context in the current parse.
 *
 * @param program - The root command.
 */
export const markComposed = (program: object): void => {
  COMPOSED_FOR.set(program, rawArgsOf(program));
};

/**
 * Whether the root hooks already composed the context in the current parse
 * of `program` (a context left from an earlier parse doesn't count).
 *
 * @param program - The root command.
 * @returns `true` when this parse already has its composition.
 */
export const composedThisParse = (program: object): boolean => {
  const raw = rawArgsOf(program);
  return raw !== undefined && COMPOSED_FOR.get(program) === raw;
};
