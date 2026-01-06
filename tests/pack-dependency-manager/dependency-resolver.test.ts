/**
 * Pack Dependency Manager - Dependency Resolver Tests
 *
 * TDD tests for dependency resolution, conflict detection, and installation planning
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { DependencyResolver } from '../../scripts/pack-dependency-manager/src/dependency-resolver';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import type { PackManifest } from '../../scripts/pack-dependency-manager/src/types';

// Test fixture directory
const TEST_PAI_DIR = join(process.cwd(), '.test-pai');
const TEST_SKILLS_DIR = join(TEST_PAI_DIR, 'skills');

/**
 * Create mock pack structure for testing
 */
function createMockPack(name: string, manifest: PackManifest): void {
  const packDir = join(TEST_SKILLS_DIR, name);
  mkdirSync(packDir, { recursive: true });
  writeFileSync(
    join(packDir, 'pack.json'),
    JSON.stringify(manifest, null, 2)
  );
}

/**
 * Setup test environment
 */
beforeAll(() => {
  // Clean up any existing test directory
  if (existsSync(TEST_PAI_DIR)) {
    rmSync(TEST_PAI_DIR, { recursive: true, force: true });
  }

  // Create test directory structure
  mkdirSync(TEST_SKILLS_DIR, { recursive: true });

  // Create mock packs for testing

  // Base pack with no dependencies
  createMockPack('base-pack', {
    name: 'base-pack',
    version: '1.0.0',
    description: 'Base pack with no dependencies'
  });

  // Simple pack with one dependency
  createMockPack('simple-pack', {
    name: 'simple-pack',
    version: '1.0.0',
    description: 'Simple pack with one dependency',
    dependencies: {
      'base-pack': '^1.0.0'
    }
  });

  // Complex pack with multiple dependencies
  createMockPack('complex-pack', {
    name: 'complex-pack',
    version: '2.0.0',
    description: 'Complex pack with multiple dependencies',
    dependencies: {
      'base-pack': '^1.0.0',
      'simple-pack': '^1.0.0'
    },
    peerDependencies: {
      'bun': '>=1.0.0'
    }
  });

  // Pack with optional dependencies
  createMockPack('optional-pack', {
    name: 'optional-pack',
    version: '1.0.0',
    description: 'Pack with optional dependencies',
    dependencies: {
      'base-pack': '^1.0.0'
    },
    optionalDependencies: {
      'missing-pack': '^1.0.0' // This pack doesn't exist
    }
  });

  // Pack with version conflict
  createMockPack('conflict-pack-a', {
    name: 'conflict-pack-a',
    version: '1.0.0',
    description: 'Pack requiring base-pack ^1.0.0',
    dependencies: {
      'base-pack': '^1.0.0'
    }
  });

  createMockPack('conflict-pack-b', {
    name: 'conflict-pack-b',
    version: '1.0.0',
    description: 'Pack requiring base-pack ^2.0.0',
    dependencies: {
      'base-pack': '^2.0.0'
    }
  });

  // Pack with explicit conflicts
  createMockPack('conflict-explicit', {
    name: 'conflict-explicit',
    version: '1.0.0',
    description: 'Pack with explicit conflicts',
    conflicts: {
      'base-pack': '*'
    }
  });

  // Pack with circular dependency (A -> B -> A)
  createMockPack('circular-a', {
    name: 'circular-a',
    version: '1.0.0',
    description: 'Pack A in circular dependency',
    dependencies: {
      'circular-b': '^1.0.0'
    }
  });

  createMockPack('circular-b', {
    name: 'circular-b',
    version: '1.0.0',
    description: 'Pack B in circular dependency',
    dependencies: {
      'circular-a': '^1.0.0'
    }
  });

  // Multiple versions of same pack
  createMockPack('versioned-pack-v1', {
    name: 'versioned-pack',
    version: '1.0.0',
    description: 'Version 1.0.0'
  });

  createMockPack('versioned-pack-v2', {
    name: 'versioned-pack',
    version: '2.0.0',
    description: 'Version 2.0.0'
  });
});

/**
 * Cleanup test environment
 */
afterAll(() => {
  if (existsSync(TEST_PAI_DIR)) {
    rmSync(TEST_PAI_DIR, { recursive: true, force: true });
  }
});

describe('Dependency Resolver - Basic Operations', () => {
  test('creates resolver with custom PAI directory', () => {
    const resolver = new DependencyResolver(TEST_PAI_DIR);
    expect(resolver).toBeDefined();
  });

  test('lists installed packs', () => {
    const resolver = new DependencyResolver(TEST_PAI_DIR);
    const installed = resolver.listInstalled();

    expect(installed.length).toBeGreaterThan(0);
    expect(installed.some(p => p.name === 'base-pack')).toBe(true);
    expect(installed.some(p => p.name === 'simple-pack')).toBe(true);
  });

  test('gets installed pack information', () => {
    const resolver = new DependencyResolver(TEST_PAI_DIR);
    const pack = resolver.getInstalled('base-pack');

    expect(pack).not.toBeNull();
    expect(pack?.name).toBe('base-pack');
    expect(pack?.version).toBe('1.0.0');
    expect(pack?.manifest).toBeDefined();
  });

  test('returns null for non-existent pack', () => {
    const resolver = new DependencyResolver(TEST_PAI_DIR);
    const pack = resolver.getInstalled('non-existent-pack');

    expect(pack).toBeNull();
  });
});

