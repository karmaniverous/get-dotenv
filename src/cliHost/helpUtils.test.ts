import { describe, expect, it } from 'vitest';

import { describeConfigKeyListDefaults, describeDefault } from './helpUtils';

describe('cliHost/helpUtils', () => {
  describe('describeDefault', () => {
    it('returns array joined by space', () => {
      expect(describeDefault(['a', 'b'])).toBe('a b');
    });

    it('returns "none" for empty array', () => {
      expect(describeDefault([])).toBe('none');
    });

    it('returns string as-is', () => {
      expect(describeDefault('foo')).toBe('foo');
    });

    it('returns "none" for undefined/other', () => {
      expect(describeDefault(undefined)).toBe('none');
      expect(describeDefault(null)).toBe('none');
    });
  });

  describe('describeConfigKeyListDefaults', () => {
    it('returns invalid msg when both lists present', () => {
      const res = describeConfigKeyListDefaults({
        cfgInclude: ['a'],
        cfgExclude: ['b'],
      });
      expect(res.includeDefault).toContain('invalid');
    });

    it('returns defaults when one is present', () => {
      const res = describeConfigKeyListDefaults({ cfgInclude: ['a'] });
      expect(res.includeDefault).toBe('a');
      expect(res.excludeDefault).toBe('none');
    });
  });
});
