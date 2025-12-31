/**
 * Dotenv editor types (format-preserving).
 *
 * Requirements addressed:
 * - Provide a format-preserving dotenv edit surface (pure text pipeline + FS adapter).
 * - Preserve comments/blank lines/unknown lines and separator spacing; support merge vs sync.
 * - Deterministic target selection across getdotenv `paths` with optional template bootstrap.
 *
 * Notes:
 * - The parser intentionally preserves unknown lines verbatim rather than rejecting them.
 * - The editor focuses on `.env`-style KEY=VALUE lines; anything not recognized is preserved as raw text.
 *
 * @packageDocumentation
 */

/**
 * EOL policy for rendering a dotenv document.
 *
 * - `preserve`: preserve existing EOLs when possible; inserted line breaks use the detected file EOL.
 * - `lf`: normalize all line breaks to `\n`.
 * - `crlf`: normalize all line breaks to `\r\n`.
 *
 * @public
 */
export type DotenvEolMode = 'preserve' | 'lf' | 'crlf';

/**
 * Editing mode for dotenv updates.
 *
 * - `merge` (default): update/add only the provided keys; do not delete unrelated keys.
 * - `sync`: delete assignment/bare-key lines for keys not present in the update map.
 *
 * @public
 */
export type DotenvEditMode = 'merge' | 'sync';

/**
 * Strategy for handling duplicate key occurrences.
 *
 * - `all` (default): update/delete all occurrences.
 * - `first`: update/delete only the first occurrence.
 * - `last`: update/delete only the last occurrence.
 *
 * @public
 */
export type DotenvDuplicateKeyStrategy = 'all' | 'first' | 'last';

/**
 * Behavior when an update map contains a key with value `undefined`.
 *
 * - `skip` (default): do not modify existing occurrences; do not add a new key.
 *
 * @public
 */
export type DotenvUndefinedBehavior = 'skip';

/**
 * Behavior when an update map contains a key with value `null`.
 *
 * - `delete` (default): delete matching assignment/bare-key lines (subject to duplicate strategy).
 *
 * @public
 */
export type DotenvNullBehavior = 'delete';

/**
 * Update-map value types supported by the editor.
 *
 * Notes:
 * - Objects/arrays are stringified with `JSON.stringify` before writing.
 * - `null` deletes (by default).
 * - `undefined` skips (by default).
 *
 * @public
 */
export type DotenvUpdateValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, unknown>
  | Array<unknown>;

/**
 * Update map keyed by dotenv variable name.
 *
 * @public
 */
export type DotenvUpdateMap = Record<string, DotenvUpdateValue>;

/**
 * Options for editing a dotenv document in memory.
 *
 * @public
 */
export interface DotenvEditOptions {
  /**
   * Editing mode (`merge` vs `sync`).
   *
   * @defaultValue `'merge'`
   */
  mode?: DotenvEditMode;
  /**
   * Duplicate key handling strategy.
   *
   * @defaultValue `'all'`
   */
  duplicateKeys?: DotenvDuplicateKeyStrategy;
  /**
   * `undefined` behavior.
   *
   * @defaultValue `'skip'`
   */
  undefinedBehavior?: DotenvUndefinedBehavior;
  /**
   * `null` behavior.
   *
   * @defaultValue `'delete'`
   */
  nullBehavior?: DotenvNullBehavior;
  /**
   * EOL normalization policy.
   *
   * @defaultValue `'preserve'`
   */
  eol?: DotenvEolMode;
  /**
   * Separator to use when converting a bare-key placeholder into an assignment.
   *
   * @defaultValue `'='`
   */
  defaultSeparator?: string;
}

/**
 * A raw, unrecognized segment of a dotenv file. Preserved verbatim.
 *
 * @public
 */
export interface DotenvRawSegment {
  /**
   * Segment kind.
   */
  kind: 'raw';
  /**
   * Raw text (including any EOL tokens) preserved verbatim.
   */
  raw: string;
}

/**
 * Common fields for key-bearing segments (assignment or bare-key placeholder).
 *
 * @public
 */
export interface DotenvKeySegmentBase {
  /**
   * Raw text for the segment, including EOL tokens.
   */
  raw: string;
  /**
   * The parsed key name (e.g., `APP_SETTING`).
   */
  key: string;
  /**
   * Prefix before the key (indentation and optional `export` token).
   * Preserved verbatim.
   */
  prefix: string;
  /**
   * Trailing EOL token for the last physical line of this segment.
   * For segments that end at EOF without a trailing newline, this is `''`.
   */
  eol: '' | '\n' | '\r\n';
}

/**
 * A KEY=VALUE assignment segment.
 *
 * Supports single-line and multi-line quoted values (double/single quotes).
 *
 * @public
 */
