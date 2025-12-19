#!/usr/bin/env bun

/**
 * TypeScript/JavaScript Codebase Extractor
 *
 * Uses ts-morph for AST analysis to extract:
 * - Tech stack from package.json
 * - Code patterns (services, hooks, components)
 * - Database schemas (Drizzle, Prisma)
 * - API routes (Next.js, Express)
 */

import { Project, SyntaxKind, SourceFile } from 'ts-morph';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  TechStack,
  CodePatterns,
  DatabaseSchema,
  APIRoute,
  ExtractedKnowledge,
  ProjectType,
  findFiles,
  getRelativePath,
  extractVersion,
  ServicePattern,
  ComponentPattern,
  HookPattern,
  TableSchema,
  EnumSchema,
} from './base-extractor.ts';

export class TypeScriptExtractor {
  private project: Project;
  private projectRoot: string;
  private projectType: ProjectType;

  constructor(projectRoot: string, projectType: ProjectType) {
    this.projectRoot = projectRoot;
    this.projectType = projectType;

    // Initialize ts-morph project
    const tsconfigPath = join(projectRoot, 'tsconfig.json');
    this.project = new Project({
      tsConfigFilePath: existsSync(tsconfigPath) ? tsconfigPath : undefined,
      skipAddingFilesFromTsConfig: true,
    });
  }

  /**
   * Extract all knowledge from TypeScript/JavaScript project
   */
  async extract(): Promise<ExtractedKnowledge> {
    console.log('[ts-extractor] 🔍 Analyzing TypeScript/JavaScript project...');

    const techStack = await this.extractTechStack();
    const codePatterns = await this.extractCodePatterns();
    const databaseSchema = await this.extractDatabaseSchema();
    const apiRoutes = await this.extractAPIRoutes();

    return {
      projectType: this.projectType,
      techStack,
      codePatterns,
      databaseSchema,
      apiRoutes,
    };
  }

