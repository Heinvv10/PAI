#!/usr/bin/env bun
/**
 * complexity-classifier.ts
 *
 * Multi-factor complexity scoring system for model routing
 * Analyzes prompts and assigns a complexity score (0-100) with confidence rating
 *
 * Conservative approach: Prefer Sonnet when uncertain
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export interface HookContext {
  session_id?: string;
  timestamp?: number;
  [key: string]: any;
}

export interface ComplexityResult {
  score: number;              // 0-100 complexity score
  confidence: number;         // 0-1 confidence in classification
  factors: string[];          // List of factors that influenced score
  reasoning: string;          // Human-readable explanation
  tier_suggestion: 'FAST' | 'STANDARD' | 'ADVANCED';
}

export interface RoutingConfig {
  complexity_thresholds: {
    haiku_max: number;
    sonnet_max: number;
    opus_min: number;
  };
  keyword_weights: {
    fast_keywords: {
      keywords: string[];
      score_modifier: number;
    };
    advanced_keywords: {
      keywords: string[];
      score_modifier: number;
    };
  };
  task_type_weights: Record<string, {
    patterns: string[];
    score_modifier: number;
  }>;
}

/**
 * Load routing configuration
 */
function loadConfig(): RoutingConfig {
  try {
    const configPath = process.env.PAI_DIR 
      ? join(process.env.PAI_DIR, 'routing', 'config.json')
      : join(process.env.USERPROFILE || process.env.HOME || '~', '.claude', 'routing', 'config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    return config;
  } catch (error) {
    // Fallback to conservative defaults
    console.error('⚠️ Failed to load routing config, using defaults:', error);
    return {
      complexity_thresholds: {
        haiku_max: 25,
        sonnet_max: 75,
        opus_min: 76
      },
      keyword_weights: {
        fast_keywords: {
          keywords: ['read', 'show', 'list', 'status', 'format', 'lint', 'check'],
          score_modifier: -20
        },
        advanced_keywords: {
          keywords: ['architecture', 'security audit', 'design system', 'think hard'],
          score_modifier: 30
        }
      },
      task_type_weights: {
        implementation: {
          patterns: ['implement', 'create', 'build', 'develop'],
          score_modifier: 20
        },
        debugging: {
          patterns: ['debug', 'fix', 'solve', 'investigate'],
          score_modifier: 15
        },
        optimization: {
          patterns: ['refactor', 'optimize', 'improve'],
          score_modifier: 25
        }
      }
    };
  }
}

/**
 * Main complexity estimation function
 *
 * Scoring system (0-100 scale):
 * - 0-25:  FAST (Haiku) - Simple, deterministic tasks
 * - 26-75: STANDARD (Sonnet) - Most development work (DEFAULT, wide range)
 * - 76-100: ADVANCED (Opus) - Complex reasoning, critical decisions
 *
 * @param prompt User prompt to analyze
 * @param context Optional context (session info, etc.)
 * @returns ComplexityResult with score, confidence, and reasoning
 */
export function estimateComplexity(prompt: string, context: HookContext = {}): ComplexityResult {
  const config = loadConfig();
  let score = 0;
  const factors: string[] = [];
  const lowerPrompt = prompt.toLowerCase();

  // ========================================
  // Factor 1: Prompt Length (0-15 points)
  // ========================================
  if (prompt.length < 100) {
    score += 0;
    factors.push("Short prompt (0 pts)");
  } else if (prompt.length < 500) {
    score += 5;
    factors.push("Medium prompt (+5 pts)");
  } else {
    score += 15;
    factors.push("Long prompt (+15 pts)");
  }

  // ========================================
  // Factor 2: Fast Task Keywords (-20 points)
  // ========================================
  // These indicate clearly simple tasks
  const fastMatches = config.keyword_weights.fast_keywords.keywords.filter(
    kw => lowerPrompt.includes(kw)
  );

  if (fastMatches.length > 0) {
    score += config.keyword_weights.fast_keywords.score_modifier;
    factors.push(`Simple task keywords: ${fastMatches.join(', ')} (${config.keyword_weights.fast_keywords.score_modifier} pts)`);
  }

  // ========================================
  // Factor 3: Advanced Keywords (+30 points)
  // ========================================
  // These indicate clearly complex tasks
  const advancedMatches = config.keyword_weights.advanced_keywords.keywords.filter(
    kw => lowerPrompt.includes(kw)
  );

  if (advancedMatches.length > 0) {
    score += config.keyword_weights.advanced_keywords.score_modifier;
    factors.push(`Complex task keywords: ${advancedMatches.join(', ')} (+${config.keyword_weights.advanced_keywords.score_modifier} pts)`);
  }

  // ========================================
  // Factor 4: Task Type Detection (0-25 points)
  // ========================================
  let taskTypeDetected = false;

  for (const [taskType, weights] of Object.entries(config.task_type_weights)) {
    const matches = weights.patterns.filter(pattern =>
      lowerPrompt.match(new RegExp(`\\b${pattern}\\b`, 'i'))
    );

    if (matches.length > 0) {
      score += weights.score_modifier;
      factors.push(`${taskType} task: ${matches.join(', ')} (+${weights.score_modifier} pts)`);
      taskTypeDetected = true;
      break; // Only count first matching task type
    }
  }

  // ========================================
  // Factor 5: Extended Thinking (0-30 points)
  // ========================================
  if (lowerPrompt.includes('ultrathink')) {
    score += 30;
    factors.push("Ultrathink requested (+30 pts)");
  } else if (lowerPrompt.match(/think (hard|harder)/i)) {
    score += 20;
    factors.push("Deep thinking requested (+20 pts)");
  } else if (lowerPrompt.includes('think')) {
    score += 10;
    factors.push("Thinking requested (+10 pts)");
  }

  // ========================================
  // Factor 6: Multi-file/System Context (+15 points)
  // ========================================
  const multiScopeKeywords = ['multiple', 'several', 'across', 'all', 'entire', 'whole'];
  const multiMatches = multiScopeKeywords.filter(kw => lowerPrompt.includes(kw));

  if (multiMatches.length > 0) {
    score += 15;
    factors.push(`Multi-scope context: ${multiMatches.join(', ')} (+15 pts)`);
  }

  // ========================================
  // Factor 7: Code Analysis Indicators (+10 points)
  // ========================================
  const codePatterns = [
    /code (review|analysis|audit)/i,
    /analyze.*code/i,
    /security.*vulnerability/i,
    /performance.*bottleneck/i
  ];

  if (codePatterns.some(pattern => prompt.match(pattern))) {
    score += 10;
    factors.push("Code analysis required (+10 pts)");
  }

  // ========================================
  // Clamp score to 0-100 range
  // ========================================
  const finalScore = Math.max(0, Math.min(100, score));

  // ========================================
  // Calculate Confidence (0-1 scale)
  // ========================================
  // High confidence if we have strong keyword matches
  const hasStrongKeywords = fastMatches.length > 0 || advancedMatches.length > 0;
  const hasTaskType = taskTypeDetected;
  const hasExtendedThinking = lowerPrompt.match(/ultrathink|think (hard|harder)/i);

  let confidence = 0.5; // Base confidence (neutral)

  if (hasStrongKeywords) confidence += 0.20;
  if (hasTaskType) confidence += 0.10;
  if (hasExtendedThinking) confidence += 0.15;
  if (prompt.length > 200) confidence += 0.05; // More context = higher confidence

  confidence = Math.min(0.95, confidence); // Cap at 95% (never 100% certain)

  // ========================================
  // Determine Tier Suggestion
  // ========================================
  let tier_suggestion: 'FAST' | 'STANDARD' | 'ADVANCED';

  if (finalScore <= config.complexity_thresholds.haiku_max) {
    tier_suggestion = 'FAST';
  } else if (finalScore <= config.complexity_thresholds.sonnet_max) {
    tier_suggestion = 'STANDARD';
  } else {
    tier_suggestion = 'ADVANCED';
  }

  // ========================================
  // Build Human-Readable Reasoning
  // ========================================
  const reasoning = factors.length > 0
    ? factors.join("; ")
    : "No strong indicators detected, defaulting to moderate complexity";

  return {
    score: finalScore,
    confidence,
    factors,
    reasoning,
    tier_suggestion
  };
}

/**
 * Batch complexity estimation for multiple prompts
 * Useful for testing and threshold validation
 */
export function batchEstimateComplexity(prompts: string[]): ComplexityResult[] {
  return prompts.map(prompt => estimateComplexity(prompt));
}

/**
 * Get complexity statistics for a batch of results
 * Useful for analyzing classification distribution
 */
export function getComplexityStats(results: ComplexityResult[]): {
  avgScore: number;
  avgConfidence: number;
  tierDistribution: Record<string, number>;
  scoreDistribution: {
    fast: number;
    standard: number;
    advanced: number;
  };
} {
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

  const tierDistribution = results.reduce((acc, r) => {
    acc[r.tier_suggestion] = (acc[r.tier_suggestion] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const config = loadConfig();
  const scoreDistribution = {
    fast: results.filter(r => r.score <= config.complexity_thresholds.haiku_max).length,
    standard: results.filter(r =>
      r.score > config.complexity_thresholds.haiku_max &&
      r.score <= config.complexity_thresholds.sonnet_max
    ).length,
    advanced: results.filter(r => r.score > config.complexity_thresholds.sonnet_max).length
  };

  return {
    avgScore,
    avgConfidence,
    tierDistribution,
    scoreDistribution
  };
}

// ========================================
// CLI Testing Interface
// ========================================
if (import.meta.main) {
  const testPrompts = [
    "Read the contents of package.json",
    "Fix the authentication bug in the login service",
    "Design a microservices architecture for our e-commerce platform",
    "think hard about the best approach for optimizing database queries",
    "Format the code using prettier",
    "Implement user authentication with JWT tokens",
    "List all files in the current directory",
    "Analyze the security vulnerabilities in this codebase",
    "Refactor the entire API layer for better performance"
  ];

  console.log("🧪 Complexity Classifier Test\n");
  console.log("=".repeat(80));

  testPrompts.forEach((prompt, i) => {
    const result = estimateComplexity(prompt);
    console.log(`\n${i + 1}. "${prompt}"`);
    console.log(`   Score: ${result.score}/100`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`   Tier: ${result.tier_suggestion}`);
    console.log(`   Reasoning: ${result.reasoning}`);
  });

  console.log("\n" + "=".repeat(80));

  const stats = getComplexityStats(batchEstimateComplexity(testPrompts));
  console.log(`\n📊 Statistics:`);
  console.log(`   Average Score: ${stats.avgScore.toFixed(1)}/100`);
  console.log(`   Average Confidence: ${(stats.avgConfidence * 100).toFixed(1)}%`);
  console.log(`   Distribution:`);
  console.log(`     FAST: ${stats.scoreDistribution.fast} (${((stats.scoreDistribution.fast / testPrompts.length) * 100).toFixed(1)}%)`);
  console.log(`     STANDARD: ${stats.scoreDistribution.standard} (${((stats.scoreDistribution.standard / testPrompts.length) * 100).toFixed(1)}%)`);
  console.log(`     ADVANCED: ${stats.scoreDistribution.advanced} (${((stats.scoreDistribution.advanced / testPrompts.length) * 100).toFixed(1)}%)`);
}
