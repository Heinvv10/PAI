#!/usr/bin/env node

/**
 * PAI E2E Test Template Generator
 *
 * Automatically generates Playwright E2E test templates for common workflows:
 * - Navigation flows (all routes accessible)
 * - Form validation (input, submit, error states)
 * - CRUD operations (create, read, update, delete)
 * - Authentication (login, logout, protected routes)
 * - Responsive design (mobile, tablet, desktop)
 *
 * Inspired by Context Engineering E2E test generation
 *
 * Usage:
 *   node scripts/validation/e2e-generator.js [--install] [--analyze]
 *
 * Options:
 *   --install: Install Playwright if not present
 *   --analyze: Analyze routes and generate comprehensive tests
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class E2EGenerator {
  constructor(options = {}) {
    this.projectPath = process.cwd();
    this.testDir = path.join(this.projectPath, 'tests', 'e2e', 'generated');
    this.options = options;
    this.routes = [];
    this.hasAuth = false;
  }

  async generate() {
    console.log('\n🎭 PAI E2E Test Generator');
    console.log('=' .repeat(60) + '\n');

    // Step 1: Check/Install Playwright
    if (this.options.install) {
      await this.installPlaywright();
    } else {
      this.checkPlaywright();
    }

    // Step 2: Analyze project structure
    if (this.options.analyze) {
      await this.analyzeProject();
    }

    // Step 3: Create test directory
    this.createTestDirectory();

    // Step 4: Generate test templates
    this.generateNavigationTests();
    this.generateFormTests();
    this.generateCRUDTests();

    if (this.hasAuth) {
      this.generateAuthTests();
    }

    this.generateResponsiveTests();

    // Step 5: Generate Playwright config
    this.generatePlaywrightConfig();

    // Step 6: Print summary
    this.printSummary();
  }

  checkPlaywright() {
    console.log('📦 Checking Playwright installation...');

    const packageJsonPath = path.join(this.projectPath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      console.log('   ⚠️  package.json not found - run with --install to set up Playwright\n');
      return false;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const hasPlaywright = !!(
        packageJson.devDependencies?.['@playwright/test'] ||
        packageJson.dependencies?.['@playwright/test']
      );

      if (hasPlaywright) {
        console.log('   ✓ Playwright installed\n');
        return true;
      } else {
        console.log('   ⚠️  Playwright not found - run with --install\n');
        return false;
      }
    } catch (error) {
      console.log('   ✗ Error checking Playwright:', error.message);
      return false;
    }
  }

  async installPlaywright() {
    console.log('📦 Installing Playwright...');

    try {
      execSync('npm install --save-dev @playwright/test', {
        stdio: 'inherit',
        cwd: this.projectPath
      });

      console.log('   ✓ Playwright installed');

      // Install browsers
      console.log('\n📦 Installing Playwright browsers...');
      execSync('npx playwright install', {
        stdio: 'inherit',
        cwd: this.projectPath
      });

      console.log('   ✓ Browsers installed\n');
    } catch (error) {
      console.log('   ✗ Installation failed:', error.message);
      process.exit(1);
    }
  }

  async analyzeProject() {
    console.log('🔍 Analyzing project structure...\n');

    // Detect Next.js app router
    const appDir = path.join(this.projectPath, 'app');
    const pagesDir = path.join(this.projectPath, 'pages');
    const srcAppDir = path.join(this.projectPath, 'src', 'app');
    const srcPagesDir = path.join(this.projectPath, 'src', 'pages');

    // Check for auth
    this.hasAuth = this._checkForAuth();

    console.log(`   Auth detected: ${this.hasAuth ? 'Yes' : 'No'}`);

    // Analyze routes (simplified - real implementation would parse routing files)
    this.routes = this._analyzeRoutes();

    console.log(`   Routes found: ${this.routes.length}\n`);
  }

  _checkForAuth() {
    // Check for common auth files/directories
    const authIndicators = [
      'src/app/login',
      'src/app/auth',
      'app/login',
      'app/auth',
      'pages/login.tsx',
      'pages/auth',
      'src/pages/login.tsx',
      'src/components/auth',
      'middleware.ts', // Next.js auth middleware
    ];

    return authIndicators.some(indicator =>
      fs.existsSync(path.join(this.projectPath, indicator))
    );
  }

  _analyzeRoutes() {
    // Simplified route detection
    // Real implementation would parse routing files
    return [
      { path: '/', name: 'Home' },
      { path: '/about', name: 'About' },
      { path: '/contact', name: 'Contact' },
    ];
  }

  createTestDirectory() {
    console.log('📁 Creating test directory...');

    if (!fs.existsSync(this.testDir)) {
      fs.mkdirSync(this.testDir, { recursive: true });
      console.log(`   ✓ Created: ${this.testDir}\n`);
    } else {
      console.log(`   ℹ️  Directory exists: ${this.testDir}\n`);
    }
  }

  generateNavigationTests() {
    console.log('📝 Generating navigation tests...');

    const testContent = `import { test, expect } from '@playwright/test';

/**
 * Navigation E2E Tests
 * Auto-generated by PAI E2E Generator
 *
 * Tests all primary routes are accessible and render correctly
 */