describe('Dependency Resolution - Simple Cases', () => {
  test('resolves pack with no dependencies', async () => {
    const resolver = new DependencyResolver(TEST_PAI_DIR);
    const plan = await resolver.resolve('base-pack');

    expect(plan.target).toBe('base-pack');
    expect(plan.version).toBe('1.0.0');
    expect(plan.dependencies.length).toBe(0);
    expect(plan.conflicts.length).toBe(0);
  });

  test('resolves pack with single dependency', async () => {
    const resolver = new DependencyResolver(TEST_PAI_DIR);
    const plan = await resolver.resolve('simple-pack');

    expect(plan.target).toBe('simple-pack');
    expect(plan.version).toBe('1.0.0');
    expect(plan.dependencies.length).toBe(1);
    expect(plan.dependencies[0].name).toBe('base-pack');
    expect(plan.dependencies[0].resolvedVersion).toBe('1.0.0');
    expect(plan.conflicts.length).toBe(0);
  });

  test('resolves pack with multiple dependencies', async () => {
    const resolver = new DependencyResolver(TEST_PAI_DIR);
    const plan = await resolver.resolve('complex-pack');

    expect(plan.target).toBe('complex-pack');
    expect(plan.version).toBe('2.0.0');
    expect(plan.dependencies.length).toBeGreaterThanOrEqual(2);

    const depNames = plan.dependencies.map(d => d.name);
    expect(depNames).toContain('base-pack');
    expect(depNames).toContain('simple-pack');
  });
});

describe('Dependency Resolution - Optional Dependencies', () => {
  test('resolves pack with optional dependencies gracefully', async () => {
    const resolver = new DependencyResolver(TEST_PAI_DIR);
    const plan = await resolver.resolve('optional-pack');

    expect(plan.target).toBe('optional-pack');
    expect(plan.dependencies.length).toBe(1); // Only base-pack
    expect(plan.dependencies[0].name).toBe('base-pack');
    // Missing optional dependency should not cause failure
  });
});

describe('Conflict Detection', () => {
  test('detects peer dependency conflicts', async () => {
    const resolver = new DependencyResolver(TEST_PAI_DIR);
    const plan = await resolver.resolve('complex-pack');

    // complex-pack has peerDependency on bun which won't be installed
    const peerConflicts = plan.conflicts.filter(c =>
      c.reason.includes('Peer dependency')
    );

    expect(peerConflicts.length).toBeGreaterThan(0);
  });

  test('detects explicit conflicts', async () => {
    const resolver = new DependencyResolver(TEST_PAI_DIR);

    // conflict-explicit conflicts with base-pack
    // Since base-pack is installed, this should detect conflict
    const plan = await resolver.resolve('conflict-explicit');

    const explicitConflicts = plan.conflicts.filter(c =>
      c.reason.includes('conflicts with')
    );

    expect(explicitConflicts.length).toBeGreaterThan(0);
  });

  test('checkConflicts returns all conflicts from plan', () => {
    const resolver = new DependencyResolver(TEST_PAI_DIR);

    const mockPlan = {
      target: 'test-pack',
      version: '1.0.0',
      dependencies: [],
      conflicts: [
        {
          packName: 'conflict-pack',
          requestedBy: 'test-pack',
          requestedVersion: '^1.0.0',
          conflictsWith: 'other-pack',
          conflictingVersion: '^2.0.0',
          reason: 'Version conflict'
        }
      ],
      actions: []
    };

    const conflicts = resolver.checkConflicts(mockPlan);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].reason).toBe('Version conflict');
  });
});

describe('Circular Dependency Prevention', () => {
  test('prevents circular dependencies', async () => {
    const resolver = new DependencyResolver(TEST_PAI_DIR);

    // circular-a depends on circular-b which depends on circular-a
    // Should resolve without infinite loop
    const plan = await resolver.resolve('circular-a');

    expect(plan).toBeDefined();
    expect(plan.target).toBe('circular-a');
    // Should have resolved both packs without infinite recursion
  });
});

