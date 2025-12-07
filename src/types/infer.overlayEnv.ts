/** src/types/infer.overlayEnv.ts
 * Compile-only sample to assert overlayEnv key-preserving return types.
 */
import { overlayEnv } from '@/src/env/overlay';

type B = { A?: string; BASE?: string };
const base: B = { A: 'a' };

// No programmatic vars: return type should be B
const out1 = overlayEnv({
  base,
  env: undefined,
  configs: {},
});
const _check1: B = out1;
void _check1;

// With programmatic vars: return type should be B & P
type P = { EXTRA?: string };
const prog: P = { EXTRA: 'x' };
const out2 = overlayEnv({
  base,
  env: 'dev',
  configs: {},
  programmaticVars: prog,
});
const _check2: B & P = out2;
void _check2;
