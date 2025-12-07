/** src/types/infer.dotenvExpandAll.ts
 * Compile-only sample to assert dotenvExpandAll key-preserving return type.
 */
import { dotenvExpandAll } from '@/src/dotenvExpand';

const input = {
  A: '1' as string,
  B: undefined as string | undefined,
};

const out = dotenvExpandAll(input, { progressive: true });

// out must preserve keys A and B and permit generic indexing.
const _expectShape: {
  A: string | undefined;
  B: string | undefined;
  [k: string]: string | undefined;
} = out;

void _expectShape;
