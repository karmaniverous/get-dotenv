/**
 * `promptDecision`: the file-collision prompt of `init` accepts the six
 * answers (surrounding whitespace ignored) and asks again on anything else.
 */
import type { createInterface } from 'node:readline/promises';

import { describe, expect, it, vi } from 'vitest';

import { promptDecision } from './prompts';

type Rl = ReturnType<typeof createInterface>;

/** A readline stand-in that answers in turn and fails when out of answers. */
const answering = (...answers: string[]) => {
  const question = vi.fn(() => {
    const next = answers.shift();
    return next === undefined
      ? Promise.reject(new Error('no more answers'))
      : Promise.resolve(next);
  });
  return { rl: { question } as unknown as Rl, question };
};

const logger = () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

describe('promptDecision', () => {
  it.each(['o', 'e', 's', 'O', 'E', 'S'])('accepts %s', async (answer) => {
    const { rl } = answering(answer);
    await expect(promptDecision('f', logger(), rl)).resolves.toBe(answer);
  });

  it('ignores whitespace around the answer', async () => {
    const { rl, question } = answering('  O \t');
    await expect(promptDecision('f', logger(), rl)).resolves.toBe('O');
    expect(question).toHaveBeenCalledTimes(1);
  });

  it('asks again after an answer it does not know', async () => {
    const log = logger();
    const { rl, question } = answering('yes', 'S');
    await expect(promptDecision('f', log, rl)).resolves.toBe('S');
    expect(question).toHaveBeenCalledTimes(2);
    expect(log.info).toHaveBeenCalledWith('Please enter one of: o e s O E S');
  });
});
