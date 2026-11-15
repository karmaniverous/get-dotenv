/**
 * @packageDocumentation
 * Dotenv expansion helpers. Exported for consumers that need string and
 * record expansion semantics compatible with get-dotenv (including nested
 * defaults; a referenced value is substituted verbatim).
 *
 * This module also exports format-preserving dotenv edit utilities under
 * `./edit` for in-place updates that preserve comments, whitespace, ordering,
 * and unknown lines.
 */

export * from './dotenvExpand';
export * from './edit';
