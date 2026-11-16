/**
 * Terminator names (Decision 28): the hash steps and the fixed examples.
 */
import { describe, expect, it } from 'vitest';

import * as cliHost from '../index';
import { terminatorHash, terminatorName } from './terminator';

describe('terminatorName (Decision 28)', () => {
  it.each([
    ['vc', [], '--vc-q1r1s'],
    ['vc', ['aws'], '--vc-c1ryg'],
    ['smoz', [], '--smoz-d839e'],
    ['getdotenv', [], '--getdotenv-qepva'],
    ['vc', ['aws', 'secrets', 'pull'], '--vc-f3jrb'],
  ])('%s %j gives %s', (alias, path, expected) => {
    expect(terminatorName(alias, path)).toBe(expected);
  });

  it('hashes the alias and path joined by single spaces', () => {
    expect(terminatorHash('vc')).toBe('q1r1s');
    expect(terminatorHash('vc aws')).toBe('c1ryg');
    expect(terminatorHash('smoz')).toBe('d839e');
    expect(terminatorHash('getdotenv')).toBe('qepva');
  });

  it('drops leading digits before keeping 5 characters', () => {
    // 'vc' in base 36 starts with digits; truncating first gives 'q1r'.
    const hash = terminatorHash('vc');
    expect(hash).toHaveLength(5);
    expect(hash).toMatch(/^[a-z]/);
  });

  it('is exported from cliHost', () => {
    expect(cliHost.terminatorName).toBe(terminatorName);
  });
});
