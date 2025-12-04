# Development Plan

When updated: 2025-12-04T00:00:00Z

## Next up (near‑term, actionable)

- Release hygiene:
  - Bump version as appropriate and run smoke/CI (typecheck, lint, test, build, verify:\*).

## Completed (recent)

**CRITICAL: Append-only list. Add new completed items at the end. Prune old completed entries from the top. Do not edit existing entries.**

- P1 start (types): Implemented defaultsDeep typed overloads (2–5 layers)
  without runtime changes; converted implementation to function declaration to
  support overloads. Made dotenvExpandAll generic and key-preserving while
  retaining an index signature for later dynamic additions. Added compile-only
  type samples under src/types to assert inference for both utilities.

- Follow-up (types/lint): Simplified defaultsDeep overloads (removed
  extraneous R type parameter) so multi-argument calls match correctly in
  resolveCliOptions and tests. Fixed dotenvExpandAll destructuring to remove
  an unnecessary nullish-coalescing guard flagged by ESLint. Result: typecheck
  and lint return green with no runtime changes.

— Follow-up (types): Relaxed defaultsDeep overload bounds from
Record<string, unknown> to object so Partial<T> and similar structured
types without string index signatures match 2–5 arg overloads. No runtime
behavior changes; resolves TS2554 at multi-arg call sites.

— P1 (scripts typing): Unified Scripts typing across CLI/core/services by
using ScriptsTable<TShell>. Refactored services/batch/resolve to import the
generic table and updated resolveShell to be generic returning TShell | false.
Kept the exported Scripts alias for back-compat. No runtime changes.

— P1 (plugin config accessor): Added cliHost/readPluginConfig<T>() and
exported it from cliHost/index. Introduced a definePlugin overload that
carries a typed configSchema parameter (compile-time aid only; runtime
behavior unchanged). Shipped plugins to adopt overload in a follow-up.

— Project prompt (typing & DX): Added a HARD RULE section to stan.project.md
mandating inference-first design (generics over casts), public APIs that
infer without explicit type parameters, and DX as a non-negotiable. Exceptions
require a brief design discussion recorded in the dev plan.

- Fix overload compatibility (types only): aligned defaultsDeep implementation
  signature to `T extends object` to match object-based overload heads. Resolved
  TS2554 (“Expected 0–1 arguments”) at multi-arg call sites (resolveCliOptions,
  computeContext, defaultsDeep tests). No runtime behavior changes.

- Scripts typing (exactOptionalPropertyTypes): widened
  `ScriptsTable<TShell>` to `shell?: TShell | undefined` and adjusted
  resolveShell’s internal cast accordingly. This accepts merged shapes that may
  carry `shell?: string | boolean | undefined` without casts, resolving TS2345
  in batch/actions.

- readPluginConfig DX/lint: removed the unnecessary optional chain on
  `cli.getCtx()`; locally disabled `no-unnecessary-type-parameters` with a
  rationale (typed accessor for downstream inference). No runtime changes.

- defaultsDeep overload (single generic, variadic): added a typed head
  `defaultsDeep<T extends object>(...layers: Array<Partial<T>|undefined>): T`
  to cover explicit single-type-arg multi-arg calls. Resolves remaining
  TS2554 in resolveCliOptions, computeContext, and tests without changing
  runtime behavior.

- readPluginConfig: asserted non-null ctx via `getCtx()!` to satisfy TS2532.

- readPluginConfig lint: replaced non-null assertion on `getCtx()` with a small
  runtime guard (`const ctx = cli.getCtx(); if (!ctx) return undefined;`) to
  satisfy @typescript-eslint/no-non-null-assertion. Behavior unchanged.

- Docs: Authoring/Config — added “Typed accessor (DX)” section showing
  readPluginConfig<T>() usage together with configSchema so plugin authors can
  retrieve validated, typed slices ergonomically.

- Docs: Shipped Plugins index — fixed a typo in the plugin list (“imit” →
  “init”) so the link text matches the actual init plugin and its page.

- P2 (types): defineDynamic Vars-aware generics — added DynamicFn/DynamicMap
  types and an overload to bind Vars for improved inference; preserved the
  legacy defineDynamic signature for backward compatibility (runtime unchanged).

- P2 (types): overlayEnv key-preserving overloads — added call signatures so
  the result is B when no programmaticVars is provided and B & P when it is;
  implementation unchanged (progressive expansion per slice).

- Fix overload implementations: converted mixed overload + const patterns to
  proper function overloads with a single implementation for both
  `defineDynamic` and `overlayEnv`, resolving duplicate identifier and missing
  implementation type errors during typecheck.

- Types (compile-only samples): added src/types/infer.defineDynamic.ts to assert
  Vars-aware defineDynamic inference and src/types/infer.overlayEnv.ts to assert
  overlayEnv key-preserving return (B | B & P) at compile time. No runtime code.

- README: added a brief Vars-aware defineDynamic example (TypeScript) under
  Dynamic Processing to demonstrate binding a Vars shape for stronger inference.

- Docs (Config): added a “Compile‑time key preservation (overlayEnv)” note and
  example showing that overlayEnv returns B when no programmaticVars is provided
  and B & P when it is, with a short code snippet illustrating the behavior.

- Shipped plugins typed config (DX): adopted readPluginConfig<T>() in aws and batch to access validated, merged slices ergonomically; showcased definePlugin<TConfig> usage in both plugins (compile‑time only). No runtime behavior changes.

- Docs follow‑through (typed config): added short “Typed config (DX)” snippets to shipped plugin pages (aws, batch) referencing readPluginConfig<T>() so authors can retrieve typed slices with minimal ceremony.

- Public API/build verification: augmented tools/verify-types.js to assert
  presence of DynamicFn/DynamicMap in index.d.ts (or .d.mts) and to detect
  overlayEnv/programmaticVars surface in env-overlay.d.ts (or .d.mts) so CI
  catches regressions in public type bundles.

- Amendment: verify-types.js lint cleanup (no-unused-vars) by tracking selected
  declaration files (indexFound/overlayFound); no behavior change.

- Amendment: verify-types.js overlayEnv detection — allow optional generic
  parameter list (e.g., overlayEnv<T>(...)) to avoid false negatives.