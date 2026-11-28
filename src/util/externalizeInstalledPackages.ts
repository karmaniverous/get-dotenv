/**
 * esbuild plugin for compiling a TS config or dynamic module: bundle the
 * module's own code, and leave Node built-ins and installed ESM packages to
 * Node.
 */
import type { Plugin } from 'esbuild';
import { readFileSync } from 'fs';
import { isBuiltin } from 'module';
import path from 'path';
import url from 'url';

/** Marks the nested `build.resolve` call so the plugin doesn't re-enter. */
const NESTED = 'getdotenv-externalize-nested';

/** Import kinds Node itself resolves; anything else (`require()`) is bundled. */
const NODE_IMPORT_KINDS = new Set(['import-statement', 'dynamic-import']);

/**
 * The package a bare specifier names: `pkg` for `pkg` or `pkg/sub`,
 * `@scope/pkg` for `@scope/pkg/sub`.
 *
 * @param spec - An import specifier.
 * @returns The package name, or `undefined` for a relative, absolute, URL or
 *   `#` (package imports) specifier.
 *
 * @internal
 */
export const packageNameOf = (spec: string): string | undefined => {
  if (
    spec.startsWith('.') ||
    spec.startsWith('#') ||
    path.isAbsolute(spec) ||
    /^[a-z][a-z\d+.-]*:/i.test(spec)
  )
    return undefined;
  const parts = spec.split('/');
  if (!spec.startsWith('@')) return parts[0];
  return parts.length > 1 ? parts.slice(0, 2).join('/') : undefined;
};

/** What the `package.json` files above a file say about it. */
interface PackageScope {
  /** `name` of the nearest `package.json` that has one. */
  name?: string;
  /** Whether the nearest `package.json` has `"type": "module"`. */
  esm: boolean;
}

const readJson = (file: string): Record<string, unknown> | undefined => {
  try {
    const data: unknown = JSON.parse(readFileSync(file, 'utf8'));
    return data && typeof data === 'object'
      ? (data as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Walk up from a file: the nearest `package.json` sets the module type (as
 * Node decides it), the nearest one with a `name` names the package.
 */
const scopeOf = (file: string): PackageScope => {
  let esm: boolean | undefined;
  for (let dir = path.dirname(file); ; dir = path.dirname(dir)) {
    const pkg = readJson(path.join(dir, 'package.json'));
    if (pkg) {
      esm ??= pkg.type === 'module';
      if (typeof pkg.name === 'string') return { name: pkg.name, esm };
    }
    if (path.dirname(dir) === dir) return { esm: esm ?? false };
  }
};

/** Whether Node loads `file` as an ES module, given its package scope. */
const isEsmFile = (file: string, scope: PackageScope): boolean => {
  const ext = path.extname(file).toLowerCase();
  return ext === '.mjs' || (ext === '.js' && scope.esm);
};

/**
 * The conditions esbuild adds to its defaults (`node`, `import`, `default`)
 * so `exports` resolve as Node's `import` resolves them: `module-sync` where
 * Node supports it, never esbuild's own `module`.
 */
const nodeImportConditions = (): string[] =>
  (process.features as { require_module?: boolean }).require_module
    ? ['module-sync']
    : [];

/**
 * Create the plugin. It sets the build's `conditions` itself, so `exports`
 * resolve as Node's `import` resolves them: `module-sync` where Node supports
 * it, never esbuild's own `module`.
 *
 * - A Node built-in stays an import, with the `node:` prefix (so a subpath
 *   such as `readline/promises` is never handed to esbuild's resolver).
 * - An `import` (static, or a literal dynamic `import()`) of a bare package
 *   specifier stays an import when it resolves to an ES module of that very
 *   package (the nearest named `package.json` above the file has the
 *   specifier's package name). It is written as the resolved file's absolute
 *   `file:` URL, so Node loads the package itself (one instance, shared with
 *   the host), resolved from the importing file rather than from wherever the
 *   compiled output is written. Linked packages (`npm link`, workspaces)
 *   count: the name decides, not the path.
 * - Everything else is bundled, as before: the entry, relative imports (also
 *   inside a config shipped in `node_modules`), `tsconfig` path aliases,
 *   TypeScript and JSON files, CommonJS packages (bundling keeps esbuild's
 *   interop, e.g. a `__esModule` default export) and `require()` calls (an
 *   ESM bundle can't `require` a URL).
 *
 * @returns The esbuild plugin.
 */
export const externalizeInstalledPackages = (): Plugin => ({
  name: 'getdotenv-externalize-installed-packages',
  setup(build) {
    build.initialOptions.conditions = nodeImportConditions();
    build.onResolve({ filter: /.*/ }, async (args) => {
      if (args.pluginData === NESTED) return;
      const spec = args.path;
      if (isBuiltin(spec)) {
        return {
          path: spec.startsWith('node:') ? spec : `node:${spec}`,
          external: true,
        };
      }
      if (!NODE_IMPORT_KINDS.has(args.kind)) return;
      const name = packageNameOf(spec);
      // Not a package name: never an installed package, even where no
      // package.json above the file has a name.
      if (name === undefined) return;
      const resolved = await build.resolve(spec, {
        kind: args.kind,
        importer: args.importer,
        resolveDir: args.resolveDir,
        pluginData: NESTED,
      });
      // An unresolved import has an empty path, which is no ES module file:
      // it falls through to esbuild, which reports it.
      const scope = scopeOf(resolved.path);
      if (scope.name !== name || !isEsmFile(resolved.path, scope)) return;
      return { path: url.pathToFileURL(resolved.path).href, external: true };
    });
  },
});
