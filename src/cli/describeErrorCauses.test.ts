import { describe, expect, it } from 'vitest';

import { describeErrorCauses } from './describeErrorCauses';

describe('describeErrorCauses', () => {
  it('is empty for an error without causes, and for a non-error', () => {
    expect(describeErrorCauses(new Error('top'))).toEqual([]);
    expect(describeErrorCauses('top')).toEqual([]);
  });

  it('walks the cause chain, one level deeper each time', () => {
    const err = new Error('top', {
      cause: new Error('middle', { cause: 'bottom' }),
    });
    expect(describeErrorCauses(err)).toEqual([
      '  Caused by: middle',
      '    Caused by: bottom',
    ]);
  });

  it("lists an AggregateError's errors, then their own causes", () => {
    const err = new Error('top', {
      cause: new AggregateError(
        [new Error('first', { cause: new Error('why') }), 'second'],
        'both failed',
      ),
    });
    expect(describeErrorCauses(err)).toEqual([
      '  Caused by: both failed',
      '    - first',
      '      Caused by: why',
      '    - second',
    ]);
  });

  it('indents the continuation lines of a multi-line message', () => {
    const err = new Error('top', { cause: new Error('line one\nline two') });
    expect(describeErrorCauses(err)).toEqual([
      '  Caused by: line one\n    line two',
    ]);
  });

  it('describes each error by its stack with stacks: true', () => {
    const cause = new Error('why');
    cause.stack = 'Error: why\n    at frame';
    const err = new Error('top', { cause: new AggregateError([cause], 'all') });
    expect(describeErrorCauses(err, { stacks: true })).toEqual([
      expect.stringMatching(/^ {2}Caused by: AggregateError: all\n {4}\s+at /),
      '    - Error: why\n          at frame',
    ]);
  });

  it('falls back to the message for an error without a stack', () => {
    const cause = new Error('no stack');
    delete cause.stack;
    expect(
      describeErrorCauses(new Error('top', { cause }), { stacks: true }),
    ).toEqual(['  Caused by: no stack']);
  });

  it('follows a cycle only once', () => {
    const a = new Error('a');
    const b = new Error('b', { cause: a });
    a.cause = b;
    expect(describeErrorCauses(a)).toEqual([
      '  Caused by: b',
      '    Caused by: a',
    ]);
  });
});
