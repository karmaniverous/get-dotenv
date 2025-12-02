import { type AddHelpTextContext, Command, Option } from 'commander';
import fs from 'fs-extra';
import { packageDirectory } from 'package-directory';
import { fileURLToPath } from 'url';

import type { GetDotenvCliOptions } from '../generateGetDotenvCli/GetDotenvCliOptions';
import type { ProcessEnv } from '../GetDotenvOptions';
// NOTE: host class kept thin; heavy context computation lives in computeContext.
import {
  type GetDotenvOptions,
  resolveGetDotenvOptions,
} from '../GetDotenvOptions';
import { getDotenvOptionsSchemaResolved } from '../schema/getDotenvOptions';
import { computeContext } from './computeContext';
import type { GetDotenvCliPlugin, GetDotenvCliPublic } from './definePlugin';

// Dynamic help support: attach a private symbol to Option for description fns.
const DYN_DESC_SYM = Symbol('getdotenv.dynamic.description');

export type ResolvedHelpConfig = GetDotenvOptions & {
  plugins: Record<string, unknown>;
};

/** * Per-invocation context shared with plugins and actions. */
export type GetDotenvCliCtx<
  TOptions extends GetDotenvOptions = GetDotenvOptions,
> = {
  optionsResolved: TOptions;
  dotenv: ProcessEnv;
  plugins?: Record<string, unknown>;
  pluginConfigs?: Record<string, unknown>;
};
const HOST_META_URL = import.meta.url;

const CTX_SYMBOL = Symbol('GetDotenvCli.ctx');
const OPTS_SYMBOL = Symbol('GetDotenvCli.options');
const HELP_HEADER_SYMBOL = Symbol('GetDotenvCli.helpHeader');

/**
 * Plugin-first CLI host for get-dotenv. Extends Commander.Command.
 *
 * Responsibilities:
 * - Resolve options strictly and compute dotenv context (resolveAndLoad).
 * - Expose a stable accessor for the current context (getCtx).
 * - Provide a namespacing helper (ns).
 * - Support composable plugins with parent → children install and afterResolve.
 *
 * NOTE: This host is additive and does not alter the legacy CLI.
 */
export class GetDotenvCli<
  TOptions extends GetDotenvOptions = GetDotenvOptions,
