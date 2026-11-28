/**
 * esbuild plugin for compiling a TS config or dynamic module: bundle the
 * project's own files, but leave Node built-ins and installed packages to Node.
 */
import type { Plugin } from 'esbuild';
import { isBuiltin } from 'module';
import url from 'url';

/** Marks the nested `build.resolve` call so the plugin doesn't re-enter. */
const NESTED = 'getdotenv-externalize-nested';

/** Whether a resolved file lives in an installed package. */
const isInstalled = (resolved: string): boolean =>
  resolved.split(/[\\/]/).includes('node_modules');

/**
 * Create the plugin.
 *
 * - A Node built-in stays an import, with the `node:` prefix (so a subpath
 *   such as `readline/promises` is never handed to esbuild's resolver).
 * - An `import` that resolves into `node_modules` (an installed package)
 *   stays an import of the resolved file, as an absolute `file:` URL: Node loads the package itself (one
 *   instance, shared with the host), resolved from the importing file rather
 *   than from wherever the compiled output is written.
 * - Everything else is bundled: relative imports, `tsconfig` path aliases
 *   and workspace packages that resolve outside `node_modules` (Node can't
 *   import their TypeScript source), and `require()` calls (an ESM bundle
 *   can't `require` a URL).
 *
 * Pair it with `conditions: []`, so `exports` resolve as Node resolves them
 * (without esbuild's extra `module` condition).
 *
 * @returns The esbuild plugin.
 */
export const externalizeInstalledPackages = (): Plugin => ({
  name: 'getdotenv-externalize-installed-packages',
  setup(build) {
    build.onResolve({ filter: /.*/ }, async (args) => {
      if (args.pluginData === NESTED) return;
      const spec = args.path;
      if (isBuiltin(spec)) {
        return {
          path: spec.startsWith('node:') ? spec : `node:${spec}`,
          external: true,
        };
      }
      if (args.kind === 'require-call') return;
      const resolved = await build.resolve(spec, {
        kind: args.kind,
        importer: args.importer,
        resolveDir: args.resolveDir,
        pluginData: NESTED,
      });
      // Unresolved (empty path) or the project's own file: esbuild bundles it.
      if (!isInstalled(resolved.path)) return;
      return { path: url.pathToFileURL(resolved.path).href, external: true };
    });
  },
});
