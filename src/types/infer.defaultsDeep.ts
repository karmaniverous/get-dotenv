/** src/types/infer.defaultsDeep.ts
 * Compile-only sample to assert defaultsDeep intersection inference.
 */
import { defaultsDeep } from '../util/defaultsDeep';

type A = {
  a?: number;
  nested?: { x?: string };
};
type B = {
  b?: boolean;
  nested?: { y?: number };
};
type C = {
  c?: string;
};

const a: Partial<A> = { a: 1, nested: { x: 'x' } };
const b: Partial<B> = { b: true, nested: { y: 2 } };
const c: Partial<C> = { c: 'c' };

const merged = defaultsDeep(a, b, c);

// Inferred type should include properties from A, B, and C with merged nested shape.
const _check: {
  a?: number;
  b?: boolean;
  c?: string;
  nested?: { x?: string; y?: number };
} = merged;
