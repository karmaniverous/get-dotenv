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
    const result = parseBranch('branchType');
    console.log(result);
    expect(result).to.deep.equal({ branchType: 'branchType' });
  });

  it('parses 2-part branch name', function () {
    const result = parseBranch('branchType/branchLabel');
    console.log(result);
    expect(result).to.deep.equal({
      branchType: 'branchType',
      branchLabel: 'branchLabel',
    });
  });

  it('parses 3-part branch name', function () {
    const result = parseBranch('branchType/branchLabel/envToken');
    console.log(result);
    expect(result).to.deep.equal({
      branchType: 'branchType',
      branchLabel: 'branchLabel',
      envToken: 'envToken',
    });
  });

  it('handles internal dashes', function () {
    const result = parseBranch('branch-Type/branch-Label/env-Token');
    console.log(result);
    expect(result).to.deep.equal({
      branchType: 'branch-Type',
      branchLabel: 'branch-Label',
      envToken: 'env-Token',
    });
  });
});
