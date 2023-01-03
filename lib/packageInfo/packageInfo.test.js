/* eslint-env mocha */

// mocha imports
import chai from 'chai';
chai.should();

// subject imports
import { packageInfo } from './packageInfo.js';

describe('packageInfo', function () {
  it('returns package type', async function () {
    const { type } = await packageInfo();

    type.should.equal('module');
  });
});
