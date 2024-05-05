/* eslint-env mocha */

// mocha imports
import { expect } from 'chai';

import { dotenvExpand } from './dotenvExpand';

describe('dotenvExpand', function () {
  describe('whitespace syntax', function () {
    it('isolated expansion', function () {
      process.env.FOO = 'bar';
      const result = dotenvExpand('$FOO');
      expect(result).to.equal('bar');
    });

    it('embedded expansion', function () {
      process.env.FOO = 'bar';
      const result = dotenvExpand('kindly $FOO my bar');
      expect(result).to.equal('kindly bar my bar');
    });

    it('isolated double expansion', function () {
      process.env.FOO = '$BAR';
      process.env.BAR = 'baz';
      const result = dotenvExpand('$FOO');
      expect(result).to.equal('baz');
    });

    it('embedded double expansion', function () {
      process.env.FOO = '$BAR';
      process.env.BAR = 'baz';
      const result = dotenvExpand('kindly $FOO my bar');
      expect(result).to.equal('kindly baz my bar');
    });

    it('complex expansion', function () {
      process.env.FOOBAZ = 'bar';
      process.env.BAR = 'BAZ';
      const result = dotenvExpand('kindly $FOO$BAR my bar');
      expect(result).to.equal('kindly bar my bar');
    });

    it('isolated unknown variable', function () {
      delete process.env.FOO;
      const result = dotenvExpand('$FOO');
      expect(result).not.to.exist;
    });

    it('embedded unknown variable', function () {
      delete process.env.FOO;
      const result = dotenvExpand('kindly $FOO my bar');
      expect(result).to.equal('kindly  my bar');
    });

    it('isolated default', function () {
      delete process.env.FOO;
      const result = dotenvExpand('$FOO:baz');
      expect(result).to.equal('baz');
    });

    it('embedded default', function () {
      delete process.env.FOO;
      const result = dotenvExpand('kindly $FOO:baz my bar');
      expect(result).to.equal('kindly baz my bar');
    });
  });

  describe('bracket syntax', function () {
    it('isolated expansion', function () {
      process.env.FOO = 'bar';
      const result = dotenvExpand('${FOO}');
      expect(result).to.equal('bar');
    });

    it('embedded expansion', function () {
      process.env.FOO = 'bar';
      const result = dotenvExpand('kindly ${FOO} my bar');
      expect(result).to.equal('kindly bar my bar');
    });

    it('isolated double expansion', function () {
      process.env.FOO = '$BAR';
      process.env.BAR = 'baz';
      const result = dotenvExpand('${FOO}');
      expect(result).to.equal('baz');
    });

    it('embedded double expansion', function () {
      process.env.FOO = '$BAR';
      process.env.BAR = 'baz';
      const result = dotenvExpand('kindly ${FOO} my bar');
      expect(result).to.equal('kindly baz my bar');
    });

    it('complex expansion', function () {
      process.env.FOOBAZ = 'bar';
      process.env.FOO = 'fum';
      process.env.BAR = 'BAZ';
      const result = dotenvExpand('kindly ${FOO}$BAR my bar');
      expect(result).to.equal('kindly fumBAZ my bar');
    });

    it('isolated unknown variable', function () {
      delete process.env.FOO;
      const result = dotenvExpand('${FOO}');
      expect(result).not.to.exist;
    });

    it('embedded unknown variable', function () {
      delete process.env.FOO;
      const result = dotenvExpand('kindly ${FOO} my bar');
      expect(result).to.equal('kindly  my bar');
    });

    it('isolated default', function () {
      delete process.env.FOO;
      const result = dotenvExpand('${FOO:baz}');
      expect(result).to.equal('baz');
    });

    it('embedded default', function () {
      delete process.env.FOO;
      const result = dotenvExpand('kindly ${FOO:baz} my bar');
      expect(result).to.equal('kindly baz my bar');
    });
  });
});
