/**
 * Guard for the private Commander API the cmd alias relies on
 * (`attachCmdAlias` in `./alias.ts`): the `_defaultCommandName` field that
 * `isDefault` sets and that Commander reads to dispatch a parse with no
 * subcommand. If a Commander upgrade renames or removes the field, or stops
 * dispatching through it, this test fails before the alias silently stops
 * routing to `cmd`.
 */
import { Command } from '@commander-js/extra-typings';
import { describe, expect, it } from 'vitest';

interface DefaultCommandSlot {
  _defaultCommandName?: unknown;
}

const slotOf = (c: Command) => c as unknown as DefaultCommandSlot;

describe("Commander's private _defaultCommandName (cmd alias guard)", () => {
  it('a fresh Command has the field, unset', () => {
    const program = new Command();
    expect(Object.hasOwn(program, '_defaultCommandName')).toBe(true);
    expect(slotOf(program)._defaultCommandName).toBeNull();
  });

  it("command('x', { isDefault: true }) sets it to 'x'", () => {
    const program = new Command();
    program.command('x', { isDefault: true });
    expect(slotOf(program)._defaultCommandName).toBe('x');
  });

  it("addCommand(cmd, { isDefault: true }) sets it to the command's name", () => {
    const program = new Command();
    program.addCommand(new Command('y'), { isDefault: true });
    expect(slotOf(program)._defaultCommandName).toBe('y');
  });

  it('assigning it chooses the subcommand a bare parse dispatches to', async () => {
    const ran: string[] = [];
    const program = new Command().exitOverride();
    program.command('a').action(() => {
      ran.push('a');
    });
    program.command('b').action(() => {
      ran.push('b');
    });
    slotOf(program)._defaultCommandName = 'b';
    await program.parseAsync([], { from: 'user' });
    expect(ran).toEqual(['b']);
  });
});
