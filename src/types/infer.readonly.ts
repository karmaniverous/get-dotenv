/** src/types/infer.readonly.ts
 * Compile-only check for readonly inputs.
 */
import { defineGetDotenvConfig } from '../config/defineConfig';
import { getDotenv } from '../getDotenv';
import { defineDynamic } from '../GetDotenvOptions';

// defineDynamic with as const
const dyn = defineDynamic({
  KEY: 'val',
} as const);
void dyn;

// defineGetDotenvConfig with as const
type V = { A?: string };
const cfg = defineGetDotenvConfig<V>({
  vars: { A: 'a' } as const, // readonly vars
  envVars: { dev: { A: 'b' } } as const, // readonly envVars
});
void cfg;

// getDotenv with as const vars
// (getDotenv runtime usage is async, here we just check types)
async function check() {
  const vars = { EXTRA: 'val' } as const;
  const out = await getDotenv({ vars });
  // Verify inference (compiler checks this).
  // ESLint might flag unsafe access on inferred types in test context; suppress.

  const _val: 'val' = out.EXTRA;
  void _val;
}
void check;
