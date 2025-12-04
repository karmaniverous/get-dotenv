# Development Plan

When updated: 2025-12-04T00:00:00Z

## Next up (near‑term, actionable)

- Type-only generics (P1): defaultsDeep overloads
  - Add intersection-based overloads (2–5 layers) to util/defaultsDeep.ts
    without changing implementation semantics (ignore undefined, replace
    arrays/non-objects).
  - Tests: add compile-only types exercise under src/types to assert
    inference; keep existing runtime tests green (util/defaultsDeep.test.ts).

- Type-only generics (P1): dotenvExpandAll key-preserving result
  - Make dotenvExpandAll generic on input map; return {[K in keyof T]:
    string | undefined}.
  - Tests: keep dotenvExpand.more.test.ts behavior assertions; add a
    compile-only types usage to ensure key mapping inference.

- Scripts typing unification (P1): generic Scripts<TShell>
  - Replace duplicate local Scripts types with unified generic from
    cliCore/types (ScriptsTable<TShell>).
  - Update services/batch/resolve to import and use ScriptsTable<TShell>;
    make resolveShell<TShell>() return TShell | false (remove URL union).
  - Propagate type changes across cmd/aws/demo/batch call sites and
    execShellCommandBatch signatures.
  - Tests: batch/index.test.ts and related compile/runtime paths remain
    green.

- Plugin config typing (P1): accessor + definePlugin overload
  - Add cliHost/readPluginConfig<T>(cli,id): T | undefined; export it.
  - Add definePlugin<TOptions, TConfig> overload that carries optional
    configSchema: ZodType<TConfig> and enables typed config at call sites.
  - Apply to shipped plugins (aws, batch) minimally to demonstrate typed
    slices without behavior changes.
  - Tests: compile-only types usage; existing plugin tests remain green.

- Dynamic typing (P2): defineDynamic Vars-aware generics
  - Export defineDynamic<Vars, T extends DynamicMap<Vars>>(d: T) => T and
    related DynamicFn/DynamicMap types.
  - Add compile-only types usage; no runtime behavior change.

- overlayEnv generics (P2): generic passthrough of key set
  - Change overlayEnv signature to return B | (B & P) depending on presence
    of programmaticVars; keep runtime semantics identical.
  - Update env/overlay.test.ts (compile) and ensure behavior assertions
    remain unchanged.

- Public API & build artifacts (P2)
  - Export new helpers/types: readPluginConfig, defineDynamic generic types,
    Scripts generic (if not already public).
  - Ensure rollup dts build emits the updated types; keep tools/verify-types
    and tools/verify-bundle-imports green.

- Docs (P2)
  - Authoring/Config: add "Typed plugin config" with readPluginConfig and
    definePlugin<TConfig> examples.
  - README Dynamic Processing: show defineDynamic Vars‑aware example.
  - Guides/Config files & overlays: note overlayEnv is compile‑time
    key‑preserving when programmaticVars provided.

- CI/types tests (P3)
  - Add src/types/*.ts compile-only samples for the new generics; ensure
    included by tsconfig and covered by "typecheck".

## Completed (recent)

**CRITICAL: Append-only list. Add new completed items at the end. Prune old completed entries from the top. Do not edit existing entries.**
