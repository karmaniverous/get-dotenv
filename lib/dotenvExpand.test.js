/* eslint-env mocha */

// mocha imports
import { expect } from 'chai';

import { dotenvExpand } from './dotenvExpand.js';

describe('dotenvExpand', function () {
  it('expands variables', function () {
    process.env.FOO = '$BAR';
    process.env.BAR = 'baz';
    const result = dotenvExpand('$FOO');
    expect(result).to.equal('baz');
  });
});
