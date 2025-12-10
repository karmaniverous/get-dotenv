/** src/types/infer.defineDynamic.ts
 * Compile-only sample to assert Vars-aware defineDynamic inference.
 */
import { defineDynamic, type DynamicFn } from './GetDotenvOptions';

type Vars = {
  APP?: string;
  ENV?: string;
};

const dynamic = defineDynamic<
  Vars,
  {
    GREETING: DynamicFn<Vars>;
    TAG: string;
  }
>({
  GREETING: ({ APP = '' }) => `Hi ${APP}`,
  TAG: 'ok',
});

// Inferred types should match
const _fn: DynamicFn<Vars> = dynamic.GREETING;
const _tag: string = dynamic.TAG;

// Ensure DynamicFn arg types line up (APP/ENV from Vars)
const _exampleCall: string | undefined = _fn({ APP: 'world' }, 'dev');
void _exampleCall;
void _fn;
void _tag;

// Legacy usage remains compatible (no Vars binding)
const legacy = defineDynamic({ LEGACY: 'value' });
void legacy;
