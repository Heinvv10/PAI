#!/usr/bin/env node

/**
 * PAI Validation Orchestrator
 *
 * Unified validation command that runs all PAI validation protocols in sequence:
 * 1. NLNH (No Lies, No Hallucination) - Truth enforcement
 * 2. DGTS (Don't Game The System) - Anti-gaming patterns
 * 3. Zero Tolerance - Quality gates (console.log, errors, bundle size)
 * 4. No-Mock Validator - Mock/stub/demo detection (BLOCKING)
 * 5. Documentation-Driven TDD - Tests from docs verification
 * 6. AntiHall - Code existence validation
 * 7. E2E Tests - Playwright end-to-end testing (if UI project)
 *
 * Usage: node scripts/validation/pai-orchestrator.js [--skip-e2e] [--verbose]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

class PAIValidationOrchestrator {
  constructor(options = {}) {
    this.skipE2E = options.skipE2E || false;
    this.verbose = options.verbose || false;
    this.results = [];
    this.startTime = Date.now();
  }

  /**
   * Main orchestration entry point
   */
  async run() {
    this.printHeader();

    try {
      // Layer 1: Static Analysis & Truth Enforcement
      await this.runLayer1();

      // Layer 2: Unit Tests & Documentation Alignment
      await this.runLayer2();

      // Layer 3: End-to-End Testing (if applicable)
      if (!this.skipE2E) {
        await this.runLayer3();
      }

      // Final Report
      this.printFinalReport();

      // Exit with appropriate code
      const allPassed = this.results.every(r => r.status === 'PASS');
      process.exit(allPassed ? 0 : 1);

    } catch (error) {
      this.printError(`Orchestration failed: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Layer 1: Static Analysis & Truth Enforcement
   */
  async runLayer1() {
    this.printLayerHeader('Layer 1: Static Analysis & Truth Enforcement');

    // 1.1 NLNH Protocol
    await this.runValidation({
      name: 'NLNH Protocol',
      description: 'Truth enforcement & confidence scoring',
      command: 'python C:/Jarvis/validation/nlnh-validator.py',
      fallback: () => this.log('⚠️  NLNH validator not found - skipping', 'yellow'),
      critical: false,
    });

    // 1.2 DGTS (Don't Game The System)
    await this.runValidation({
      name: 'DGTS Anti-Gaming',
      description: 'Gaming pattern detection',
      command: 'python "C:/Jarvis/AI Workspace/Archon/python/src/agents/validation/dgts_validator.py" .',
      fallback: () => this.log('⚠️  DGTS validator not found - skipping', 'yellow'),
      critical: false,
    });

    // 1.3 Zero Tolerance Quality Gates
    await this.runValidation({
      name: 'Zero Tolerance',
      description: 'Quality gates (console.log, errors, bundle)',
      command: 'node scripts/zero-tolerance-check.js',
      fallback: () => this.log('⚠️  Zero Tolerance script not found - skipping', 'yellow'),
      critical: true,
    });

    // 1.4 No-Mock Validator (BLOCKING)
    await this.runValidation({
      name: 'No-Mock Validator',
      description: 'Mock/stub/demo pattern detection (ZERO TOLERANCE)',
      command: 'bun "' + (process.env.USERPROFILE || process.env.HOME) + '/.claude/hooks/no-mock-validator.ts"',
      fallback: () => this.log('⚠️  No-Mock validator not found - skipping', 'yellow'),
      critical: true, // BLOCKING - phase cannot complete with mocks
    });

    // 1.5 TypeScript/ESLint (Auto-discovered)
    const hasTypeScript = fs.existsSync('tsconfig.json');
    const hasESLint = fs.existsSync('.eslintrc.json') || fs.existsSync('.eslintrc.js');

    if (hasTypeScript) {
      await this.runValidation({
        name: 'TypeScript Compiler',
        description: 'Type checking',
        command: 'npx tsc --noEmit',
        critical: true,
      });
    }

    if (hasESLint) {
      await this.runValidation({
        name: 'ESLint',
        description: 'Linting',
        command: 'npx eslint . --ext .ts,.tsx,.js,.jsx',
        critical: true,
      });
    }
  }

  /**
   * Layer 2: Unit Tests & Documentation Alignment
   */
  async runLayer2() {
    this.printLayerHeader('Layer 2: Unit Tests & Documentation Alignment');

    // 2.1 AntiHall Code Existence Validation
    await this.runValidation({
      name: 'AntiHall Validator',
      description: 'Code existence verification',
      command: 'npm run antihall:check --if-present',
      fallback: () => this.log('⚠️  AntiHall not configured - skipping', 'yellow'),
      critical: false,
    });

    // 2.2 Documentation-Driven TDD
    await this.runValidation({
      name: 'Doc-Driven TDD',
      description: 'Tests from documentation verification',
      command: 'python "C:/Jarvis/AI Workspace/Archon/python/src/agents/validation/doc_driven_validator.py" .',
      fallback: () => this.log('⚠️  Doc-Driven TDD validator not found - skipping', 'yellow'),
      critical: false,
    });

    // 2.3 Unit Tests (Auto-discovered)
    const hasVitest = this.hasPackageDependency('vitest');
    const hasJest = this.hasPackageDependency('jest');
    const hasPytest = fs.existsSync('pytest.ini') || fs.existsSync('pyproject.toml');

    if (hasVitest) {
      await this.runValidation({
        name: 'Vitest Unit Tests',
        description: 'Running unit tests',
        command: 'npm run test --if-present',
        critical: true,
      });
    } else if (hasJest) {
      await this.runValidation({
        name: 'Jest Unit Tests',
        description: 'Running unit tests',
        command: 'npm test --if-present',
        critical: true,
      });
    }

    if (hasPytest) {
      await this.runValidation({
        name: 'Pytest Unit Tests',
        description: 'Running Python unit tests',
        command: 'pytest --cov --cov-report=term-missing',
        critical: true,
      });
    }
  }

  /**
   * Layer 3: End-to-End Testing
   */
  async runLayer3() {
    this.printLayerHeader('Layer 3: End-to-End Testing');

    const isUIProject = this.detectUIProject();
    const hasPlaywright = fs.existsSync('playwright.config.ts') ||
                         fs.existsSync('playwright.config.js');

    if (isUIProject && !hasPlaywright) {
      this.log('⚠️  UI project detected but Playwright not configured', 'yellow');
      this.log('   Run: node scripts/validation/e2e-generator.js to create E2E tests', 'cyan');
      this.results.push({
        name: 'E2E Tests',
        status: 'WARN',
        message: 'E2E tests not configured for UI project',
      });
      return;
    }

    if (hasPlaywright) {
      await this.runValidation({
        name: 'Playwright E2E Tests',
        description: 'End-to-end testing',
        command: 'npx playwright test',
        critical: true,
      });
    } else {
      this.log('ℹ️  Not a UI project or E2E tests not configured - skipping', 'blue');
    }
  }

  /**
   * Run a single validation check
   */
  async runValidation({ name, description, command, fallback, critical = false }) {
    this.log(`\n${colors.cyan}▶ ${name}${colors.reset}`, null, false);
    this.log(`  ${description}`, 'blue');

    try {
      const output = execSync(command, {
        encoding: 'utf-8',
        stdio: this.verbose ? 'inherit' : 'pipe',
        cwd: process.cwd(),
      });

      this.results.push({
        name,
        status: 'PASS',
        message: 'Validation passed',
      });

      this.log(`  ✓ PASS`, 'green');

      if (this.verbose && output) {
        console.log(output);
      }

    } catch (error) {
      // Check if fallback should be used
      if (fallback && error.message.includes('not found')) {
        fallback();
        this.results.push({
          name,
          status: 'SKIP',
          message: 'Validator not found',
        });
        return;
      }

      const status = critical ? 'FAIL' : 'WARN';
      this.results.push({
        name,
        status,
        message: error.message,
        output: error.stdout?.toString() || error.stderr?.toString(),
      });

      this.log(`  ✗ ${status}`, critical ? 'red' : 'yellow');

      if (this.verbose && error.stdout) {
        console.log(error.stdout.toString());
      }

      if (critical) {
        this.log(`  💥 Critical validation failed - see output above`, 'red');
      }
    }
  }

  /**
   * Detect if this is a UI project
   */
  detectUIProject() {
    return fs.existsSync('src/components') ||
           fs.existsSync('src/app') ||
           fs.existsSync('app') ||
           fs.existsSync('pages') ||
           fs.existsSync('src/pages');
  }

  /**
   * Check if package.json has a dependency
   */
  hasPackageDependency(packageName) {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      return !!(
        packageJson.dependencies?.[packageName] ||
        packageJson.devDependencies?.[packageName]
      );
    } catch {
      return false;
    }
  }

  /**
   * Print validation header
   */
  printHeader() {
    console.log(`
${colors.bright}${colors.cyan}╔═══════════════════════════════════════════════════════════╗
║  🤖 PAI VALIDATION ORCHESTRATOR                       ║
╠═══════════════════════════════════════════════════════════╣
║  Unified validation for all PAI protocols             ║
╚═══════════════════════════════════════════════════════════╝${colors.reset}
`);
  }

  /**
   * Print layer header
   */
  printLayerHeader(title) {
    console.log(`\n${colors.bright}${colors.magenta}═══ ${title} ═══${colors.reset}\n`);
  }

  /**
   * Print final validation report
   */
  printFinalReport() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warned = this.results.filter(r => r.status === 'WARN').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    const total = this.results.length;

    console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}VALIDATION SUMMARY${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);

    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✓' :
                   result.status === 'FAIL' ? '✗' :
                   result.status === 'WARN' ? '⚠' : '○';

      const color = result.status === 'PASS' ? 'green' :
                    result.status === 'FAIL' ? 'red' :
                    result.status === 'WARN' ? 'yellow' : 'blue';

      this.log(`  ${icon} ${result.name.padEnd(30)} ${result.status}`, color);
    });

    console.log(`\n${colors.cyan}───────────────────────────────────────────────────────────${colors.reset}`);
    console.log(`  Total: ${total} | ${colors.green}Passed: ${passed}${colors.reset} | ${colors.red}Failed: ${failed}${colors.reset} | ${colors.yellow}Warnings: ${warned}${colors.reset} | ${colors.blue}Skipped: ${skipped}${colors.reset}`);
    console.log(`  Duration: ${duration}s`);
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);

    if (failed > 0) {
      this.log('💥 VALIDATION FAILED - Fix critical errors above', 'red');
      console.log('');
    } else if (warned > 0) {
      this.log('⚠️  VALIDATION PASSED WITH WARNINGS - Review warnings above', 'yellow');
      console.log('');
    } else {
      this.log('✓ ALL VALIDATIONS PASSED!', 'green');
      console.log('');
    }
  }

  /**
   * Print colored log message
   */
  log(message, color = null, newline = true) {
    const colorCode = color ? colors[color] : '';
    const output = `${colorCode}${message}${colors.reset}`;

    if (newline) {
      console.log(output);
    } else {
      process.stdout.write(output);
    }
  }

  /**
   * Print error message
   */
  printError(message) {
    console.error(`${colors.red}${colors.bright}ERROR: ${message}${colors.reset}`);
  }
}

// CLI Execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    skipE2E: args.includes('--skip-e2e'),
    verbose: args.includes('--verbose') || args.includes('-v'),
  };

  const orchestrator = new PAIValidationOrchestrator(options);
  orchestrator.run().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = { PAIValidationOrchestrator };
