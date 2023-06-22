/* eslint-env mocha */

// npm imports
import { expect } from 'chai';

// lib imports
import { parseBranch } from './parseBranch.js';

describe('parseBranch', function () {
  it('parses empty string', function () {
    const result = parseBranch('');
    console.log(result);
    expect(result).to.deep.equal({});
  });

  it('parses 1-part branch name', function () {
    const result = parseBranch('env');
    console.log(result);
    expect(result).to.deep.equal({ envToken: 'env' });
  });

  it('parses 2-part branch name', function () {
    const result = parseBranch('type/label');
    console.log(result);
    expect(result).to.deep.equal({
      branchType: 'type',
      branchLabel: 'label',
    });
  });

  it('parses 3-part branch name', function () {
    const result = parseBranch('type/label/env');
    console.log(result);
    expect(result).to.deep.equal({
      branchType: 'type',
      branchLabel: 'label',
      envToken: 'env',
    });
  });
});
