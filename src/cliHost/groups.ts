import type {
  CommandUnknownOpts as Command,
  Option,
} from '@commander-js/extra-typings';

// Registry for grouping; root help renders groups between Options and Commands.
export const GROUP_TAG = new WeakMap<Option, string>();

/**
 * Render help option groups (App/Plugins) for a given command.
 * Groups are injected between Options and Commands in the help output.
 */
export function renderOptionGroups(cmd: Command): string {
  const all = cmd.options;
  type Row = { flags: string; description: string };
  const byGroup = new Map<string, Row[]>();
  for (const o of all) {
    const opt = o;
    const g = GROUP_TAG.get(opt);
    if (!g || g === 'base') continue; // base handled by default help
    const rows = byGroup.get(g) ?? [];
    rows.push({
      flags: opt.flags,
      description: (opt as { description?: string }).description ?? '',
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
  // Plugin groups sorted by id; suppress self group on the owning command name.
  const pluginKeys = Array.from(byGroup.keys()).filter((k) =>
    k.startsWith('plugin:'),
  );
  const currentName = cmd.name();
  pluginKeys.sort((a, b) => a.localeCompare(b));
  for (const k of pluginKeys) {
    const id = k.slice('plugin:'.length) || '(unknown)';
    const rows = byGroup.get(k) ?? [];
    if (rows.length > 0 && id !== currentName) {
      out += renderRows(`Plugin options — ${id}`, rows);
    }
  }
  return out;
}
