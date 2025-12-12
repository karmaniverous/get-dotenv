/** src/cliHost/definePlugin/helpers.ts
 * Runtime helpers for plugin authoring:
 * - definePlugin() assembly
 * - instance-bound readConfig and createPluginDynamicOption
 * - sibling namespace uniqueness guard at composition time
 */
import type { Command, OptionValues } from '@commander-js/extra-typings';
import { z, type ZodObject } from 'zod';

import type { GetDotenvOptions } from '@/src/core';

import { getPluginConfig } from './computeContext';
import type {
  DefineSpec,
  GetDotenvCliPlugin,
  GetDotenvCliPublic,
  PluginWithInstanceHelpers,
} from './contracts';
import type { PluginNamespaceOverride } from './contracts';
import type { ResolvedHelpConfig } from './helpConfig';

/**
 * Define a GetDotenv CLI plugin with compositional helpers.
 *
 * @example
 * const p = definePlugin(\{ ns: 'aws', setup(cli) \{ /* wire subcommands *\/ \} \})
 *   .use(child, \{ ns: 'whoami' \});
 */
export function definePlugin<
  TOptions extends GetDotenvOptions,
  Schema extends ZodObject,
>(
  spec: Omit<DefineSpec<TOptions>, 'configSchema'> & { configSchema: Schema },
): PluginWithInstanceHelpers<TOptions, z.output<Schema>>;

export function definePlugin<TOptions extends GetDotenvOptions>(
  spec: DefineSpec<TOptions>,
): PluginWithInstanceHelpers<TOptions, {}>;

// Implementation
export function definePlugin<TOptions extends GetDotenvOptions>(
  spec: DefineSpec<TOptions> & { configSchema?: ZodObject },
): PluginWithInstanceHelpers<TOptions> {
  const { ...rest } = spec;
  const effectiveSchema =
    (
      spec as {
        configSchema?: ZodObject;
      }
    ).configSchema ?? z.object({}).strict();

  const base: GetDotenvCliPlugin<TOptions> = {
    ...rest,
    configSchema: effectiveSchema,
    children: [],
    use(child, override?: PluginNamespaceOverride) {
      // Enforce sibling uniqueness at composition time.
      const desired = (
        override && typeof override.ns === 'string' && override.ns.length > 0
          ? override.ns
          : child.ns
      ).trim();
      const collision = this.children.some((c) => {
        const ns = (
          c.override &&
          typeof c.override.ns === 'string' &&
          c.override.ns.length > 0
            ? c.override.ns
            : c.plugin.ns
        ).trim();
        return ns === desired;
      });
      if (collision) {
        const under = this.ns && this.ns.length > 0 ? this.ns : 'root';
        throw new Error(
          `Duplicate namespace '${desired}' under '${under}'. ` +
            `Override via .use(plugin, { ns: '...' }).`,
        );
      }
      this.children.push({ plugin: child, override });
      return this;
    },
  };

  const extended = base as PluginWithInstanceHelpers<TOptions>;

  extended.readConfig = function <TCfg = unknown>(
    _cli: GetDotenvCliPublic<TOptions, unknown[], OptionValues, OptionValues>,
  ): Readonly<TCfg> {
    const value = getPluginConfig<
      TOptions,
      TCfg,
      unknown[],
      OptionValues,
      OptionValues
    >(
      extended as unknown as GetDotenvCliPlugin<
        TOptions,
        unknown[],
        OptionValues,
        OptionValues
      >,
    );
    if (value === undefined) {
      throw new Error(
        'Plugin config not available. Ensure resolveAndLoad() has been called before readConfig().',
      );
    }
    return value;
  };

  extended.createPluginDynamicOption = function <
    TCfg = unknown,
    Usage extends string = string,
  >(
    cli: GetDotenvCliPublic<TOptions, unknown[], OptionValues, OptionValues>,
    flags: Usage,
    desc: (cfg: ResolvedHelpConfig, pluginCfg: Readonly<TCfg>) => string,
    parser?: (value: string, previous?: unknown) => unknown,
    defaultValue?: unknown,
  ) {
    // Derive realized path strictly from the provided mount (leaf-up).
    const realizedPath = (() => {
      const parts: string[] = [];
      let node = cli as unknown as Command;
      while (node.parent) {
        parts.push(node.name());
        node = node.parent as Command;
      }
      return parts.reverse().join('/');
    })();

    return cli.createDynamicOption<Usage>(
      flags,
      (c) => {
        const fromStore = getPluginConfig<
          TOptions,
          TCfg,
          unknown[],
          OptionValues,
          OptionValues
        >(
          extended as unknown as GetDotenvCliPlugin<
            TOptions,
            unknown[],
            OptionValues,
            OptionValues
          >,
        );

        let cfgVal: Readonly<TCfg> = fromStore ?? ({} as Readonly<TCfg>);

        // Strict fallback only by realized path for help-time synthetic usage.
        if (!fromStore && realizedPath.length > 0) {
          const bag = (c as { plugins: Record<string, unknown> }).plugins;
          const maybe = bag[realizedPath];
          if (maybe && typeof maybe === 'object') {
            cfgVal = maybe as Readonly<TCfg>;
          }
        }
        // c is strictly typed as ResolvedHelpConfig from cli.createDynamicOption
        return desc(c, cfgVal);
      },
      parser,
      defaultValue,
    );
  };

  return extended;
}