export interface DotenvAssignmentSegment extends DotenvKeySegmentBase {
  /**
   * Segment kind.
   */
  kind: 'assignment';
  /**
   * Separator including surrounding whitespace (e.g., `" = "` or `"="`).
   */
  separator: string;
  /**
   * Whitespace between separator and the start of the value token (preserved).
   */
  valuePadding: string;
  /**
   * Quote style when the value was quoted in the source.
   */
  quote: '"' | "'" | null;
  /**
   * Value content (without surrounding quotes).
   *
   * Note: multiline values use `\n` internally regardless of file EOL.
   */
  value: string;
  /**
   * Suffix after the value token on the closing line (typically inline comment + spaces).
   * Preserved verbatim.
   */
  suffix: string;
}

/**
 * A bare-key placeholder segment (e.g., `KEY` or `KEY # comment`).
 *
 * @public
 */
export interface DotenvBareKeySegment extends DotenvKeySegmentBase {
  /**
   * Segment kind.
   */
  kind: 'bare';
  /**
   * Trailing text after the key (spaces and/or inline comment).
   * Preserved verbatim.
   */
  suffix: string;
}

/**
 * A parsed dotenv segment.
 *
 * @public
 */
export type DotenvSegment =
  | DotenvRawSegment
  | DotenvAssignmentSegment
  | DotenvBareKeySegment;

/**
 * A parsed dotenv document suitable for format-preserving edits.
 *
 * @public
 */
export interface DotenvDocument {
  /**
   * Detected file EOL (used for inserted line breaks when preserving).
   */
  fileEol: '\n' | '\r\n';
  /**
   * Whether the original file ended with a trailing newline.
   */
  trailingNewline: boolean;
  /**
   * Ordered segments comprising the file.
   */
  segments: DotenvSegment[];
}

/**
 * Minimal filesystem port used by the FS-level editor adapter.
 *
 * @public
 */
export interface DotenvFs {
  /**
   * Return true when a path exists.
   *
   * @param p - Path to check.
   */
  pathExists(p: string): Promise<boolean>;
  /**
   * Read a UTF-8 text file.
   *
   * @param p - Path to read.
   */
  readFile(p: string): Promise<string>;
  /**
   * Write a UTF-8 text file.
   *
   * @param p - Path to write.
   * @param contents - File contents.
   */
  writeFile(p: string, contents: string): Promise<void>;
  /**
   * Copy a file.
   *
   * @param src - Source path.
   * @param dest - Destination path.
   */
  copyFile(src: string, dest: string): Promise<void>;
}

/**
 * Dotenv target scope selector for FS-level editing.
 *
 * @public
 */
export type DotenvTargetScope = 'global' | 'env';

/**
 * Dotenv target privacy selector for FS-level editing.
 *
 * @public
 */
export type DotenvTargetPrivacy = 'public' | 'private';

/**
 * Path search order for selecting the first target match under `paths`.
 *
 * @public
 */
export type DotenvPathSearchOrder = 'reverse' | 'forward';

/**
 * Options for resolving and editing a dotenv file in a multi-path cascade.
 *
 * @public
 */
export interface EditDotenvFileOptions extends DotenvEditOptions {
  /**
   * Search paths (directories) to locate the target dotenv file.
   */
  paths: string[];
  /**
   * Base dotenv filename token.
   *
   * @defaultValue `'.env'`
   */
  dotenvToken?: string;
  /**
   * Private token used for private dotenv files.
   *
   * @defaultValue `'local'`
   */
  privateToken?: string;
  /**
   * Selected environment name (used when `scope` is `env`).
   */
  env?: string;
  /**
   * Default environment name used when `env` is not provided.
   */
  defaultEnv?: string;
  /**
   * Scope axis (global vs env-specific).
   */
  scope: DotenvTargetScope;
  /**
   * Privacy axis (public vs private).
   */
  privacy: DotenvTargetPrivacy;
  /**
   * Path search order.
   *
   * @defaultValue `'reverse'`
   */
  searchOrder?: DotenvPathSearchOrder;
  /**
   * Template extension used for bootstrap.
   *
   * When a target does not exist anywhere under `paths`, but a template exists
   * (e.g. `.env.local.template`), the template will be copied to the target
   * path and then edited in place.
   *
   * @defaultValue `'template'`
   */
  templateExtension?: string;
  /**
   * Optional filesystem port override (defaults to a Node FS adapter).
   */
  fs?: DotenvFs;
}

/**
 * Result of a successful FS-level dotenv edit.
 *
 * @public
 */
export interface EditDotenvFileResult {
  /**
   * Absolute path to the edited dotenv file.
   */
  path: string;
  /**
   * Whether the file was created from a template during this operation.
   */
  createdFromTemplate: boolean;
  /**
   * Whether the resulting file content differed from the prior content.
   */
  changed: boolean;
}

/**
 * Narrow helper for internal use: detect own properties safely.
 *
 * @internal
 */
export const hasOwn = (obj: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(obj, key);