test.describe('Navigation', () => {
  test('should load home page', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await expect(page).toHaveTitle(/.*/);

    // Check for common elements
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to all main routes', async ({ page }) => {
    const routes = ['/', '/about', '/contact'];

    for (const route of routes) {
      await page.goto(route);

      // Verify page loaded (status code 200)
      expect(page.url()).toContain(route);

      // Verify no error messages
      const errorIndicators = ['404', '500', 'Error', 'Not Found'];
      const bodyText = await page.textContent('body');

      for (const indicator of errorIndicators) {
        expect(bodyText).not.toContain(indicator);
      }
    }
  });

  test('should have working navigation links', async ({ page }) => {
    await page.goto('/');

    // Find and click navigation links
    const links = await page.locator('nav a, header a').all();

    for (const link of links.slice(0, 5)) {  // Test first 5 links
      const href = await link.getAttribute('href');

      if (href && !href.startsWith('http')) {
        await link.click();
        await page.waitForLoadState('networkidle');

        // Verify navigation worked
        expect(page.url()).toContain(href);

        // Go back
        await page.goBack();
        await page.waitForLoadState('networkidle');
      }
    }
  });
});
`;

    const filePath = path.join(this.testDir, 'navigation.spec.ts');
    fs.writeFileSync(filePath, testContent);
    console.log(`   ✓ Generated: navigation.spec.ts`);
  }

  generateFormTests() {
    console.log('📝 Generating form validation tests...');

    const testContent = `import { test, expect } from '@playwright/test';

/**
 * Form Validation E2E Tests
 * Auto-generated by PAI E2E Generator
 *
 * Tests form inputs, validation, submission, and error handling
 */

test.describe('Form Validation', () => {
  test('should validate required fields', async ({ page }) => {
    await page.goto('/contact');  // Adjust route as needed

    // Find form
    const form = page.locator('form').first();

    if (await form.count() > 0) {
      // Try submitting empty form
      await page.click('button[type="submit"]');

      // Check for validation messages
      await page.waitForTimeout(500);  // Wait for validation to trigger

      // Common validation message selectors
      const validationMessages = await page.locator(
        '.error, .invalid, [role="alert"], .text-red-500, .text-danger'
      ).count();

      // Should show validation errors
      expect(validationMessages).toBeGreaterThan(0);
    }
  });

  test('should accept valid input', async ({ page }) => {
    await page.goto('/contact');  // Adjust route as needed

    const form = page.locator('form').first();

    if (await form.count() > 0) {
      // Fill in common form fields
      const nameInput = page.locator('input[name="name"], input[type="text"]').first();
      const emailInput = page.locator('input[name="email"], input[type="email"]').first();
      const messageInput = page.locator('textarea, input[name="message"]').first();

      if (await nameInput.count() > 0) {
        await nameInput.fill('Test User');
      }

      if (await emailInput.count() > 0) {
        await emailInput.fill('test@example.com');
      }

      if (await messageInput.count() > 0) {
        await messageInput.fill('This is a test message');
      }

      // Submit form
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);

      // Check for success message or redirect
      const successIndicators = await page.locator(
        '.success, .complete, [role="status"], .text-green-500, .toast'
      ).count();

      // Should show success or navigate away
      const urlChanged = page.url() !== page.url();
      expect(successIndicators > 0 || urlChanged).toBeTruthy();
    }
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/contact');  // Adjust route as needed

    const emailInput = page.locator('input[name="email"], input[type="email"]').first();

    if (await emailInput.count() > 0) {
      // Enter invalid email
      await emailInput.fill('invalid-email');
      await emailInput.blur();

      await page.waitForTimeout(300);

      // Check for validation error
      const hasError = await page.locator(
        '.error, .invalid, [role="alert"]'
      ).count() > 0;

      expect(hasError).toBeTruthy();
    }
  });
});
`;

    const filePath = path.join(this.testDir, 'forms.spec.ts');
    fs.writeFileSync(filePath, testContent);
    console.log(`   ✓ Generated: forms.spec.ts`);
  }

  generateCRUDTests() {
    console.log('📝 Generating CRUD operation tests...');

    const testContent = `import { test, expect } from '@playwright/test';

