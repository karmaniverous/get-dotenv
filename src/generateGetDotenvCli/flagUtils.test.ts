import { describe, expect, it } from 'vitest';

import {
  resolveExclusion,
  resolveExclusionAll,
  setOptionalFlag,
} from './flagUtils';

describe('flagUtils', () => {
  describe('resolveExclusion', () => {
    it('prefers explicit include', () => {
      expect(resolveExclusion(true, undefined, false)).toBe(true);
    });
    it('respects explicit off', () => {
      expect(resolveExclusion(undefined, true, true)).toBeUndefined();
    });
    it('falls back to default true', () => {
      expect(resolveExclusion(undefined, undefined, true)).toBe(true);
    });
    it('falls back to default false', () => {
      expect(resolveExclusion(undefined, undefined, false)).toBeUndefined();
    });
  });

  describe('resolveExclusionAll', () => {
    it('exclude-all forces true', () => {
      expect(
        resolveExclusionAll(undefined, undefined, false, true, undefined),
      ).toBe(true);
    });
    it('exclude-all yields to individual off', () => {
      expect(
        resolveExclusionAll(undefined, true, false, true, undefined),
      ).toBeUndefined();
    });
    it('individual exclude=true forces true', () => {
      expect(
        resolveExclusionAll(true, undefined, false, undefined, undefined),
      ).toBe(true);
    });
    it('exclude-all-off unsets when individual not set', () => {
      expect(
        resolveExclusionAll(undefined, undefined, true, undefined, true),
      ).toBeUndefined();
    });
    it('falls back to default', () => {
      expect(
        resolveExclusionAll(undefined, undefined, true, undefined, undefined),
      ).toBe(true);
    });
  });

  describe('setOptionalFlag', () => {
    it('deletes when undefined and assigns when defined', () => {
      const obj: { a?: boolean } = { a: true };
      setOptionalFlag(obj, 'a', undefined);
      expect(Object.prototype.hasOwnProperty.call(obj, 'a')).toBe(false);
      setOptionalFlag(obj, 'a', true);
      expect(obj.a).toBe(true);
    });
  });
});
