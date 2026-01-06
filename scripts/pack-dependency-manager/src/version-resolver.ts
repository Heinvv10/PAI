#!/usr/bin/env bun
/**
 * Pack Dependency Management - Version Resolution
 *
 * Semantic versioning (semver 2.0.0) utilities for dependency resolution.
 * Handles version comparison, range matching, and constraint solving.
 */

import type { SemanticVersion, VersionRange } from './types';

/**
 * Parsed semantic version
 */
interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string[];
  build?: string[];
}

/**
 * Version constraint type
 */
type ConstraintType = 'exact' | 'caret' | 'tilde' | 'gte' | 'lte' | 'gt' | 'lt' | 'range' | 'any';

/**
 * Parsed version range
 */
interface ParsedRange {
  type: ConstraintType;
  version?: ParsedVersion; // Optional for 'any' type
  raw: string;
}

/**
 * Version resolver for semantic versioning
 */
export class VersionResolver {
  /**
   * Parse semantic version string
   */
  static parseVersion(version: SemanticVersion): ParsedVersion {
    const regex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

    const match = version.match(regex);
    if (!match) {
      throw new Error(`Invalid semantic version: ${version}`);
    }

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4] ? match[4].split('.') : undefined,
      build: match[5] ? match[5].split('.') : undefined
    };
  }

  /**
   * Parse version range
   */
  static parseRange(range: VersionRange): ParsedRange {
    const trimmed = range.trim();

    // Wildcard (any version)
    if (trimmed === '*' || trimmed === 'x' || trimmed === 'X') {
      return {
        type: 'any',
        raw: trimmed
      };
    }

    // Exact version
    if (/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)/.test(trimmed) && !trimmed.startsWith('^') && !trimmed.startsWith('~')) {
      return {
        type: 'exact',
        version: this.parseVersion(trimmed),
        raw: trimmed
      };
    }

    // Caret range (^1.2.3 -> >=1.2.3 <2.0.0)
    if (trimmed.startsWith('^')) {
      const version = trimmed.substring(1);
      return {
        type: 'caret',
        version: this.parseVersion(version),
        raw: trimmed
      };
    }

    // Tilde range (~1.2.3 -> >=1.2.3 <1.3.0)
    if (trimmed.startsWith('~')) {
      const version = trimmed.substring(1);
      return {
        type: 'tilde',
        version: this.parseVersion(version),
        raw: trimmed
      };
    }

    // Greater than or equal (>=1.2.3)
    if (trimmed.startsWith('>=')) {
      const version = trimmed.substring(2).trim();
      return {
        type: 'gte',
        version: this.parseVersion(version),
        raw: trimmed
      };
    }

    // Less than or equal (<=1.2.3)
    if (trimmed.startsWith('<=')) {
      const version = trimmed.substring(2).trim();
      return {
        type: 'lte',
        version: this.parseVersion(version),
        raw: trimmed
      };
    }

    // Greater than (>1.2.3)
    if (trimmed.startsWith('>')) {
      const version = trimmed.substring(1).trim();
      return {
        type: 'gt',
        version: this.parseVersion(version),
        raw: trimmed
      };
    }

    // Less than (<1.2.3)
    if (trimmed.startsWith('<')) {
      const version = trimmed.substring(1).trim();
      return {
        type: 'lt',
        version: this.parseVersion(version),
        raw: trimmed
      };
    }

    throw new Error(`Invalid version range: ${range}`);
  }

  /**
   * Compare two versions
   * @returns -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
   */
  static compareVersions(v1: SemanticVersion, v2: SemanticVersion): number {
    const parsed1 = this.parseVersion(v1);
    const parsed2 = this.parseVersion(v2);

    // Compare major.minor.patch
    if (parsed1.major !== parsed2.major) {
      return parsed1.major < parsed2.major ? -1 : 1;
    }
    if (parsed1.minor !== parsed2.minor) {
      return parsed1.minor < parsed2.minor ? -1 : 1;
    }
    if (parsed1.patch !== parsed2.patch) {
      return parsed1.patch < parsed2.patch ? -1 : 1;
    }

    // Compare prerelease (1.0.0-alpha < 1.0.0)
    if (parsed1.prerelease && !parsed2.prerelease) return -1;
    if (!parsed1.prerelease && parsed2.prerelease) return 1;
    if (parsed1.prerelease && parsed2.prerelease) {
      for (let i = 0; i < Math.max(parsed1.prerelease.length, parsed2.prerelease.length); i++) {
        const pre1 = parsed1.prerelease[i];
        const pre2 = parsed2.prerelease[i];

        if (pre1 === undefined) return -1;
        if (pre2 === undefined) return 1;

        const isNum1 = /^\d+$/.test(pre1);
        const isNum2 = /^\d+$/.test(pre2);

        if (isNum1 && isNum2) {
          const comp = parseInt(pre1, 10) - parseInt(pre2, 10);
          if (comp !== 0) return comp < 0 ? -1 : 1;
        } else if (isNum1 && !isNum2) {
          return -1;
        } else if (!isNum1 && isNum2) {
          return 1;
        } else {
          if (pre1 !== pre2) return pre1 < pre2 ? -1 : 1;
        }
      }
    }

    // Build metadata does not affect version precedence
    return 0;
  }

  /**
   * Check if version satisfies range
   */
  static satisfies(version: SemanticVersion, range: VersionRange): boolean {
    const parsedVersion = this.parseVersion(version);
    const parsedRange = this.parseRange(range);

    switch (parsedRange.type) {
      case 'any':
        return true; // Wildcard matches any version

      case 'exact':
        return this.compareVersions(version, this.versionToString(parsedRange.version!)) === 0;

      case 'caret': {
        // ^1.2.3 -> >=1.2.3 <2.0.0
        const minVersion = parsedRange.version!;
        const maxVersion = {
          ...minVersion,
          major: minVersion.major + 1,
          minor: 0,
          patch: 0,
          prerelease: undefined
        };
        return (
          this.compareVersions(version, this.versionToString(minVersion)) >= 0 &&
          this.compareVersions(version, this.versionToString(maxVersion)) < 0
        );
      }

      case 'tilde': {
        // ~1.2.3 -> >=1.2.3 <1.3.0
        const minVersion = parsedRange.version!;
        const maxVersion = {
          ...minVersion,
          minor: minVersion.minor + 1,
          patch: 0,
          prerelease: undefined
        };
        return (
          this.compareVersions(version, this.versionToString(minVersion)) >= 0 &&
          this.compareVersions(version, this.versionToString(maxVersion)) < 0
        );
      }

      case 'gte':
        return this.compareVersions(version, this.versionToString(parsedRange.version!)) >= 0;

      case 'lte':
        return this.compareVersions(version, this.versionToString(parsedRange.version!)) <= 0;

      case 'gt':
        return this.compareVersions(version, this.versionToString(parsedRange.version!)) > 0;

      case 'lt':
        return this.compareVersions(version, this.versionToString(parsedRange.version!)) < 0;

      default:
        return false;
    }
  }

  /**
   * Find best matching version from available versions
   */
  static findBestMatch(
    range: VersionRange,
    availableVersions: SemanticVersion[],
    allowPrerelease: boolean = false
  ): SemanticVersion | null {
    // Filter versions that satisfy range
    let matching = availableVersions.filter(v => this.satisfies(v, range));

    // Filter out prerelease versions if not allowed
    if (!allowPrerelease) {
      matching = matching.filter(v => {
        const parsed = this.parseVersion(v);
        return !parsed.prerelease;
      });
    }

    // No matching versions
    if (matching.length === 0) return null;

    // Sort descending (highest version first)
    matching.sort((a, b) => this.compareVersions(b, a));

    // Return highest version
    return matching[0];
  }

  /**
   * Convert parsed version back to string
   */
  static versionToString(version: ParsedVersion): SemanticVersion {
    let str = `${version.major}.${version.minor}.${version.patch}`;
    if (version.prerelease) {
      str += `-${version.prerelease.join('.')}`;
    }
    if (version.build) {
      str += `+${version.build.join('.')}`;
    }
    return str;
  }

  /**
   * Check if version is prerelease
   */
  static isPrerelease(version: SemanticVersion): boolean {
    const parsed = this.parseVersion(version);
    return !!parsed.prerelease;
  }

  /**
   * Get latest version from list
   */
  static getLatest(versions: SemanticVersion[], allowPrerelease: boolean = false): SemanticVersion | null {
    let candidates = versions;

    if (!allowPrerelease) {
      candidates = versions.filter(v => !this.isPrerelease(v));
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => this.compareVersions(b, a));
    return candidates[0];
  }

  /**
   * Check if two ranges overlap
   */
  static rangesOverlap(range1: VersionRange, range2: VersionRange): boolean {
    // For simplicity, we check if there's any version that satisfies both
    // This is a heuristic - full implementation would need SAT solver
    const parsed1 = this.parseRange(range1);
    const parsed2 = this.parseRange(range2);

    // If both are exact, check if they're the same
    if (parsed1.type === 'exact' && parsed2.type === 'exact') {
      return this.compareVersions(
        this.versionToString(parsed1.version),
        this.versionToString(parsed2.version)
      ) === 0;
    }

    // For now, assume ranges might overlap (conservative)
    // Full implementation would check range boundaries
    return true;
  }

  /**
   * Merge overlapping ranges into single range
   * Returns null if ranges don't overlap
   */
  static mergeRanges(range1: VersionRange, range2: VersionRange): VersionRange | null {
    // Simplified implementation - full version would handle all cases
    if (!this.rangesOverlap(range1, range2)) {
      return null;
    }

    // For now, return the more restrictive range
    const parsed1 = this.parseRange(range1);
    const parsed2 = this.parseRange(range2);

    if (parsed1.type === 'exact') return range1;
    if (parsed2.type === 'exact') return range2;

    // Return first range (could be improved)
    return range1;
  }
}
