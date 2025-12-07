import type { Option } from 'commander';
import { Command } from 'commander';
import fs from 'fs-extra';
import { packageDirectory } from 'package-directory';
import { fileURLToPath } from 'url';

import { computeContext } from '@/src/cliHost/computeContext';
import type {
  GetDotenvCliPlugin,
  GetDotenvCliPublic,
} from '@/src/cliHost/definePlugin';
import type { GetDotenvCliOptions } from '@/src/cliHost/GetDotenvCliOptions';
// Added: helpers and types for root wiring and validation
import type { ProcessEnv } from '@/src/GetDotenvOptions';
import {
  type GetDotenvOptions,
  resolveGetDotenvOptions,
} from '@/src/GetDotenvOptions';
import { getDotenvOptionsSchemaResolved } from '@/src/schema/getDotenvOptions';

// New: small helpers to keep the class lean
import { attachRootOptions as attachRootOptionsBuilder } from './attachRootOptions';
import { baseRootOptionDefaults } from './defaults';
import {
  evaluateDynamicOptions as evalDyn,
  makeDynamicOption,
} from './dynamicOptions';
import { GROUP_TAG, renderOptionGroups } from './groups';
import { installPassOptions } from './passOptions';
import type { RootOptionsShape } from './types';

export type ResolvedHelpConfig = Partial<GetDotenvCliOptions> & {
  plugins: Record<string, unknown>;
};

/** Per-invocation context shared with plugins and actions. */
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
 */
