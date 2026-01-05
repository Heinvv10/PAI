/**
 * Pack v2.0 Structure Validation Test Template
 *
 * Based on Dan Miesler's PAI Pack v2.0 specification:
 * https://github.com/danielmiessler/Personal_AI_Infrastructure/blob/main/Packs/README.md
 *
 * USAGE: Copy this file to the skill's tests/ directory and update SKILL_DIR constant.
 *
 * CRITICAL Pack v2.0 Requirements:
 * 1. Directory-based structure (not single files)
 * 2. Real code files in src/ (not markdown-embedded)
 * 3. AI-installable design (complete INSTALL.md)
 * 4. Mandatory verification (VERIFY.md checklist)
 * 5. No code simplification (complete, production-ready code)
 *
 * TDD APPROACH: Tests should FAIL first, then implement until they PASS.
 */

import { describe, test, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

// ============================================================================
// CONFIGURATION - UPDATE THIS FOR EACH SKILL
// ============================================================================

const SKILL_NAME = 'pai-diagnostics';
const SKILL_DIR = `C:/Users/HeinvanVuuren/.claude/skills/${SKILL_NAME}`;

// ============================================================================
// TEST SUITE 1: Pack v2.0 Directory Structure (CRITICAL)
// ============================================================================

describe('Pack v2.0 Directory Structure', () => {
  test('🔴 MUST have README.md (not PACK_README.md)', () => {
    const readmePath = join(SKILL_DIR, 'README.md');
    const wrongPath = join(SKILL_DIR, 'PACK_README.md');

    console.log('\n=== README.md VALIDATION ===');
    console.log(`Expected: ${readmePath}`);
    console.log(`Exists: ${existsSync(readmePath)}`);

    if (existsSync(wrongPath)) {
      console.log(`⚠️  Found PACK_README.md - should be renamed to README.md`);
    }

    expect(existsSync(readmePath), 'Pack v2.0 requires README.md (not PACK_README.md)').toBe(true);
  });

  test('🔴 MUST have INSTALL.md (not PACK_INSTALL.md)', () => {
    const installPath = join(SKILL_DIR, 'INSTALL.md');
    const wrongPath = join(SKILL_DIR, 'PACK_INSTALL.md');

    console.log('\n=== INSTALL.md VALIDATION ===');
    console.log(`Expected: ${installPath}`);
    console.log(`Exists: ${existsSync(installPath)}`);

    if (existsSync(wrongPath)) {
      console.log(`⚠️  Found PACK_INSTALL.md - should be renamed to INSTALL.md`);
    }

    expect(existsSync(installPath), 'Pack v2.0 requires INSTALL.md (not PACK_INSTALL.md)').toBe(true);
  });

  test('🔴 MUST have VERIFY.md (not PACK_VERIFY.md)', () => {
    const verifyPath = join(SKILL_DIR, 'VERIFY.md');
    const wrongPath = join(SKILL_DIR, 'PACK_VERIFY.md');

    console.log('\n=== VERIFY.md VALIDATION ===');
    console.log(`Expected: ${verifyPath}`);
    console.log(`Exists: ${existsSync(verifyPath)}`);

    if (existsSync(wrongPath)) {
      console.log(`⚠️  Found PACK_VERIFY.md - should be renamed to VERIFY.md`);
    }

    expect(existsSync(verifyPath), 'Pack v2.0 requires VERIFY.md (not PACK_VERIFY.md)').toBe(true);
  });

  test('🔴 CRITICAL: MUST have src/ directory with real code files', () => {
    const srcPath = join(SKILL_DIR, 'src');

    console.log('\n=== src/ DIRECTORY VALIDATION ===');
    console.log(`Expected: ${srcPath}`);
    console.log(`Exists: ${existsSync(srcPath)}`);

    if (!existsSync(srcPath)) {
      console.log('❌ CRITICAL FAILURE: No src/ directory found');
      console.log('Pack v2.0 requires real code files in src/, not markdown-embedded code');
      console.log('\nRecommendation:');
      console.log('  1. Create src/ directory');
      console.log('  2. Move code files from root to src/');
      console.log('  3. Organize into subdirectories: src/config/, src/tools/, src/hooks/, etc.');
    }

    expect(existsSync(srcPath), 'Pack v2.0 REQUIRES src/ directory for real code files').toBe(true);
    expect(statSync(srcPath).isDirectory(), 'src/ must be a directory').toBe(true);
  });
});

// ============================================================================
// TEST SUITE 2: Real Code Files in src/ (Anti-Simplification)
// ============================================================================

describe('Real Code Files in src/', () => {
  test('🔴 src/ MUST contain actual code files (not empty)', () => {
    const srcPath = join(SKILL_DIR, 'src');

    if (!existsSync(srcPath)) {
      console.log('\n⏭️  SKIP: src/ does not exist (previous test should fail)');
      expect(existsSync(srcPath)).toBe(true); // Fail if src/ missing
      return;
    }

    const files = readdirSync(srcPath, { recursive: true, withFileTypes: true });
    const codeFiles = files.filter(f =>
      f.isFile() &&
      /\.(ts|js|yaml|yml|json|py|sh)$/i.test(f.name)
    );

    console.log('\n=== CODE FILES IN src/ ===');
    console.log(`Total items in src/: ${files.length}`);
    console.log(`Code files found: ${codeFiles.length}`);

    if (codeFiles.length === 0) {
      console.log('❌ No code files found in src/');
      console.log('Pack v2.0 requires real code files (TypeScript, YAML, JSON, etc.)');
      console.log('\nRecommendation:');
      console.log('  1. Extract code from markdown to real files');
      console.log('  2. Move existing code files from root to src/');
      console.log('  3. Organize by type: src/config/, src/tools/, src/hooks/');
    } else {
      console.log('\n✅ Code files found:');
      codeFiles.forEach(f => console.log(`  - ${f.name}`));
    }

    expect(codeFiles.length, 'src/ must contain actual code files').toBeGreaterThan(0);
  });

  test('🔴 Code files MUST NOT be simplified (complete implementations)', () => {
    const srcPath = join(SKILL_DIR, 'src');

    if (!existsSync(srcPath)) {
      console.log('\n⏭️  SKIP: src/ does not exist');
      expect(existsSync(srcPath)).toBe(true);
      return;
    }

    const files = readdirSync(srcPath, { recursive: true, withFileTypes: true });
    const codeFiles = files.filter(f =>
      f.isFile() &&
      /\.(ts|js)$/i.test(f.name)
    );

    console.log('\n=== CODE COMPLETENESS CHECK ===');

    const simplified = codeFiles.filter(f => {
      // Use parentPath (full directory path) and combine with file name
      const fullPath = join(f.parentPath || srcPath, f.name);
      const content = readFileSync(fullPath, 'utf-8');

      // Check for signs of AI simplification
      return (
        content.includes('// TODO: Implement') ||
        content.includes('// Simplified version') ||
        content.includes('// Placeholder') ||
        content.length < 100 // Suspiciously short
      );
    });

    if (simplified.length > 0) {
      console.log(`❌ Found ${simplified.length} potentially simplified files:`);
      simplified.forEach(f => console.log(`  - ${f.name}`));
      console.log('\nPack v2.0 Anti-Simplification Rule:');
      console.log('NEVER create "equivalent" versions - use COMPLETE implementations');
    } else {
      console.log('✅ All code files appear to be complete implementations');
    }

    expect(simplified.length, 'No simplified/placeholder code allowed').toBe(0);
  });
});

// ============================================================================
// TEST SUITE 3: INSTALL.md Completeness (AI-Installable)
// ============================================================================

describe('INSTALL.md Completeness', () => {
  test('🔴 INSTALL.md MUST have step-by-step instructions', () => {
    const installPath = join(SKILL_DIR, 'INSTALL.md');

    if (!existsSync(installPath)) {
      console.log('\n⏭️  SKIP: INSTALL.md does not exist');
      expect(existsSync(installPath)).toBe(true);
      return;
    }

    const content = readFileSync(installPath, 'utf-8');

    // Count numbered steps (1., 2., 3., etc.)
    const steps = content.match(/^\s*\d+\.\s+/gm) || [];

    console.log('\n=== INSTALL.md VALIDATION ===');
    console.log(`Installation steps found: ${steps.length}`);

    if (steps.length === 0) {
      console.log('❌ No numbered installation steps found');
      console.log('Pack v2.0 requires clear, step-by-step installation instructions');
    }

    expect(steps.length, 'INSTALL.md must have numbered steps').toBeGreaterThan(0);
  });

  test('🔴 INSTALL.md MUST reference files from src/', () => {
    const installPath = join(SKILL_DIR, 'INSTALL.md');

    if (!existsSync(installPath)) {
      console.log('\n⏭️  SKIP: INSTALL.md does not exist');
      expect(existsSync(installPath)).toBe(true);
      return;
    }

    const content = readFileSync(installPath, 'utf-8');

    // Check if INSTALL.md mentions src/ directory
    const mentionsSrc = /src\//.test(content);

    console.log('\n=== src/ REFERENCE CHECK ===');
    console.log(`INSTALL.md references src/: ${mentionsSrc}`);

    if (!mentionsSrc) {
      console.log('❌ INSTALL.md does not reference src/ directory');
      console.log('Pack v2.0 installation should copy files FROM src/');
      console.log('\nRecommendation:');
      console.log('  Add a section documenting src/ files to install');
    }

    expect(mentionsSrc, 'INSTALL.md must reference src/ directory').toBe(true);
  });
});

// ============================================================================
// TEST SUITE 4: VERIFY.md Mandatory Checklist
// ============================================================================

describe('VERIFY.md Mandatory Checklist', () => {
  test('🔴 VERIFY.md MUST have checkboxes for validation', () => {
    const verifyPath = join(SKILL_DIR, 'VERIFY.md');

    if (!existsSync(verifyPath)) {
      console.log('\n⏭️  SKIP: VERIFY.md does not exist');
      expect(existsSync(verifyPath)).toBe(true);
      return;
    }

    const content = readFileSync(verifyPath, 'utf-8');

    // Count checkbox items [ ] or [x]
    const checkboxes = content.match(/^\s*-\s+\[[ x]\]/gmi) || [];

    console.log('\n=== VERIFY.md VALIDATION ===');
    console.log(`Verification checkboxes found: ${checkboxes.length}`);

    if (checkboxes.length === 0) {
      console.log('❌ No verification checkboxes found');
      console.log('Pack v2.0 requires mandatory verification checklist');
    }

    expect(checkboxes.length, 'VERIFY.md must have verification checkboxes').toBeGreaterThan(0);
  });

  test('🔴 VERIFY.md MUST include code verification steps', () => {
    const verifyPath = join(SKILL_DIR, 'VERIFY.md');

    if (!existsSync(verifyPath)) {
      console.log('\n⏭️  SKIP: VERIFY.md does not exist');
      expect(existsSync(verifyPath)).toBe(true);
      return;
    }

    const content = readFileSync(verifyPath, 'utf-8').toLowerCase();

    // Check for common verification keywords
    const hasCodeVerification = (
      content.includes('test') ||
      content.includes('lint') ||
      content.includes('build') ||
      content.includes('compile') ||
      content.includes('run')
    );

    console.log('\n=== CODE VERIFICATION CHECK ===');
    console.log(`Has code verification steps: ${hasCodeVerification}`);

    if (!hasCodeVerification) {
      console.log('❌ No code verification steps found');
      console.log('Pack v2.0 verification should include testing/linting/building');
    }

    expect(hasCodeVerification, 'VERIFY.md must include code verification').toBe(true);
  });
});

// ============================================================================
// TEST SUITE 5: README.md Quality
// ============================================================================

describe('README.md Quality', () => {
  test('🔴 README.md MUST explain what problem the pack solves', () => {
    const readmePath = join(SKILL_DIR, 'README.md');

    if (!existsSync(readmePath)) {
      console.log('\n⏭️  SKIP: README.md does not exist');
      expect(existsSync(readmePath)).toBe(true);
      return;
    }

    const content = readFileSync(readmePath, 'utf-8').toLowerCase();

    // Check for problem/solution language
    const explainsProblem = (
      content.includes('problem') ||
      content.includes('challenge') ||
      content.includes('issue') ||
      content.includes('solves') ||
      content.includes('addresses')
    );

    console.log('\n=== README.md PROBLEM STATEMENT ===');
    console.log(`Explains problem/solution: ${explainsProblem}`);

    if (!explainsProblem) {
      console.log('❌ README.md does not clearly explain the problem being solved');
      console.log('Pack v2.0 README should explain: What problem? How does pack solve it?');
    }

    expect(explainsProblem, 'README.md must explain problem being solved').toBe(true);
  });

  test('🔴 README.md MUST have architecture/design section', () => {
    const readmePath = join(SKILL_DIR, 'README.md');

    if (!existsSync(readmePath)) {
      console.log('\n⏭️  SKIP: README.md does not exist');
      expect(existsSync(readmePath)).toBe(true);
      return;
    }

    const content = readFileSync(readmePath, 'utf-8').toLowerCase();

    // Check for architecture/design content
    const hasArchitecture = (
      content.includes('architecture') ||
      content.includes('design') ||
      content.includes('how it works') ||
      content.includes('components')
    );

    console.log('\n=== README.md ARCHITECTURE ===');
    console.log(`Has architecture section: ${hasArchitecture}`);

    if (!hasArchitecture) {
      console.log('❌ README.md missing architecture/design section');
      console.log('Pack v2.0 README should explain how the pack works');
    }

    expect(hasArchitecture, 'README.md must have architecture section').toBe(true);
  });
});