  /**
   * Extract tech stack from package.json
   */
  private async extractTechStack(): Promise<TechStack> {
    const packageJsonPath = join(this.projectRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    const frameworks: { name: string; version: string }[] = [];
    const libraries: { name: string; version: string }[] = [];
    const testing: { framework: string; version: string }[] = [];
    const buildTools: string[] = [];

    // Frameworks
    if (deps['next']) frameworks.push({ name: 'Next.js', version: extractVersion(deps['next']) });
    if (deps['react']) frameworks.push({ name: 'React', version: extractVersion(deps['react']) });
    if (deps['express']) frameworks.push({ name: 'Express', version: extractVersion(deps['express']) });

    // Major libraries
    if (deps['@tanstack/react-query']) libraries.push({ name: 'TanStack Query', version: extractVersion(deps['@tanstack/react-query']) });
    if (deps['zustand']) libraries.push({ name: 'Zustand', version: extractVersion(deps['zustand']) });
    if (deps['react-hook-form']) libraries.push({ name: 'React Hook Form', version: extractVersion(deps['react-hook-form']) });
    if (deps['socket.io-client']) libraries.push({ name: 'Socket.IO Client', version: extractVersion(deps['socket.io-client']) });

    // Testing
    if (deps['vitest']) testing.push({ framework: 'Vitest', version: extractVersion(deps['vitest']) });
    if (deps['jest']) testing.push({ framework: 'Jest', version: extractVersion(deps['jest']) });
    if (deps['@playwright/test']) testing.push({ framework: 'Playwright', version: extractVersion(deps['@playwright/test']) });

    // Build tools
    if (deps['vite']) buildTools.push('Vite');
    if (deps['webpack']) buildTools.push('Webpack');
    if (deps['esbuild']) buildTools.push('esbuild');
    if (existsSync(join(this.projectRoot, 'turbo.json'))) buildTools.push('Turbo');

    // Database
    let database: { type: string; orm?: string } | undefined;
    if (deps['drizzle-orm']) {
      database = { type: 'PostgreSQL', orm: 'Drizzle ORM' };
    } else if (deps['prisma']) {
      database = { type: 'Unknown', orm: 'Prisma' };
    }

    return {
      language: this.projectType.language === 'typescript' ? 'TypeScript' : 'JavaScript',
      runtime: 'Node.js',
      frameworks,
      libraries,
      database,
      testing,
      buildTools,
    };
  }

  /**
   * Extract code patterns (services, components, hooks)
   */
  private async extractCodePatterns(): Promise<CodePatterns> {
    const services = await this.extractServices();
    const components = await this.extractComponents();
    const hooks = await this.extractHooks();

    return { services, components, hooks };
  }

  /**
   * Extract service patterns (optimized)
   */
  private async extractServices(): Promise<ServicePattern[]> {
    console.log('[ts-extractor] 🔧 Scanning services...');

    const serviceFiles = await findFiles(
      this.projectRoot,
      /Service\.(ts|tsx|js|jsx)$/,
      ['node_modules', 'dist', 'build', '.next']
    );

    console.log(`[ts-extractor]    Found ${serviceFiles.length} service files`);

    const services: ServicePattern[] = [];

    for (const filePath of serviceFiles) {
      const sourceFile = this.project.addSourceFileAtPath(filePath);
      const classes = sourceFile.getClasses();

      for (const cls of classes) {
        const methods = cls.getMethods().map(method => ({
          name: method.getName(),
          params: method.getParameters().map(p => p.getName()),
          returnType: method.getReturnType().getText(),
        }));

        services.push({
          name: cls.getName() || 'UnknownService',
          filePath: getRelativePath(this.projectRoot, filePath),
          methods,
        });
      }
    }

    console.log(`[ts-extractor]    ✓ Extracted ${services.length} service patterns`);
    return services;
  }

  /**
   * Extract React component patterns (optimized - sample only)
   */
  private async extractComponents(): Promise<ComponentPattern[]> {
    console.log('[ts-extractor] 🎨 Scanning components (sampling)...');

    const componentFiles = await findFiles(
      this.projectRoot,
      /\.(tsx|jsx)$/,
      ['node_modules', 'dist', 'build', '.next', 'tests', 'test']
    );

    // Filter to component directories only
    const componentDirFiles = componentFiles.filter(f =>
      f.includes('components') || f.includes('app')
    );

    console.log(`[ts-extractor]    Found ${componentDirFiles.length} component files, sampling 30...`);

    const components: ComponentPattern[] = [];

    // Sample only first 30 components for performance
    const sampleFiles = componentDirFiles.slice(0, 30);

    for (const filePath of sampleFiles) {
      const sourceFile = this.project.addSourceFileAtPath(filePath);
      const functions = sourceFile.getFunctions();
      const defaultExport = sourceFile.getDefaultExportSymbol();

      // Check for 'use client' directive
      const isClientComponent = sourceFile.getStatements().some(
        stmt => stmt.getKind() === SyntaxKind.ExpressionStatement &&
          stmt.getText().includes("'use client'")
      );

      // Extract component name
      let componentName: string | undefined;
      if (defaultExport) {
        componentName = defaultExport.getName();
      } else if (functions.length > 0) {
        componentName = functions[0].getName();
      }

      if (componentName) {
        components.push({
          name: componentName,
          filePath: getRelativePath(this.projectRoot, filePath),
          isServerComponent: !isClientComponent,
        });
      }
    }

    console.log(`[ts-extractor]    ✓ Extracted ${components.length} component patterns`);
    return components;
  }

  /**
   * Extract custom React hooks (optimized - sample)
   */
  private async extractHooks(): Promise<HookPattern[]> {
    console.log('[ts-extractor] 🪝 Scanning custom hooks...');

    const hookFiles = await findFiles(
      this.projectRoot,
      /use[A-Z].*\.(ts|tsx|js|jsx)$/,
      ['node_modules', 'dist', 'build', '.next']
    );

    console.log(`[ts-extractor]    Found ${hookFiles.length} hook files, sampling 20...`);

    const hooks: HookPattern[] = [];

    // Sample only first 20 hooks for performance
    const sampleFiles = hookFiles.slice(0, 20);

    for (const filePath of sampleFiles) {
      const sourceFile = this.project.addSourceFileAtPath(filePath);
      const functions = sourceFile.getFunctions();

      for (const func of functions) {
        if (func.getName()?.startsWith('use')) {
          hooks.push({
            name: func.getName() || 'unknownHook',
            filePath: getRelativePath(this.projectRoot, filePath),
            params: func.getParameters().map(p => p.getName()),
            returnType: func.getReturnType().getText(),
          });
        }
      }
    }

    console.log(`[ts-extractor]    ✓ Extracted ${hooks.length} hook patterns`);
    return hooks;
  }

  /**
   * Extract database schema (Drizzle ORM - optimized)
   */
  private async extractDatabaseSchema(): Promise<DatabaseSchema | undefined> {
    if (this.projectType.database !== 'drizzle') return undefined;

    console.log('[ts-extractor] 🗄️  Scanning database schemas...');

    const schemaFiles = await findFiles(
      this.projectRoot,
      /-schema\.(ts|js)$/,
      ['node_modules', 'dist', 'build']
    );

    if (schemaFiles.length === 0) {
      console.log('[ts-extractor]    No schema files found');
      return undefined;
    }

    console.log(`[ts-extractor]    Found ${schemaFiles.length} schema files`);

    const tables: TableSchema[] = [];
    const enums: EnumSchema[] = [];

    for (const filePath of schemaFiles) {
      const sourceFile = this.project.addSourceFileAtPath(filePath);
      const variables = sourceFile.getVariableDeclarations();

      for (const variable of variables) {
        const initializer = variable.getInitializer();
        if (!initializer) continue;

        const text = initializer.getText();

        // Detect enums (pgEnum)
        if (text.includes('pgEnum')) {
          const name = variable.getName();
          const match = text.match(/\[(.*?)\]/);
          if (match) {
            const values = match[1]
              .split(',')
              .map(v => v.trim().replace(/['"]/g, ''));
            enums.push({ name, values });
          }
        }

        // Detect tables (pgTable)
        if (text.includes('pgTable')) {
          const name = variable.getName();
          tables.push({
            name,
            fields: [], // Would need deeper AST analysis for fields
          });
        }
      }
    }

    console.log(`[ts-extractor]    ✓ Extracted ${tables.length} tables, ${enums.length} enums`);

    return {
      tables,
      enums,
      orm: 'Drizzle ORM',
    };
  }

  /**
   * Extract API routes (Next.js App Router - optimized)
   */
  private async extractAPIRoutes(): Promise<APIRoute[]> {
    if (this.projectType.framework !== 'nextjs') return [];

    console.log('[ts-extractor] 🌐 Scanning API routes...');

    const apiDir = join(this.projectRoot, 'app', 'api');
    if (!existsSync(apiDir)) {
      console.log('[ts-extractor]    No app/api directory found');
      return [];
    }

    const routeFiles = await findFiles(
      apiDir,
      /route\.(ts|js)$/,
      ['node_modules']
    );

    console.log(`[ts-extractor]    Found ${routeFiles.length} API route files`);

    const routes: APIRoute[] = [];

    for (const filePath of routeFiles) {
      const sourceFile = this.project.addSourceFileAtPath(filePath);
      const functions = sourceFile.getFunctions();

      for (const func of functions) {
        const name = func.getName();
        if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(name || '')) {
          // Extract route path from file location
          const relativePath = getRelativePath(this.projectRoot, filePath);
          const routePath = relativePath
            .replace('app/api/', '/api/')
            .replace('/route.ts', '')
            .replace('/route.js', '');

          routes.push({
            path: routePath,
            method: name as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
            filePath: relativePath,
            auth: sourceFile.getText().includes('auth()'), // Clerk auth detection
          });
        }
      }
    }

    console.log(`[ts-extractor]    ✓ Extracted ${routes.length} API endpoints`);
    return routes;
  }
}
