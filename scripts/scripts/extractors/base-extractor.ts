#!/usr/bin/env bun

/**
 * Base Extractor Utilities
 *
 * Shared utilities for all language-specific extractors:
 * - Project type detection
 * - File traversal
 * - Common interfaces
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { readdir, stat } from 'fs/promises';

export interface ProjectType {
  language: 'typescript' | 'javascript' | 'python' | 'java' | 'go' | 'rust' | 'csharp' | 'unknown';
  framework?: string;
  database?: string;
  testing?: string;
  buildTool?: string;
}

export interface TechStack {
  language: string;
  runtime?: string;
  frameworks: { name: string; version: string }[];
  libraries: { name: string; version: string }[];
  database?: { type: string; orm?: string };
  testing?: { framework: string; version: string }[];
  buildTools: string[];
}

export interface CodePatterns {
  services?: ServicePattern[];
  components?: ComponentPattern[];
  hooks?: HookPattern[];
  utilities?: UtilityPattern[];
  models?: ModelPattern[];
}

export interface ServicePattern {
  name: string;
  filePath: string;
  methods: { name: string; params: string[]; returnType?: string }[];
  description?: string;
}

export interface ComponentPattern {
  name: string;
  filePath: string;
  props?: string[];
  hooks?: string[];
  isServerComponent?: boolean;
}

export interface HookPattern {
  name: string;
  filePath: string;
  params: string[];
  returnType?: string;
}

export interface UtilityPattern {
  name: string;
  filePath: string;
  functions: { name: string; description?: string }[];
}

export interface ModelPattern {
  name: string;
  filePath: string;
  fields: { name: string; type: string }[];
  relations?: string[];
}

export interface DatabaseSchema {
  tables?: TableSchema[];
  enums?: EnumSchema[];
  relations?: RelationSchema[];
  orm?: string;
}

export interface TableSchema {
  name: string;
  fields: { name: string; type: string; nullable?: boolean }[];
  primaryKey?: string[];
  indexes?: string[];
}

export interface EnumSchema {
  name: string;
  values: string[];
}

export interface RelationSchema {
  from: string;
  to: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export interface APIRoute {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  filePath: string;
  description?: string;
  params?: string[];
  auth?: boolean;
}

export interface ExtractedKnowledge {
  projectType: ProjectType;
  techStack: TechStack;
  codePatterns: CodePatterns;
  databaseSchema?: DatabaseSchema;
  apiRoutes?: APIRoute[];
}

/**
 * Detect project type based on common indicators
 */
export function detectProjectType(projectRoot: string): ProjectType | null {
  // TypeScript/JavaScript - Check package.json
  const packageJsonPath = join(projectRoot, 'package.json');
  if (existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    let framework: string | undefined;
    let database: string | undefined;
    let testing: string | undefined;

    // Detect framework
    if (deps['next']) framework = 'nextjs';
    else if (deps['react']) framework = 'react';
    else if (deps['vue']) framework = 'vue';
    else if (deps['express']) framework = 'express';
    else if (deps['fastify']) framework = 'fastify';

    // Detect database
    if (deps['drizzle-orm']) database = 'drizzle';
    else if (deps['prisma']) database = 'prisma';
    else if (deps['typeorm']) database = 'typeorm';
    else if (deps['mongoose']) database = 'mongoose';

    // Detect testing
    if (deps['vitest']) testing = 'vitest';
    else if (deps['jest']) testing = 'jest';
    else if (deps['@playwright/test']) testing = 'playwright';

    // Determine if TypeScript or JavaScript
    const language = deps['typescript'] || existsSync(join(projectRoot, 'tsconfig.json'))
      ? 'typescript'
      : 'javascript';

    return { language, framework, database, testing, buildTool: 'npm' };
  }

  // Python - Check pyproject.toml or requirements.txt (both root and python/ subdirectory)
  let pyprojectPath = join(projectRoot, 'pyproject.toml');
  let requirementsPath = join(projectRoot, 'requirements.txt');

  // Check python/ subdirectory as fallback
  if (!existsSync(pyprojectPath) && !existsSync(requirementsPath)) {
    pyprojectPath = join(projectRoot, 'python', 'pyproject.toml');
    requirementsPath = join(projectRoot, 'python', 'requirements.txt');
  }

  if (existsSync(pyprojectPath) || existsSync(requirementsPath)) {
    let framework: string | undefined;
    let database: string | undefined;
    let testing: string | undefined;
    let buildTool = 'pip';

    if (existsSync(pyprojectPath)) {
      const content = readFileSync(pyprojectPath, 'utf-8');

      // Detect framework
      if (content.includes('fastapi')) framework = 'fastapi';
      else if (content.includes('django')) framework = 'django';
      else if (content.includes('flask')) framework = 'flask';

      // Detect database
      if (content.includes('sqlalchemy')) database = 'sqlalchemy';

      // Detect testing
      if (content.includes('pytest')) testing = 'pytest';

      // Detect build tool
      if (content.includes('[tool.poetry]')) buildTool = 'poetry';
      else if (content.includes('[tool.uv]')) buildTool = 'uv';
    }

    return { language: 'python', framework, database, testing, buildTool };
  }

  // Java - Check pom.xml or build.gradle
  if (existsSync(join(projectRoot, 'pom.xml'))) {
    return { language: 'java', framework: 'spring', testing: 'junit', buildTool: 'maven' };
  }

  if (existsSync(join(projectRoot, 'build.gradle')) || existsSync(join(projectRoot, 'build.gradle.kts'))) {
    return { language: 'java', framework: 'spring', testing: 'junit', buildTool: 'gradle' };
  }

  // Go - Check go.mod
  if (existsSync(join(projectRoot, 'go.mod'))) {
    return { language: 'go', buildTool: 'go' };
  }

  // Rust - Check Cargo.toml
  if (existsSync(join(projectRoot, 'Cargo.toml'))) {
    return { language: 'rust', buildTool: 'cargo' };
  }

  // C# - Check .csproj files
  if (existsSync(projectRoot)) {
    const { readdirSync } = require('fs');
    try {
      const files = readdirSync(projectRoot);
      if (files.some((file: string) => file.endsWith('.csproj'))) {
        return { language: 'csharp', framework: 'dotnet', buildTool: 'dotnet' };
      }
    } catch {
      // Ignore errors reading directory
    }
  }

  return null;
}

/**
 * Recursively find files matching a pattern
 */
export async function findFiles(
  dir: string,
  pattern: RegExp,
  exclude: string[] = ['node_modules', 'dist', 'build', '.next', 'venv', '__pycache__', '.git']
): Promise<string[]> {
  const results: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      // Skip excluded directories
      if (exclude.includes(entry.name)) continue;

      if (entry.isDirectory()) {
        const subResults = await findFiles(fullPath, pattern, exclude);
        results.push(...subResults);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        results.push(fullPath);
      }
    }
  } catch (error) {
    // Silently skip directories we can't read
  }

  return results;
}

/**
 * Get relative path from project root
 */
export function getRelativePath(projectRoot: string, filePath: string): string {
  return filePath.replace(projectRoot, '').replace(/\\/g, '/').replace(/^\//, '');
}

/**
 * Extract version from package.json dependency
 */
export function extractVersion(versionString: string): string {
  // Remove ^, ~, >=, etc.
  return versionString.replace(/^[\^~>=<]+/, '');
}
