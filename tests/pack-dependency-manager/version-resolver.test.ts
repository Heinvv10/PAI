/**
 * Pack Dependency Manager - Version Resolver Tests
 *
 * TDD tests for semantic versioning and range matching
 */

import { describe, test, expect } from 'vitest';
import { VersionResolver } from '../../scripts/pack-dependency-manager/src/version-resolver';

describe('Version Parsing', () => {
  test('parses valid semantic versions', () => {
    expect(VersionResolver.parseVersion('1.0.0')).toEqual({
      major: 1,
      minor: 0,
      patch: 0
    });

    expect(VersionResolver.parseVersion('2.5.10')).toEqual({
      major: 2,
      minor: 5,
      patch: 10
    });
  });

  test('parses prerelease versions', () => {
    const parsed = VersionResolver.parseVersion('1.0.0-alpha.1');
    expect(parsed.major).toBe(1);
    expect(parsed.prerelease).toEqual(['alpha', '1']);
  });

  test('throws on invalid versions', () => {
    expect(() => VersionResolver.parseVersion('1.0')).toThrow();
    expect(() => VersionResolver.parseVersion('invalid')).toThrow();
  });
});

describe('Version Comparison', () => {
  test('compares major versions', () => {
    expect(VersionResolver.compareVersions('2.0.0', '1.0.0')).toBe(1);
    expect(VersionResolver.compareVersions('1.0.0', '2.0.0')).toBe(-1);
  });

  test('compares minor versions', () => {
    expect(VersionResolver.compareVersions('1.5.0', '1.3.0')).toBe(1);
    expect(VersionResolver.compareVersions('1.3.0', '1.5.0')).toBe(-1);
  });

  test('compares patch versions', () => {
    expect(VersionResolver.compareVersions('1.0.5', '1.0.3')).toBe(1);
    expect(VersionResolver.compareVersions('1.0.3', '1.0.5')).toBe(-1);
  });

  test('handles equal versions', () => {
    expect(VersionResolver.compareVersions('1.2.3', '1.2.3')).toBe(0);
  });

  test('prerelease versions are lower than release', () => {
    expect(VersionResolver.compareVersions('1.0.0-alpha', '1.0.0')).toBe(-1);
    expect(VersionResolver.compareVersions('1.0.0', '1.0.0-alpha')).toBe(1);
  });
});

describe('Range Matching', () => {
  test('exact version matching', () => {
    expect(VersionResolver.satisfies('1.2.3', '1.2.3')).toBe(true);
    expect(VersionResolver.satisfies('1.2.4', '1.2.3')).toBe(false);
  });

  test('caret range matching (^)', () => {
    expect(VersionResolver.satisfies('1.2.3', '^1.0.0')).toBe(true);
    expect(VersionResolver.satisfies('1.9.9', '^1.0.0')).toBe(true);
    expect(VersionResolver.satisfies('2.0.0', '^1.0.0')).toBe(false);
  });

  test('tilde range matching (~)', () => {
    expect(VersionResolver.satisfies('1.2.3', '~1.2.0')).toBe(true);
    expect(VersionResolver.satisfies('1.2.9', '~1.2.0')).toBe(true);
    expect(VersionResolver.satisfies('1.3.0', '~1.2.0')).toBe(false);
  });

  test('greater than or equal (>=)', () => {
    expect(VersionResolver.satisfies('1.5.0', '>=1.0.0')).toBe(true);
    expect(VersionResolver.satisfies('1.0.0', '>=1.0.0')).toBe(true);
    expect(VersionResolver.satisfies('0.9.9', '>=1.0.0')).toBe(false);
  });

  test('less than or equal (<=)', () => {
    expect(VersionResolver.satisfies('1.0.0', '<=2.0.0')).toBe(true);
    expect(VersionResolver.satisfies('2.0.0', '<=2.0.0')).toBe(true);
    expect(VersionResolver.satisfies('2.0.1', '<=2.0.0')).toBe(false);
  });

  test('wildcard matching (*)', () => {
    expect(VersionResolver.satisfies('1.0.0', '*')).toBe(true);
    expect(VersionResolver.satisfies('2.5.10', '*')).toBe(true);
    expect(VersionResolver.satisfies('0.0.1', '*')).toBe(true);
    expect(VersionResolver.satisfies('99.99.99', '*')).toBe(true);
  });
});

describe('Best Match Selection', () => {
  test('finds best matching version', () => {
    const versions = ['1.0.0', '1.5.0', '1.9.0', '2.0.0'];
    expect(VersionResolver.findBestMatch('^1.0.0', versions)).toBe('1.9.0');
    expect(VersionResolver.findBestMatch('~1.5.0', versions)).toBe('1.5.0');
  });

  test('excludes prerelease by default', () => {
    const versions = ['1.0.0', '1.5.0-beta', '2.0.0'];
    expect(VersionResolver.findBestMatch('^1.0.0', versions, false)).toBe('1.0.0');
    expect(VersionResolver.findBestMatch('^1.0.0', versions, true)).toBe('1.5.0-beta');
  });

  test('returns null when no match', () => {
    const versions = ['1.0.0', '1.5.0'];
    expect(VersionResolver.findBestMatch('^2.0.0', versions)).toBeNull();
  });
});

describe('Latest Version', () => {
  test('gets latest stable version', () => {
    const versions = ['1.0.0', '2.0.0', '1.5.0'];
    expect(VersionResolver.getLatest(versions)).toBe('2.0.0');
  });

  test('excludes prerelease by default', () => {
    const versions = ['1.0.0', '2.0.0', '3.0.0-beta'];
    expect(VersionResolver.getLatest(versions, false)).toBe('2.0.0');
    expect(VersionResolver.getLatest(versions, true)).toBe('3.0.0-beta');
  });
});