> extends Command {
  /** Registered top-level plugins (composition happens via .use()) */
  private _plugins: GetDotenvCliPlugin[] = [];
  /** One-time installation guard */
  private _installed = false;
  /** Optional header line to prepend in help output */
  private [HELP_HEADER_SYMBOL]: string | undefined;
  /**
   * Create a subcommand using the same subclass, preserving helpers like
   * dynamicOption on children.
   */
  override createCommand(name?: string): Command {
    return new (this.constructor as typeof GetDotenvCli)(name);
  }
  constructor(alias = 'getdotenv') {
    super(alias);
    // Ensure subcommands that use passThroughOptions can be attached safely.
    // Commander requires parent commands to enable positional options when a
    // child uses passThroughOptions.
    this.enablePositionalOptions();
    // Configure grouped help: show only base options in default "Options";
    // append App/Plugin sections after default help.
    this.configureHelp({
      visibleOptions: (cmd: Command): Option[] => {
        const all =
          (cmd as unknown as { options?: Option[] }).options ??
          ([] as Option[]);
        const base = all.filter((opt) => {
          const group = (opt as unknown as { __group?: string }).__group;
          return group === 'base';
        });
        // Sort: short-aliased options first, then long-only; stable by flags.
        const hasShort = (opt: Option) => {
          const flags = (opt as unknown as { flags?: string }).flags ?? '';
          // Matches "-x," or starting "-x " before any long
          return /(^|\s|,)-[A-Za-z]/.test(flags);
        };
        const byFlags = (opt: Option) =>
          (opt as unknown as { flags?: string }).flags ?? '';
        base.sort((a, b) => {
          const aS = hasShort(a) ? 1 : 0;
          const bS = hasShort(b) ? 1 : 0;
          return bS - aS || byFlags(a).localeCompare(byFlags(b));
        });
        return base;
      },
    });
    this.addHelpText('beforeAll', () => {
      const header = this[HELP_HEADER_SYMBOL];
      return header && header.length > 0 ? `${header}\n\n` : '';
    });
    this.addHelpText('afterAll', (ctx: AddHelpTextContext) =>
      this.#renderOptionGroups(ctx.command),
    );
    // Skeleton preSubcommand hook: produce a context if absent, without
    // mutating process.env. The passOptions hook (when installed) will    // compute the final context using merged CLI options; keeping
    // loadProcess=false here avoids leaking dotenv values into the parent
    // process env before subcommands execute.
    this.hook('preSubcommand', async () => {
      if (this.getCtx()) return;
      await this.resolveAndLoad({ loadProcess: false } as Partial<TOptions>);
    });
  }

  /**
   * Resolve options (strict) and compute dotenv context.
   * Stores the context on the instance under a symbol.
   *
   * Options:
   * - opts.runAfterResolve (default true): when false, skips running plugin
   *   afterResolve hooks. Useful for top-level help rendering to avoid
   *   long-running side-effects while still evaluating dynamic help text.
   */
  async resolveAndLoad(
    customOptions: Partial<TOptions> = {},
    opts?: { runAfterResolve?: boolean },
  ): Promise<GetDotenvCliCtx<TOptions>> {
    // Resolve defaults, then validate strictly under the new host.
    const optionsResolved = await resolveGetDotenvOptions(
      customOptions as Partial<GetDotenvOptions>,
    );
    getDotenvOptionsSchemaResolved.parse(optionsResolved);

    // Delegate the heavy lifting to the shared helper (guarded path supported).
    const ctx = await computeContext<TOptions>(
      optionsResolved as unknown as Partial<TOptions>,
      this._plugins,
      HOST_META_URL,
    );

    // Persist context on the instance for later access.
    (this as unknown as Record<symbol, GetDotenvCliCtx<TOptions>>)[CTX_SYMBOL] =
      ctx;

    // Ensure plugins are installed exactly once, then run afterResolve.
    await this.install();
    if (opts?.runAfterResolve ?? true) {
      await this._runAfterResolve(ctx);
    }

    return ctx;
  }

  /**
   * Create a Commander Option that computes its description at help time.
   * The returned Option may be configured (conflicts, default, parser) and
   * added via addOption().
   */
  createDynamicOption(
    flags: string,
    desc: (cfg: ResolvedHelpConfig) => string,
    parser?: (value: string, previous?: unknown) => unknown,
    defaultValue?: unknown,
  ): Option {
    const opt = new (Option as unknown as {
      new (f: string, d?: string): Option;
    })(flags, '');
    // Keep the function on a private symbol so it survives through Commander.
    (opt as unknown as Record<symbol, unknown>)[DYN_DESC_SYM] = desc;
    if (parser) opt.argParser(parser as (value: string) => unknown);
    if (defaultValue !== undefined) opt.default(defaultValue as unknown);
    return opt;
  }

  /**
   * Chainable helper mirroring .option(), but with a dynamic description.
   * Equivalent to addOption(createDynamicOption(...)).
   */
  dynamicOption(
    flags: string,
    desc: (cfg: ResolvedHelpConfig) => string,
    parser?: (value: string, previous?: unknown) => unknown,
    defaultValue?: unknown,
  ): this {
    const opt = this.createDynamicOption(flags, desc, parser, defaultValue);
    this.addOption(opt);
    return this;
  }

  /**
   * Evaluate dynamic descriptions for this command and all descendants using
   * the provided resolved configuration. Mutates the Option.description in
   * place so Commander help renders updated text.
   */
  evaluateDynamicOptions(resolved: ResolvedHelpConfig): void {
    const visit = (cmd: Command) => {
      const arr = (cmd as unknown as { options?: Option[] }).options ?? [];
      for (const o of arr) {
        const dyn = (o as unknown as Record<symbol, unknown>)[DYN_DESC_SYM];
        if (typeof dyn === 'function') {
          try {
            const txt = (dyn as (c: ResolvedHelpConfig) => string)(resolved);
            // Commander Option has a public "description" field used by help.
            (o as unknown as { description?: string }).description = txt;
          } catch {
            // Best-effort: leave description as-is on evaluation failure.
          }
        }
      }
      const children =
        (cmd as unknown as { commands?: Command[] }).commands ?? [];
      for (const c of children) visit(c);
    };
    visit(this as unknown as Command);
  }

  /**
   * Retrieve the current invocation context (if any).
   */
  getCtx(): GetDotenvCliCtx<TOptions> | undefined {
    return (this as unknown as Record<symbol, GetDotenvCliCtx<TOptions>>)[
      CTX_SYMBOL
    ];
  }

  /**
   * Retrieve the merged root CLI options bag (if set by passOptions()).
   * Downstream-safe: no generics required.
   */
  getOptions(): GetDotenvCliOptions | undefined {
    return (this as unknown as Record<symbol, GetDotenvCliOptions | undefined>)[
      OPTS_SYMBOL
    ];
  }

  /** Internal: set the merged root options bag for this run. */
  _setOptionsBag(bag: GetDotenvCliOptions): void {
    (this as unknown as Record<symbol, GetDotenvCliOptions>)[OPTS_SYMBOL] = bag;
  }

  /**   * Convenience helper to create a namespaced subcommand.
   */
  ns(name: string): Command {
    return this.command(name);
  }

  /**
   * Tag options added during the provided callback as 'app' for grouped help.
   * Allows downstream apps to demarcate their root-level options.
   */
  tagAppOptions<T>(fn: (root: Command) => T): T {
    const root = this as unknown as Command;
    const originalAddOption = root.addOption.bind(root);
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const originalOption = root.option.bind(root) as unknown as (
      ...args: unknown[]
    ) => Command;
    const tagLatest = (cmd: Command, group: string) => {
      const optsArr = (cmd as unknown as { options?: unknown[] }).options;
      if (Array.isArray(optsArr) && optsArr.length > 0) {
        const last = optsArr[optsArr.length - 1] as Record<string, unknown>;
        last.__group = group;
      }
    };
    root.addOption = function patchedAdd(this: Command, opt: Option) {
      (opt as unknown as Record<string, unknown>).__group = 'app';
      return originalAddOption(opt);
    } as Command['addOption'];
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    root.option = function patchedOption(
      this: Command,
      ...args: Parameters<Command['option']>
    ) {
      const ret = originalOption(...(args as unknown[]));
      tagLatest(this, 'app');
      return ret;
    } as Command['option'];
    try {
      return fn(root);
    } finally {
      root.addOption = originalAddOption;
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      root.option = originalOption as unknown as Command['option'];
    }
  }

  /**
   * Branding helper: set CLI name/description/version and optional help header.
   * If version is omitted and importMetaUrl is provided, attempts to read the
   * nearest package.json version (best-effort; non-fatal on failure).
   */
  async brand(args: {
    name?: string;
    description?: string;
    version?: string;
    importMetaUrl?: string;
    helpHeader?: string;
  }): Promise<this> {
    const { name, description, version, importMetaUrl, helpHeader } = args;
    if (typeof name === 'string' && name.length > 0) this.name(name);
    if (typeof description === 'string') this.description(description);
    let v = version;
    if (!v && importMetaUrl) {
      try {
        const fromUrl = fileURLToPath(importMetaUrl);
        const pkgDir = await packageDirectory({ cwd: fromUrl });
        if (pkgDir) {
          const txt = await fs.readFile(`${pkgDir}/package.json`, 'utf-8');
          const pkg = JSON.parse(txt) as { version?: string };
          if (pkg.version) v = pkg.version;
        }
      } catch {
        // best-effort only
      }
    }
    if (v) this.version(v);
    // Help header:
    // - If caller provides helpHeader, use it.
    // - Otherwise, when a version is known, default to "<name> v<version>".
    if (typeof helpHeader === 'string') {
      this[HELP_HEADER_SYMBOL] = helpHeader;
    } else if (v) {
      // Use the current command name (possibly overridden by 'name' above).
      const header = `${this.name()} v${v}`;
      this[HELP_HEADER_SYMBOL] = header;
    }
    return this;
  }
  /**
   * Register a plugin for installation (parent level).
   * Installation occurs on first resolveAndLoad() (or explicit install()).
   */
  use(plugin: GetDotenvCliPlugin): this {
    this._plugins.push(plugin);
    // Immediately run setup so subcommands exist before parsing.
    const setupOne = (p: GetDotenvCliPlugin) => {
      const maybe = p.setup(this as unknown as GetDotenvCliPublic);
      // Best-effort: ignore async completion for registration-only setup.
      void maybe;
      for (const child of p.children) setupOne(child);
    };
    setupOne(plugin);
    return this;
  }

  /**
   * Install all registered plugins in parent → children (pre-order).
   * Runs only once per CLI instance.
   */
  async install(): Promise<void> {
    // Setup is performed immediately in use(); here we only guard for afterResolve.
    this._installed = true;
    // Satisfy require-await without altering behavior.
    await Promise.resolve();
  }

  /**
   * Run afterResolve hooks for all plugins (parent → children).
   */
  private async _runAfterResolve(
    ctx: GetDotenvCliCtx<TOptions>,
  ): Promise<void> {
    const run = async (p: GetDotenvCliPlugin) => {
      if (p.afterResolve)
        await p.afterResolve(
          this as unknown as GetDotenvCliPublic,
          ctx as unknown as GetDotenvCliCtx,
        );
      for (const child of p.children) await run(child);
    };
    for (const p of this._plugins) await run(p);
  }

  // Render App/Plugin grouped options appended after default help.
  #renderOptionGroups(cmd: Command): string {
    const all = (cmd as unknown as { options?: unknown[] }).options ?? [];
    type Row = { flags: string; description: string };
    const byGroup = new Map<string, Row[]>();
    for (const o of all) {
      const opt = o as {
        flags?: string;
        description?: string;
        __group?: string;
      };
      const g = opt.__group;
      if (!g || g === 'base') continue; // base handled by default help
      const rows = byGroup.get(g) ?? [];
      rows.push({
        flags: opt.flags ?? '',
        description: opt.description ?? '',
      });
      byGroup.set(g, rows);
    }
    if (byGroup.size === 0) return '';
    const renderRows = (title: string, rows: Row[]) => {
      const width = Math.min(
        40,
        rows.reduce((m, r) => Math.max(m, r.flags.length), 0),
      );
      // Sort within group: short-aliased flags first
      rows.sort((a, b) => {
        const aS = /(^|\s|,)-[A-Za-z]/.test(a.flags) ? 1 : 0;
        const bS = /(^|\s|,)-[A-Za-z]/.test(b.flags) ? 1 : 0;
        return bS - aS || a.flags.localeCompare(b.flags);
      });
      const lines = rows
        .map((r) => {
          const pad = ' '.repeat(Math.max(2, width - r.flags.length + 2));
          return `  ${r.flags}${pad}${r.description}`.trimEnd();
        })
        .join('\n');
      return `\n${title}:\n${lines}\n`;
    };
    let out = '';
    // App options (if any)
    const app = byGroup.get('app');
    if (app && app.length > 0) {
      out += renderRows('App options', app);
    }
    // Plugin groups sorted by id
    const pluginKeys = Array.from(byGroup.keys()).filter((k) =>
      k.startsWith('plugin:'),
    );
    pluginKeys.sort((a, b) => a.localeCompare(b));
    for (const k of pluginKeys) {
      const id = k.slice('plugin:'.length) || '(unknown)';
      const rows = byGroup.get(k) ?? [];
      if (rows.length > 0) {
        out += renderRows(`Plugin options — ${id}`, rows);
      }
    }
    return out;
  }
}
