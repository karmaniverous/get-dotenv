/**
 * High-level convenience API for editing dotenv text in memory.
 *
 * Requirements addressed:
 * - Pure/text layer: parse → apply edits → render (no FS).
 *
 * @packageDocumentation
 */

import { applyDotenvEdits } from './applyDotenvEdits';
import { parseDotenvDocument } from './parseDotenvDocument';
import { renderDotenvDocument } from './renderDotenvDocument';
import type { DotenvEditOptions, DotenvUpdateMap } from './types';

/**
 * Edit dotenv text with format preservation.
 *
 * @param text - Existing dotenv text.
 * @param updates - Update map of keys to values.
 * @param options - Edit options (merge vs sync, duplicates, null/undefined behavior, EOL policy).
 * @returns Updated dotenv text.
 *
 * @public
 */
export function editDotenvText(
  text: string,
  updates: DotenvUpdateMap,
  options: DotenvEditOptions = {},
): string {
  const doc = parseDotenvDocument(text);
  const edited = applyDotenvEdits(doc, updates, {
    ...(options.mode ? { mode: options.mode } : {}),
    ...(options.duplicateKeys ? { duplicateKeys: options.duplicateKeys } : {}),
    ...(options.undefinedBehavior
      ? { undefinedBehavior: options.undefinedBehavior }
      : {}),
    ...(options.nullBehavior ? { nullBehavior: options.nullBehavior } : {}),
    ...(typeof options.defaultSeparator === 'string'
      ? { defaultSeparator: options.defaultSeparator }
      : {}),
  });
  return renderDotenvDocument(edited, options.eol ?? 'preserve');
}
