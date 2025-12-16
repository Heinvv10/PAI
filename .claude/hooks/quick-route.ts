#!/usr/bin/env bun
/**
 * quick-route.ts
 *
 * Lightweight model routing for Task tool integration.
 * Returns just the model name (haiku/sonnet/opus) for a given prompt.
 *
 * Usage:
 *   bun ~/.claude/hooks/quick-route.ts "your prompt here"
 *
 * Output:
 *   haiku | sonnet | opus
 *
 * Integration with Task tool:
 *   const model = await getRecommendedModel(prompt);
 *   Task({ prompt, model, subagent_type: "..." })
 */

// Complexity thresholds (conservative - quality first)
const HAIKU_MAX = 25;
const OPUS_MIN = 76;
const CONFIDENCE_THRESHOLD = 0.7;

// Keywords for fast detection
const FAST_KEYWORDS = ['read', 'show', 'list', 'status', 'format', 'lint', 'check', 'view', 'display', 'print', 'echo', 'cat'];
const ADVANCED_KEYWORDS = ['architecture', 'security audit', 'design system', 'think hard', 'complex analysis', 'evaluate tradeoffs', 'ultrathink', 'think harder'];
const IMPLEMENTATION_KEYWORDS = ['implement', 'create', 'build', 'develop', 'add feature'];
const DEBUG_KEYWORDS = ['debug', 'fix', 'solve', 'investigate', 'troubleshoot'];
const OPTIMIZATION_KEYWORDS = ['refactor', 'optimize', 'improve', 'performance'];

// Manual overrides
const MANUAL_OVERRIDES: Record<string, string> = {
  'use haiku': 'haiku',
  'force haiku': 'haiku',
  'use sonnet': 'sonnet',
  'force sonnet': 'sonnet',
  'use opus': 'opus',
  'force opus': 'opus',
  'think hard': 'opus',
  'think harder': 'opus',
  'ultrathink': 'opus'
};

interface RoutingResult {
  model: 'haiku' | 'sonnet' | 'opus';
  complexity: number;
  confidence: number;
  reason: string;
}

function analyzePrompt(prompt: string): RoutingResult {
  const lowerPrompt = prompt.toLowerCase();

  // Check manual overrides first
  for (const [trigger, model] of Object.entries(MANUAL_OVERRIDES)) {
    if (lowerPrompt.includes(trigger)) {
      return {
        model: model as 'haiku' | 'sonnet' | 'opus',
        complexity: model === 'opus' ? 80 : model === 'haiku' ? 10 : 50,
        confidence: 1.0,
        reason: `Manual override: "${trigger}"`
      };
    }
  }

  // Calculate complexity score
  let score = 0;
  let confidence = 0.5;
  const factors: string[] = [];

  // Factor 1: Prompt length
  if (prompt.length < 100) {
    factors.push('short');
  } else if (prompt.length > 500) {
    score += 15;
    factors.push('long');
  } else {
    score += 5;
  }

  // Factor 2: Fast keywords (-20) - use word boundary matching
  const wordBoundary = (text: string, word: string) => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(text);
  };
  const fastMatches = FAST_KEYWORDS.filter(kw => wordBoundary(lowerPrompt, kw));
  if (fastMatches.length > 0) {
    score -= 20;
    confidence += 0.2;
    factors.push(`fast:${fastMatches[0]}`);
  }

  // Factor 3: Advanced keywords (+30)
  const advancedMatches = ADVANCED_KEYWORDS.filter(kw => lowerPrompt.includes(kw));
  if (advancedMatches.length > 0) {
    score += 30;
    confidence += 0.2;
    factors.push(`advanced:${advancedMatches[0]}`);
  }

  // Factor 4: Task type (these should never go to Haiku)
  if (IMPLEMENTATION_KEYWORDS.some(kw => lowerPrompt.includes(kw))) {
    score += 35;  // Ensures > HAIKU_MAX (25)
    confidence += 0.15;
    factors.push('implementation');
  } else if (DEBUG_KEYWORDS.some(kw => lowerPrompt.includes(kw))) {
    score += 30;  // Ensures > HAIKU_MAX (25)
    confidence += 0.15;
    factors.push('debugging');
  } else if (OPTIMIZATION_KEYWORDS.some(kw => lowerPrompt.includes(kw))) {
    score += 45;  // Higher complexity
    confidence += 0.15;
    factors.push('optimization');
  }

  // Factor 5: Multi-scope indicators
  const multiScope = ['multiple', 'several', 'across', 'all', 'entire', 'whole'];
  if (multiScope.some(kw => lowerPrompt.includes(kw))) {
    score += 15;
    factors.push('multi-scope');
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));
  confidence = Math.min(0.95, confidence);

  // Determine model
  let model: 'haiku' | 'sonnet' | 'opus';
  let reason: string;

  if (confidence < CONFIDENCE_THRESHOLD) {
    // Low confidence → conservative fallback to Sonnet
    model = 'sonnet';
    reason = `Low confidence (${(confidence * 100).toFixed(0)}%) → Sonnet`;
  } else if (score <= HAIKU_MAX) {
    model = 'haiku';
    reason = `Simple task (${score}/100) → Haiku`;
  } else if (score >= OPUS_MIN) {
    model = 'opus';
    reason = `Complex task (${score}/100) → Opus`;
  } else {
    model = 'sonnet';
    reason = `Standard task (${score}/100) → Sonnet`;
  }

  return { model, complexity: score, confidence, reason };
}

// Main
const prompt = process.argv.slice(2).join(' ');

if (!prompt) {
  // No prompt provided - output usage
  console.log('Usage: bun quick-route.ts "your prompt here"');
  console.log('Output: haiku | sonnet | opus');
  process.exit(0);
}

const result = analyzePrompt(prompt);

// Check for --json flag
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(result, null, 2));
} else if (process.argv.includes('--verbose')) {
  console.log(`Model: ${result.model}`);
  console.log(`Complexity: ${result.complexity}/100`);
  console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);
  console.log(`Reason: ${result.reason}`);
} else {
  // Default: just output the model name
  console.log(result.model);
}
