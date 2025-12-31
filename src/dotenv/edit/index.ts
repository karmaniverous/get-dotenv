/**
 * @packageDocumentation
 * Format-preserving dotenv editing utilities:
 * - Pure text pipeline: parse → apply → render
 * - FS adapter: deterministic multi-path target resolution + template bootstrap
 */

export { applyDotenvEdits } from './applyDotenvEdits';
export { editDotenvFile } from './editDotenvFile';
export { editDotenvText } from './editDotenvText';
export { parseDotenvDocument } from './parseDotenvDocument';
export { renderDotenvDocument } from './renderDotenvDocument';
export type {
  DotenvAssignmentSegment,
  DotenvBareKeySegment,
  DotenvDocument,
  DotenvDuplicateKeyStrategy,
  DotenvEditMode,
  DotenvEditOptions,
  DotenvEolMode,
  DotenvFs,
  DotenvPathSearchOrder,
  DotenvSegment,
  DotenvTargetPrivacy,
  DotenvTargetScope,
  DotenvUpdateMap,
  DotenvUpdateValue,
  EditDotenvFileOptions,
  EditDotenvFileResult,
} from './types';
