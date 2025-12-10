import { describe, expect, it } from 'vitest';

import { dotenvExpand } from './dotenvExpand';

describe('dotenvExpand', function () {
  describe('whitespace syntax', function () {
    it('isolated expansion', function () {
      process.env.FOO = 'bar';
      const result = dotenvExpand('$FOO');
      expect(result).toBe('bar');
    });
    it('embedded expansion', function () {
      process.env.FOO = 'bar';
      const result = dotenvExpand('kindly $FOO my bar');
      expect(result).toBe('kindly bar my bar');
    });
    it('isolated double expansion', function () {
      process.env.FOO = '$BAR';
      process.env.BAR = 'baz';
      const result = dotenvExpand('$FOO');
      expect(result).toBe('baz');
    });
    it('embedded double expansion', function () {
      process.env.FOO = '$BAR';
      process.env.BAR = 'baz';
      const result = dotenvExpand('kindly $FOO my bar');
      expect(result).toBe('kindly baz my bar');
    });
    it('complex expansion', function () {
      process.env.FOOBAZ = 'bar';
      process.env.BAR = 'BAZ';
      const result = dotenvExpand('kindly $FOO$BAR my bar');
      expect(result).toBe('kindly bar my bar');
    });
    it('isolated unknown variable', function () {
      delete process.env.FOO;
      const result = dotenvExpand('$FOO');
      expect(result).toBeUndefined();
    });

    it('embedded unknown variable', function () {
      delete process.env.FOO;
      const result = dotenvExpand('kindly $FOO my bar');
      expect(result).toBe('kindly  my bar');
    });

    it('isolated default', function () {
      delete process.env.FOO;
      const result = dotenvExpand('$FOO:baz');
      expect(result).toBe('baz');
    });

    it('embedded default', function () {
      delete process.env.FOO;
      const result = dotenvExpand('kindly $FOO:baz my bar');
      expect(result).toBe('kindly baz my bar');
    });
  });
  describe('bracket syntax', function () {
    it('isolated expansion', function () {
      process.env.FOO = 'bar';
      const result = dotenvExpand('${FOO}');
      expect(result).toBe('bar');
    });
    it('embedded expansion', function () {
      process.env.FOO = 'bar';
      const result = dotenvExpand('kindly ${FOO} my bar');
      expect(result).toBe('kindly bar my bar');
    });
    it('isolated double expansion', function () {
      process.env.FOO = '$BAR';
      process.env.BAR = 'baz';
      const result = dotenvExpand('${FOO}');
      expect(result).toBe('baz');
    });
    it('embedded double expansion', function () {
      process.env.FOO = '$BAR';
      process.env.BAR = 'baz';
      const result = dotenvExpand('kindly ${FOO} my bar');
      expect(result).toBe('kindly baz my bar');
    });
    it('complex expansion', function () {
      process.env.FOOBAZ = 'bar';
      process.env.FOO = 'fum';
      process.env.BAR = 'BAZ';
      const result = dotenvExpand('kindly ${FOO}$BAR my bar');
      expect(result).toBe('kindly fumBAZ my bar');
    });
    it('isolated unknown variable', function () {
      delete process.env.FOO;
      const result = dotenvExpand('${FOO}');
      expect(result).toBeUndefined();
    });

    it('embedded unknown variable', function () {
      delete process.env.FOO;
      const result = dotenvExpand('kindly ${FOO} my bar');
      expect(result).toBe('kindly  my bar');
    });

    it('isolated default', function () {
      delete process.env.FOO;
      const result = dotenvExpand('${FOO:baz}');
      expect(result).toBe('baz');
    });

    it('embedded default', function () {
      delete process.env.FOO;
      const result = dotenvExpand('kindly ${FOO:baz} my bar');
      expect(result).toBe('kindly baz my bar');
    });
  });
});