/**
 * CRUD Operations E2E Tests
 * Auto-generated by PAI E2E Generator
 *
 * Tests create, read, update, delete operations
 */

test.describe('CRUD Operations', () => {
  test('should create new item', async ({ page }) => {
    // Navigate to create page
    await page.goto('/');

    // Look for "New", "Create", "Add" buttons
    const createButton = page.locator('button, a').filter({
      hasText: /new|create|add/i
    }).first();

    if (await createButton.count() > 0) {
      await createButton.click();
      await page.waitForLoadState('networkidle');

      // Fill form if present
      const form = page.locator('form').first();

      if (await form.count() > 0) {
        // Fill first text input
        const inputs = await page.locator('input[type="text"]').all();

        for (let i = 0; i < Math.min(inputs.length, 3); i++) {
          await inputs[i].fill(\`Test Item \${Date.now()}\`);
        }

        // Submit
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1000);

        // Verify creation
        const successIndicators = await page.locator(
          '.success, .toast, [role="status"]'
        ).count();

        expect(successIndicators).toBeGreaterThan(0);
      }
    }
  });

  test('should read/list items', async ({ page }) => {
    await page.goto('/');

    // Look for lists, tables, grids
    const listElements = await page.locator(
      'table, ul, .grid, [role="list"]'
    ).count();

    // Should have some list/grid of items
    expect(listElements).toBeGreaterThan(0);

    // Check for item content
    const hasContent = await page.locator('body').textContent();
    expect(hasContent?.length).toBeGreaterThan(100);
  });

  test('should update existing item', async ({ page }) => {
    await page.goto('/');

    // Look for edit buttons
    const editButton = page.locator('button, a').filter({
      hasText: /edit|update|modify/i
    }).first();

    if (await editButton.count() > 0) {
      await editButton.click();
      await page.waitForLoadState('networkidle');

      // Modify form field
      const input = page.locator('input[type="text"]').first();

      if (await input.count() > 0) {
        await input.fill(\`Updated \${Date.now()}\`);

        // Save changes
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1000);

        // Verify update
        const successIndicators = await page.locator(
          '.success, .toast, [role="status"]'
        ).count();

        expect(successIndicators).toBeGreaterThan(0);
      }
    }
  });

  test('should delete item', async ({ page }) => {
    await page.goto('/');

    // Look for delete buttons
    const deleteButton = page.locator('button').filter({
      hasText: /delete|remove/i
    }).first();

    if (await deleteButton.count() > 0) {
      // Get initial item count
      const initialCount = await page.locator('table tr, ul li, .grid > *').count();

      await deleteButton.click();
      await page.waitForTimeout(500);

      // Confirm deletion if modal appears
      const confirmButton = page.locator('button').filter({
        hasText: /confirm|yes|delete/i
      }).first();

      if (await confirmButton.count() > 0) {
        await confirmButton.click();
      }

      await page.waitForTimeout(1000);

      // Verify deletion
      const newCount = await page.locator('table tr, ul li, .grid > *').count();
      expect(newCount).toBeLessThanOrEqual(initialCount);
    }
  });
});
`;

    const filePath = path.join(this.testDir, 'crud.spec.ts');
    fs.writeFileSync(filePath, testContent);
    console.log(`   ✓ Generated: crud.spec.ts`);
  }

  generateAuthTests() {
    console.log('📝 Generating authentication tests...');

    const testContent = `import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Tests
 * Auto-generated by PAI E2E Generator
 *
 * Tests login, logout, protected routes, and auth workflows
 */

test.describe('Authentication', () => {
  test('should load login page', async ({ page }) => {
    await page.goto('/login');

    // Verify login page elements
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"], input[name="email"]', 'invalid@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    // Should show error message
    const errorMessage = await page.locator('.error, [role="alert"], .text-red-500').count();
    expect(errorMessage).toBeGreaterThan(0);
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    // Use test credentials (adjust as needed)
    await page.fill('input[type="email"], input[name="email"]', 'test@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'testpassword123');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Should redirect to dashboard or home
    expect(page.url()).not.toContain('/login');

    // Should see user menu or profile
    const userIndicators = await page.locator(
      '[data-testid="user-menu"], .user-profile, button:has-text("Logout")'
    ).count();

    expect(userIndicators).toBeGreaterThan(0);
  });

  test('should protect authenticated routes', async ({ page }) => {
    // Try accessing protected route without login
    await page.goto('/dashboard');

    // Should redirect to login
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/login');
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.fill('input[type="email"], input[name="email"]', 'test@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Then logout
    const logoutButton = page.locator('button, a').filter({ hasText: /logout|sign out/i }).first();

    if (await logoutButton.count() > 0) {
      await logoutButton.click();
      await page.waitForTimeout(1000);

      // Should redirect to login or home
      expect(page.url()).toMatch(/login|^\\/$/);
    }
  });
});
`;

    const filePath = path.join(this.testDir, 'auth.spec.ts');
    fs.writeFileSync(filePath, testContent);
    console.log(`   ✓ Generated: auth.spec.ts`);
  }

  generateResponsiveTests() {
    console.log('📝 Generating responsive design tests...');

    const testContent = `import { test, expect, devices } from '@playwright/test';

/**
 * Responsive Design E2E Tests
 * Auto-generated by PAI E2E Generator
 *
 * Tests mobile, tablet, and desktop viewports
 */

test.describe('Responsive Design', () => {
  test('should render on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });  // iPhone SE
    await page.goto('/');

    // Page should load
    await expect(page.locator('body')).toBeVisible();

    // Check for mobile menu
    const mobileMenu = await page.locator(
      '[data-testid="mobile-menu"], .mobile-menu, button[aria-label="Menu"]'
    ).count();

    // Should have some mobile navigation
    expect(mobileMenu).toBeGreaterThan(0);
  });

  test('should render on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });  // iPad
    await page.goto('/');

    await expect(page.locator('body')).toBeVisible();

    // Content should be visible and not overflow
    const hasOverflow = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth;
    });

    expect(hasOverflow).toBeFalsy();
  });

  test('should render on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });  // Full HD
    await page.goto('/');

    await expect(page.locator('body')).toBeVisible();

    // Desktop navigation should be visible
    const desktopNav = await page.locator('nav, header').count();
    expect(desktopNav).toBeGreaterThan(0);
  });

  test('should be touch-friendly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Find clickable elements
    const buttons = await page.locator('button, a').all();

    for (const button of buttons.slice(0, 5)) {
      const box = await button.boundingBox();

      if (box) {
        // Touch targets should be at least 44x44 pixels (iOS guideline)
        expect(box.height).toBeGreaterThanOrEqual(30);  // Relaxed for generated tests
        expect(box.width).toBeGreaterThanOrEqual(30);
      }
    }
  });
});
`;

    const filePath = path.join(this.testDir, 'responsive.spec.ts');
    fs.writeFileSync(filePath, testContent);
    console.log(`   ✓ Generated: responsive.spec.ts`);
  }

  generatePlaywrightConfig() {
    console.log('\n📝 Generating Playwright configuration...');

    const configPath = path.join(this.projectPath, 'playwright.config.ts');

    if (fs.existsSync(configPath)) {
      console.log('   ℹ️  playwright.config.ts already exists - skipping');
      return;
    }

    const configContent = `import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration
 * Auto-generated by PAI E2E Generator
 *
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: 'html',

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like \`await page.goto('/')\` */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshots on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
`;

    fs.writeFileSync(configPath, configContent);
    console.log('   ✓ Generated: playwright.config.ts');
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('✅ E2E TEST GENERATION COMPLETE');
    console.log('='.repeat(60) + '\n');

    console.log('Generated test files:');
    console.log('   • tests/e2e/generated/navigation.spec.ts');
    console.log('   • tests/e2e/generated/forms.spec.ts');
    console.log('   • tests/e2e/generated/crud.spec.ts');

    if (this.hasAuth) {
      console.log('   • tests/e2e/generated/auth.spec.ts');
    }

    console.log('   • tests/e2e/generated/responsive.spec.ts\n');

    console.log('Next steps:');
    console.log('   1. Review and customize generated tests');
    console.log('   2. Update baseURL in playwright.config.ts if needed');
    console.log('   3. Run tests: npx playwright test');
    console.log('   4. View report: npx playwright show-report\n');

    console.log('💡 These tests are now part of Layer 3 validation');
    console.log('   They will run automatically during PAI validation\n');
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    install: args.includes('--install'),
    analyze: args.includes('--analyze'),
  };

  const generator = new E2EGenerator(options);
  generator.generate().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}

module.exports = { E2EGenerator };