describe('Installation Planning', () => {
  test('creates installation actions for new pack', async () => {
    const resolver = new DependencyResolver(TEST_PAI_DIR);

    // Create a new pack that isn't "installed" yet
    createMockPack('new-pack', {
      name: 'new-pack',
      version: '1.0.0',
      description: 'New pack for installation',
      dependencies: {
        'base-pack': '^1.0.0'
      }
    });

    const plan = await resolver.resolve('new-pack');

    // Should have actions for target pack
    const targetAction = plan.actions.find(a => a.packName === 'new-pack');
    expect(targetAction).toBeDefined();

    // All dependencies should be marked as installed (skip)
    const depActions = plan.actions.filter(a => a.packName === 'base-pack');
    expect(depActions.length).toBeGreaterThan(0);
    expect(depActions[0].type).toBe('skip');
  });

  test('marks already installed dependencies as skip', async () => {
    const resolver = new DependencyResolver(TEST_PAI_DIR);
    const plan = await resolver.resolve('simple-pack');

    const basePackAction = plan.actions.find(a => a.packName === 'base-pack');
    expect(basePackAction).toBeDefined();
    expect(basePackAction?.type).toBe('skip');
    expect(basePackAction?.reason).toContain('satisfied');
  });
});

describe('Dependency Tree Building', () => {
  test('builds dependency tree for pack', async () => {
    const resolver = new DependencyResolver(TEST_PAI_DIR);
    const tree = await resolver.buildTree('simple-pack');

    expect(tree.name).toBe('simple-pack');
    expect(tree.version).toBe('1.0.0');
    expect(tree.depth).toBe(0);
    expect(tree.dependencies.length).toBe(1);
    expect(tree.dependencies[0].name).toBe('base-pack');
  });

  test('builds nested dependency tree', async () => {
    const resolver = new DependencyResolver(TEST_PAI_DIR);
    const tree = await resolver.buildTree('complex-pack');

    expect(tree.name).toBe('complex-pack');
    expect(tree.dependencies.length).toBeGreaterThanOrEqual(2);

    // Should have base-pack and simple-pack as direct dependencies
    const depNames = tree.dependencies.map(d => d.name);
    expect(depNames).toContain('base-pack');
    expect(depNames).toContain('simple-pack');

    // simple-pack should have base-pack as nested dependency
    const simplePack = tree.dependencies.find(d => d.name === 'simple-pack');
    expect(simplePack?.dependencies.length).toBe(1);
    expect(simplePack?.dependencies[0].name).toBe('base-pack');
  });

  test('handles circular dependencies in tree building', async () => {
    const resolver = new DependencyResolver(TEST_PAI_DIR);
    const tree = await resolver.buildTree('circular-a');

    expect(tree.name).toBe('circular-a');
    // Should not throw error or infinite loop
    expect(tree).toBeDefined();
  });

  test('throws error for non-installed pack', async () => {
    const resolver = new DependencyResolver(TEST_PAI_DIR);

    await expect(
      resolver.buildTree('non-existent-pack')
    ).rejects.toThrow('is not installed');
  });
});

describe('Version Range Satisfaction', () => {
  test('resolves with specific version range', async () => {
    const resolver = new DependencyResolver(TEST_PAI_DIR);
    const plan = await resolver.resolve('base-pack', '^1.0.0');

    expect(plan.version).toBe('1.0.0');
    expect(plan.conflicts.length).toBe(0);
  });

  test('throws error when version does not satisfy range', async () => {
    const resolver = new DependencyResolver(TEST_PAI_DIR);

    await expect(
      resolver.resolve('base-pack', '^2.0.0')
    ).rejects.toThrow('does not satisfy');
  });
});

describe('Resolver Options', () => {
  test('respects maxDepth option', async () => {
    const resolver = new DependencyResolver(TEST_PAI_DIR);

    // Should not throw with depth limit
    const plan = await resolver.resolve('complex-pack', '*', { maxDepth: 1 });
    expect(plan).toBeDefined();
  });

  test('respects allowOptional option', async () => {
    const resolver = new DependencyResolver(TEST_PAI_DIR);

    // With allowOptional: false, should skip optional dependencies
    const plan = await resolver.resolve('optional-pack', '*', {
      allowOptional: false
    });

    expect(plan.dependencies.length).toBe(1); // Only required dependency
    expect(plan.dependencies[0].name).toBe('base-pack');
  });
});

describe('Edge Cases', () => {
  test('handles pack with no pack.json', () => {
    const resolver = new DependencyResolver(TEST_PAI_DIR);

    // Create directory without pack.json
    const badPackDir = join(TEST_SKILLS_DIR, 'bad-pack');
    mkdirSync(badPackDir, { recursive: true });

    expect(() => resolver.getInstalled('bad-pack')).not.toThrow();
    expect(resolver.getInstalled('bad-pack')).toBeNull();
  });

  test('handles malformed pack.json gracefully', () => {
    const resolver = new DependencyResolver(TEST_PAI_DIR);

    // Create pack with invalid JSON
    const malformedDir = join(TEST_SKILLS_DIR, 'malformed-pack');
    mkdirSync(malformedDir, { recursive: true });
    writeFileSync(join(malformedDir, 'pack.json'), 'invalid json {{{');

    expect(resolver.getInstalled('malformed-pack')).toBeNull();
  });

  test('resolves wildcard version range', async () => {
    const resolver = new DependencyResolver(TEST_PAI_DIR);
    const plan = await resolver.resolve('base-pack', '*');

    expect(plan.version).toBe('1.0.0');
  });
});