export class GetDotenvCli<TOptions extends GetDotenvOptions = GetDotenvOptions>
  extends Command
  implements GetDotenvCliPublic<TOptions>
{
  /** Registered top-level plugins (composition happens via .use()) */
  private _plugins: GetDotenvCliPlugin<TOptions>[] = [];
  /** One-time installation guard */
  private _installed = false;
  /** Optional header line to prepend in help output */
  private [HELP_HEADER_SYMBOL]: string | undefined;
  /** Context/options stored under symbols (typed) */
  private [CTX_SYMBOL]?: GetDotenvCliCtx<TOptions>;
  private [OPTS_SYMBOL]?: GetDotenvCliOptions;

  /**
   * Create a subcommand using the same subclass, preserving helpers like
   * dynamicOption on children.
   */
  override createCommand(name?: string): Command {
    // Explicitly construct a GetDotenvCli (drop subclass constructor semantics).
    return new GetDotenvCli(name);
  }

  constructor(alias = 'getdotenv') {
    super(alias);
    // Ensure subcommands that use passThroughOptions can be attached safely.
    // Commander requires parent commands to enable positional options when a
    // child uses passThroughOptions.
    this.enablePositionalOptions();

    // Configure grouped help: show only base options in default "Options";
    // we will insert App/Plugin sections before Commands in helpInformation().
    this.configureHelp({
      visibleOptions: (cmd: Command): Option[] => {
        const all = cmd.options;
        const isRoot = cmd.parent === null;
        const list = isRoot
          ? all.filter((opt) => {
              const group = GROUP_TAG.get(opt);
              return group === 'base';
            })
          : all.slice(); // subcommands: show all options (their own "Options:" block)
        // Sort: short-aliased options first, then long-only; stable by flags.
        const hasShort = (opt: Option) => {
          const flags = opt.flags;
          // Matches "-x," or starting "-x " before any long
          return /(^|\s|,)-[A-Za-z]/.test(flags);
        };
        const byFlags = (opt: Option) => opt.flags;
        list.sort((a, b) => {
          const aS = hasShort(a) ? 1 : 0;
          const bS = hasShort(b) ? 1 : 0;
          return bS - aS || byFlags(a).localeCompare(byFlags(b));
        });
        return list;
      },
    });

    this.addHelpText('beforeAll', () => {
      const header = this[HELP_HEADER_SYMBOL];
      return header && header.length > 0 ? `${header}\n\n` : '';
    });

    // Skeleton preSubcommand hook: produce a context if absent, without
    // mutating process.env. The passOptions hook (when installed) will
    // compute the final context using merged CLI options; keeping
    // loadProcess=false here avoids leaking dotenv values into the parent
    // process env before subcommands execute.
    this.hook('preSubcommand', async () => {
      if (this.getCtx()) return;
      await this.resolveAndLoad({ loadProcess: false } as Partial<TOptions>);
    });
  }

  /**
   * Attach legacy/base root flags to this CLI instance.
   * Delegates to the pure builder in attachRootOptions.ts.
   */
  attachRootOptions(defaults?: Partial<RootOptionsShape>): this {
    const d = (defaults ?? baseRootOptionDefaults) as Partial<RootOptionsShape>;
    // Delegate to the existing builder; keep method minimal.
    attachRootOptionsBuilder(this as unknown as GetDotenvCli, d);
    return this;
  }

  /**
   * Persist merged root options, resolve context once, refresh dynamic help, and validate.
   * Installs both preSubcommand and preAction hooks via a small helper module.
   */
  passOptions(defaults?: Partial<RootOptionsShape>): this {
    installPassOptions(this as unknown as GetDotenvCli, defaults);
    return this;
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
      optionsResolved as Partial<TOptions>,
      this._plugins,
      HOST_META_URL,
    );

    // Persist context on the instance for later access.
    this[CTX_SYMBOL] = ctx;

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
  // Base overload (parser/default optional; preferred match for 2-arg calls)
  createDynamicOption(
    flags: string,
    desc: (
      cfg: ResolvedHelpConfig & { plugins: Record<string, unknown> },
    ) => string,
    parser?: (value: string, previous?: unknown) => unknown,
    defaultValue?: unknown,
  ): Option;
  // Overload: typed parser & default for value inference
  createDynamicOption<TValue = unknown>(
    flags: string,
    desc: (
      cfg: ResolvedHelpConfig & { plugins: Record<string, unknown> },
    ) => string,
    parser: (value: string, previous?: TValue) => TValue,
    defaultValue?: TValue,
  ): Option;
  // Implementation
  createDynamicOption(
    flags: string,
    desc: (
      cfg: ResolvedHelpConfig & { plugins: Record<string, unknown> },
    ) => string,
    parser?: (value: string, previous?: unknown) => unknown,
    defaultValue?: unknown,
  ): Option {
    return makeDynamicOption(
      flags,
      (c) => desc(c as ResolvedHelpConfig),
      parser,
      defaultValue,
    );
  }

  /**
   * Chainable helper mirroring .option(), but with a dynamic description.
   * Equivalent to addOption(createDynamicOption(...)).
   */
  dynamicOption(
    flags: string,
    desc: (
      cfg: ResolvedHelpConfig & { plugins: Record<string, unknown> },
    ) => string,
    parser?: (value: string, previous?: unknown) => unknown,
    defaultValue?: unknown,
  ): this {
    this.addOption(this.createDynamicOption(flags, desc, parser, defaultValue));
    return this;
  }

  /**
   * Evaluate dynamic descriptions for this command and all descendants using
   * the provided resolved configuration. Mutates the Option.description in
   * place so Commander help renders updated text.
   */
  evaluateDynamicOptions(resolved: ResolvedHelpConfig): void {
    evalDyn(this, resolved);
  }

  /**
   * Retrieve the current invocation context (if any).
   */
  getCtx(): GetDotenvCliCtx<TOptions> | undefined {
    return this[CTX_SYMBOL];
  }

  /**
   * Retrieve the merged root CLI options bag (if set by passOptions()).
   * Downstream-safe: no generics required.
   */
  getOptions(): GetDotenvCliOptions | undefined {
    return this[OPTS_SYMBOL];
  }

  /** Internal: set the merged root options bag for this run. */
  _setOptionsBag(bag: GetDotenvCliOptions): void {
    this[OPTS_SYMBOL] = bag;
  }

  /** Convenience helper to create a namespaced subcommand. */
  ns(name: string): Command {
    // Guard against same-level duplicate command names for clearer diagnostics.
    const exists = this.commands.some((c) => c.name() === name);
    if (exists) {
      throw new Error(`Duplicate command name: ${name}`);
    }
    return this.command(name);
  }

  /**
   * Tag options added during the provided callback as 'app' for grouped help.
   * Allows downstream apps to demarcate their root-level options.
   */
  tagAppOptions<T>(fn: (root: Command) => T): T {
    const root = this as Command;
    const originalAddOption = root.addOption.bind(root);
    root.addOption = function patchedAdd(this: Command, opt: Option) {
      (root as GetDotenvCli).setOptionGroup(opt, 'app');
      return originalAddOption(opt);
    };
    try {
      return fn(root);
    } finally {
      root.addOption = originalAddOption;
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
      const header = `${this.name()} v${v}`;
      this[HELP_HEADER_SYMBOL] = header;
    }
    return this;
  }

  /**
   * Insert grouped plugin/app options between "Options" and "Commands" for
   * hybrid ordering. Applies to root and any parent command.
   */
  override helpInformation(): string {
    // Base help text first (includes beforeAll/after hooks).
    const base = super.helpInformation();
    const groups = renderOptionGroups(this);
    const block = typeof groups === 'string' ? groups.trim() : '';
    let out = base;
    if (!block) {
      // Ensure a trailing blank line even when no extra groups render.
      if (!out.endsWith('\n\n'))
        out = out.endsWith('\n') ? `${out}\n` : `${out}\n\n`;
      return out;
    }

    // Insert just before "Commands:" when present.
    const marker = '\nCommands:';
    const idx = base.indexOf(marker);
    if (idx >= 0) {
      const toInsert = groups.startsWith('\n') ? groups : `\n${groups}`;
      out = `${base.slice(0, idx)}${toInsert}${base.slice(idx)}`;
    } else {
      // Otherwise append.
      const sep = base.endsWith('\n') || groups.startsWith('\n') ? '' : '\n';
      out = `${base}${sep}${groups}`;
    }
    // Ensure a trailing blank line for prompt separation.
    if (!out.endsWith('\n\n')) {
      out = out.endsWith('\n') ? `${out}\n` : `${out}\n\n`;
    }
    return out;
  }

  /**
   * Public: tag an Option with a display group for help (root/app/plugin:<id>).
   */
  setOptionGroup(opt: Option, group: string): void {
    GROUP_TAG.set(opt, group);
  }

  /**
   * Register a plugin for installation (parent level).
   * Installation occurs on first resolveAndLoad() (or explicit install()).
   */
  use(plugin: GetDotenvCliPlugin<TOptions>): this {
    this._plugins.push(plugin);
    // Immediately run setup so subcommands exist before parsing.
    const setupOne = (p: GetDotenvCliPlugin<TOptions>) => {
      const maybe = p.setup(this);
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
    const run = async (p: GetDotenvCliPlugin<TOptions>) => {
      if (p.afterResolve) await p.afterResolve(this, ctx);
      for (const child of p.children) await run(child);
    };
    for (const p of this._plugins) await run(p);
  }
}
