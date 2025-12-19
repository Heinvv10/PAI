#!/usr/bin/env bun

/**
 * Python Codebase Extractor
 *
 * Uses Python's ast module via subprocess to extract:
 * - Tech stack from pyproject.toml / requirements.txt
 * - Code patterns (classes, functions, models)
 * - Database models (SQLAlchemy, Django ORM)
 * - API routes (FastAPI, Django)
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  TechStack,
  CodePatterns,
  DatabaseSchema,
  APIRoute,
  ExtractedKnowledge,
  ProjectType,
  findFiles,
  getRelativePath,
  ServicePattern,
  ModelPattern,
} from './base-extractor.ts';

const execAsync = promisify(exec);

export class PythonExtractor {
  private projectRoot: string;
  private projectType: ProjectType;

  constructor(projectRoot: string, projectType: ProjectType) {
    this.projectRoot = projectRoot;
    this.projectType = projectType;
  }

  /**
   * Extract all knowledge from Python project
   */
  async extract(): Promise<ExtractedKnowledge> {
    console.log('[py-extractor] 🔍 Analyzing Python project...');

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
   * Extract tech stack from pyproject.toml or requirements.txt
   */
  private async extractTechStack(): Promise<TechStack> {
    const frameworks: { name: string; version: string }[] = [];
    const libraries: { name: string; version: string }[] = [];
    const testing: { framework: string; version: string }[] = [];
    const buildTools: string[] = [];
    let database: { type: string; orm?: string } | undefined;

    // Try pyproject.toml first (modern Python)
    const pyprojectPath = join(this.projectRoot, 'pyproject.toml');
    if (existsSync(pyprojectPath)) {
      const content = readFileSync(pyprojectPath, 'utf-8');

      // Detect build tool
      if (content.includes('[tool.poetry]')) buildTools.push('Poetry');
      else if (content.includes('[tool.uv]')) buildTools.push('uv');
      else buildTools.push('pip');

      // Extract dependencies
      const depMatches = content.matchAll(/([a-z-]+)\s*=\s*["']([^"']+)["']/g);
      for (const match of depMatches) {
        const [, name, version] = match;

        // Frameworks
        if (name === 'fastapi') frameworks.push({ name: 'FastAPI', version });
        else if (name === 'django') frameworks.push({ name: 'Django', version });
        else if (name === 'flask') frameworks.push({ name: 'Flask', version });

        // Database
        if (name === 'sqlalchemy') database = { type: 'Unknown', orm: 'SQLAlchemy' };

        // Testing
        if (name === 'pytest') testing.push({ framework: 'pytest', version });
      }
    }

    // Fallback to requirements.txt
    const requirementsPath = join(this.projectRoot, 'requirements.txt');
    if (existsSync(requirementsPath) && frameworks.length === 0) {
      const content = readFileSync(requirementsPath, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') || !trimmed) continue;

        const [pkg, version] = trimmed.split('==');
        const name = pkg.toLowerCase();

        if (name === 'fastapi') frameworks.push({ name: 'FastAPI', version: version || 'latest' });
        else if (name === 'django') frameworks.push({ name: 'Django', version: version || 'latest' });
        else if (name === 'sqlalchemy') database = { type: 'Unknown', orm: 'SQLAlchemy' };
        else if (name === 'pytest') testing.push({ framework: 'pytest', version: version || 'latest' });
      }

      buildTools.push('pip');
    }

    return {
      language: 'Python',
      runtime: 'CPython',
      frameworks,
      libraries,
      database,
      testing,
      buildTools,
    };
  }

  /**
   * Extract code patterns (classes, functions)
   */
  private async extractCodePatterns(): Promise<CodePatterns> {
    const services = await this.extractServices();
    const models = await this.extractModels();

    return { services, models };
  }

  /**
   * Extract service/class patterns using Python AST
   */
  private async extractServices(): Promise<ServicePattern[]> {
    const pythonFiles = await findFiles(
      this.projectRoot,
      /\.py$/,
      ['venv', '__pycache__', 'node_modules', 'dist', 'build', '.venv', 'env']
    );

    const services: ServicePattern[] = [];

    // Create Python script to analyze files using ast module
    const pythonScript = `
import ast
import sys
import json

def analyze_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            tree = ast.parse(f.read())

        classes = []
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                methods = []
                for item in node.body:
                    if isinstance(item, ast.FunctionDef):
                        params = [arg.arg for arg in item.args.args]
                        methods.append({
                            "name": item.name,
                            "params": params
                        })

                classes.append({
                    "name": node.name,
                    "methods": methods
                })

        return classes
    except:
        return []

if __name__ == "__main__":
    filepath = sys.argv[1]
    result = analyze_file(filepath)
    print(json.dumps(result))
`;

    // Analyze a sample of files (limit to 20 for performance)
    const sampleFiles = pythonFiles.slice(0, 20);

    for (const filePath of sampleFiles) {
      try {
        const { stdout } = await execAsync(`python -c "${pythonScript.replace(/"/g, '\\"')}" "${filePath}"`);
        const classes = JSON.parse(stdout);

        for (const cls of classes) {
          services.push({
            name: cls.name,
            filePath: getRelativePath(this.projectRoot, filePath),
            methods: cls.methods,
          });
        }
      } catch (error) {
        // Skip files that fail to parse
      }
    }

    return services;
  }

  /**
   * Extract database models
   */
  private async extractModels(): Promise<ModelPattern[]> {
    if (this.projectType.database !== 'sqlalchemy') return [];

    const modelFiles = await findFiles(
      this.projectRoot,
      /models?\.py$/,
      ['venv', '__pycache__', 'node_modules']
    );

    const models: ModelPattern[] = [];

    // Would need deeper analysis - placeholder for now
    for (const filePath of modelFiles) {
      const content = readFileSync(filePath, 'utf-8');
      const classMatches = content.matchAll(/class\s+(\w+)\([^)]*Base[^)]*\):/g);

      for (const match of classMatches) {
        const [, name] = match;
        models.push({
          name,
          filePath: getRelativePath(this.projectRoot, filePath),
          fields: [], // Would need AST analysis
        });
      }
    }

    return models;
  }

  /**
   * Extract database schema (SQLAlchemy models)
   */
  private async extractDatabaseSchema(): Promise<DatabaseSchema | undefined> {
    if (this.projectType.database !== 'sqlalchemy') return undefined;

    return {
      tables: [], // Would need deeper analysis
      orm: 'SQLAlchemy',
    };
  }

  /**
   * Extract API routes (FastAPI)
   */
  private async extractAPIRoutes(): Promise<APIRoute[]> {
    if (this.projectType.framework !== 'fastapi') return [];

    const routeFiles = await findFiles(
      this.projectRoot,
      /routes?\.py$|main\.py$/,
      ['venv', '__pycache__']
    );

    const routes: APIRoute[] = [];

    for (const filePath of routeFiles) {
      const content = readFileSync(filePath, 'utf-8');

      // Simple regex-based extraction (FastAPI decorators)
      const routeMatches = content.matchAll(/@app\.(get|post|put|patch|delete)\(['"](\/[^'"]*)['"]/g);

      for (const match of routeMatches) {
        const [, method, path] = match;
        routes.push({
          path,
          method: method.toUpperCase() as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
          filePath: getRelativePath(this.projectRoot, filePath),
        });
      }
    }

    return routes;
  }
}
