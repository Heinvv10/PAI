#!/usr/bin/env bun
/**
 * model-selector.ts
 *
 * Conservative model selection logic with quality-first approach
 * Selects optimal model tier based on complexity score and confidence
 *
 * Key Principle: When uncertain, default to Sonnet (safe, balanced choice)
 */

import type { ComplexityResult } from './complexity-classifier.ts';
import { llmClassifyComplexity, combineClassifications } from './llm-classifier.ts';
import { readFileSync } from 'fs';
import { join } from 'path';

export type ModelTier = 'FAST' | 'STANDARD' | 'ADVANCED';
export type ModelName = 'haiku' | 'sonnet' | 'opus';

export interface ModelSelection {
  model: ModelName;              // Selected model name
  tier: ModelTier;               // Model tier
  model_id: string;              // Full model ID for API
  reasoning: string;             // Why this model was selected
  confidence: number;            // Confidence in selection (0-1)
  cost_estimate?: {
    input_cost_per_mtok: number;
    output_cost_per_mtok: number;
  };
  fallback_reason?: string;      // If conservative fallback was used
}

export interface RoutingConfig {
  enabled: boolean;
  complexity_thresholds: {
    haiku_max: number;
    sonnet_max: number;
    opus_min: number;
  };
  confidence_threshold: number;
  fallback_model: string;
  enable_llm_fallback: boolean;
  model_mapping: Record<string, {
    model_id: string;
    display_name: string;
    tier: string;
    cost_per_mtok: {
      input: number;
      output: number;
    };
  }>;
  manual_overrides: Record<string, string>;
}

/**
 * Load routing configuration
 */
function loadConfig(): RoutingConfig {
  try {
    const configPath = process.env.PAI_DIR 
      ? join(process.env.PAI_DIR, 'routing', 'config.json')
      : join(process.env.USERPROFILE || process.env.HOME || '~', '.claude', 'routing', 'config.json');
    return JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch (error) {
    console.error('⚠️ Failed to load routing config:', error);
    throw new Error('Routing configuration not found');
  }
}

/**
 * Main model selection function with conservative fallback
 *
 * Decision Logic (Quality-First):
 * 1. Check if routing is enabled
 * 2. Analyze complexity score against thresholds
 * 3. If confidence < 70% → Conservative fallback to Sonnet
 * 4. Apply manual overrides if present
 * 5. Return selected model with full details
 *
 * @param complexity ComplexityResult from classifier
 * @param prompt Original user prompt (for override detection)
 * @param config Optional config override
 * @returns ModelSelection with selected model and reasoning
 */
export async function selectModel(
  complexity: ComplexityResult,
  prompt: string,
  config?: RoutingConfig
): Promise<ModelSelection> {

  const cfg = config || loadConfig();

  // Check if routing is enabled
  if (!cfg.enabled) {
    return createSelection('sonnet', 'STANDARD', 'Routing disabled', 1.0, cfg);
  }

  // ========================================
  // Step 1: Check for Manual Overrides
  // ========================================
  const manualOverride = detectManualOverride(prompt, cfg);
  if (manualOverride) {
    const model = manualOverride.model as ModelName;
    const tier = modelToTier(model);
    return createSelection(
      model,
      tier,
      `Manual override: "${manualOverride.keyword}"`,
      1.0, // Full confidence in manual override
      cfg,
      undefined,
      manualOverride.keyword
    );
  }

  // ========================================
  // Step 2: Hybrid Classification (Rule-Based + LLM)
  // ========================================
  // If confidence is low AND LLM fallback is enabled, use hybrid approach
  if (complexity.confidence < cfg.confidence_threshold && cfg.enable_llm_fallback) {
    try {
      console.error(`🔄 Low confidence (${(complexity.confidence * 100).toFixed(1)}%) - Activating LLM-assisted classification...`);

      // Call Haiku for LLM analysis
      const llmResult = await llmClassifyComplexity(prompt, complexity);

      // Combine rule-based and LLM results
      const combined = combineClassifications(complexity, llmResult);

      // Use combined result
      const model = tierToModel(combined.tier);
      return createSelection(
        model,
        combined.tier,
        `Hybrid (${combined.method}): ${combined.reasoning}`,
        combined.confidence,
        cfg,
        combined.method === 'hybrid' ? `Rule: ${complexity.score}, LLM: ${llmResult.recommended_tier}` : undefined
      );

    } catch (error) {
      // LLM classification failed → Conservative fallback to Sonnet
      console.error('⚠️ LLM classification failed:', error);
      return createSelection(
        'sonnet',
        'STANDARD',
        `LLM classification failed → Conservative fallback to Sonnet`,
        0.7,
        cfg,
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // If LLM fallback is disabled OR confidence is acceptable, proceed with rule-based
  if (complexity.confidence < cfg.confidence_threshold) {
    // Low confidence, no LLM fallback → Conservative fallback to Sonnet
    return createSelection(
      'sonnet',
      'STANDARD',
      `Low confidence (${(complexity.confidence * 100).toFixed(1)}%) → Conservative fallback to Sonnet`,
      0.7, // Medium confidence in fallback
      cfg,
      `Complexity: ${complexity.score}, Confidence: ${(complexity.confidence * 100).toFixed(1)}%`
    );
  }

  // ========================================
  // Step 3: Threshold-Based Classification
  // ========================================
  let tier: ModelTier;
  let model: ModelName;

  if (complexity.score <= cfg.complexity_thresholds.haiku_max) {
    tier = 'FAST';
    model = 'haiku';
  } else if (complexity.score <= cfg.complexity_thresholds.sonnet_max) {
    tier = 'STANDARD';
    model = 'sonnet';
  } else {
    tier = 'ADVANCED';
    model = 'opus';
  }

  // ========================================
  // Step 4: Build Reasoning
  // ========================================
  const reasoning = [
    `Complexity: ${complexity.score}/100`,
    `Confidence: ${(complexity.confidence * 100).toFixed(1)}%`,
    `Tier: ${tier}`,
    complexity.reasoning.split(';')[0] // First factor only for brevity
  ].join(' | ');

  return createSelection(model, tier, reasoning, complexity.confidence, cfg);
}

/**
 * Detect manual override keywords in prompt
 */
function detectManualOverride(
  prompt: string,
  config: RoutingConfig
): { keyword: string; model: string } | null {
  const lowerPrompt = prompt.toLowerCase();

  for (const [keyword, model] of Object.entries(config.manual_overrides)) {
    if (lowerPrompt.includes(keyword.toLowerCase())) {
      return { keyword, model };
    }
  }

  return null;
}

/**
 * Convert model name to tier
 */
function modelToTier(model: ModelName): ModelTier {
  const tierMap: Record<ModelName, ModelTier> = {
    'haiku': 'FAST',
    'sonnet': 'STANDARD',
    'opus': 'ADVANCED'
  };
  return tierMap[model];
}

/**
 * Convert tier to model name
 */
export function tierToModel(tier: ModelTier): ModelName {
  const modelMap: Record<ModelTier, ModelName> = {
    'FAST': 'haiku',
    'STANDARD': 'sonnet',
    'ADVANCED': 'opus'
  };
  return modelMap[tier];
}

/**
 * Create ModelSelection object with full details
 */
function createSelection(
  model: ModelName,
  tier: ModelTier,
  reasoning: string,
  confidence: number,
  config: RoutingConfig,
  fallbackReason?: string,
  manualOverride?: string
): ModelSelection {
  const modelConfig = config.model_mapping[model];

  if (!modelConfig) {
    throw new Error(`Model configuration not found for: ${model}`);
  }

  return {
    model,
    tier,
    model_id: modelConfig.model_id,
    reasoning,
    confidence,
    cost_estimate: {
      input_cost_per_mtok: modelConfig.cost_per_mtok.input,
      output_cost_per_mtok: modelConfig.cost_per_mtok.output
    },
    fallback_reason: fallbackReason,
    ...(manualOverride && { manual_override: manualOverride })
  };
}

/**
 * Calculate estimated cost for a model selection
 *
 * @param selection ModelSelection
 * @param estimatedInputTokens Estimated input tokens
 * @param estimatedOutputTokens Estimated output tokens
 * @returns Estimated cost in USD
 */
export function calculateEstimatedCost(
  selection: ModelSelection,
  estimatedInputTokens: number,
  estimatedOutputTokens: number
): number {
  if (!selection.cost_estimate) return 0;

  const inputCost = (estimatedInputTokens / 1_000_000) * selection.cost_estimate.input_cost_per_mtok;
  const outputCost = (estimatedOutputTokens / 1_000_000) * selection.cost_estimate.output_cost_per_mtok;

  return inputCost + outputCost;
}

/**
 * Calculate savings vs baseline (Sonnet)
 *
 * @param selection ModelSelection
 * @param estimatedInputTokens Estimated input tokens
 * @param estimatedOutputTokens Estimated output tokens
 * @param config Routing config (for Sonnet pricing)
 * @returns Savings in USD (positive = saved, negative = cost more)
 */
export function calculateSavings(
  selection: ModelSelection,
  estimatedInputTokens: number,
  estimatedOutputTokens: number,
  config?: RoutingConfig
): number {
  const cfg = config || loadConfig();

  // Baseline cost (always Sonnet)
  const sonnetConfig = cfg.model_mapping['sonnet'];
  const baselineCost =
    (estimatedInputTokens / 1_000_000) * sonnetConfig.cost_per_mtok.input +
    (estimatedOutputTokens / 1_000_000) * sonnetConfig.cost_per_mtok.output;

  // Actual cost with routing
  const actualCost = calculateEstimatedCost(selection, estimatedInputTokens, estimatedOutputTokens);

  return baselineCost - actualCost;
}

/**
 * Batch model selection for testing
 */
export async function batchSelectModel(
  complexities: ComplexityResult[],
  prompts: string[]
): Promise<ModelSelection[]> {
  const selections: ModelSelection[] = [];

  for (let i = 0; i < complexities.length; i++) {
    const selection = await selectModel(complexities[i], prompts[i]);
    selections.push(selection);
  }

  return selections;
}

/**
 * Get selection statistics for a batch
 */
export function getSelectionStats(selections: ModelSelection[]): {
  modelDistribution: Record<ModelName, number>;
  tierDistribution: Record<ModelTier, number>;
  avgConfidence: number;
  manualOverrides: number;
  conservativeFallbacks: number;
  estimatedMonthlyCost: number;
  estimatedMonthlySavings: number;
} {
  const modelDistribution = selections.reduce((acc, s) => {
    acc[s.model] = (acc[s.model] || 0) + 1;
    return acc;
  }, {} as Record<ModelName, number>);

  const tierDistribution = selections.reduce((acc, s) => {
    acc[s.tier] = (acc[s.tier] || 0) + 1;
    return acc;
  }, {} as Record<ModelTier, number>);

  const avgConfidence = selections.reduce((sum, s) => sum + s.confidence, 0) / selections.length;

  const manualOverrides = selections.filter(s => s.manual_override).length;
  const conservativeFallbacks = selections.filter(s => s.fallback_reason).length;

  // Estimate monthly cost (assuming 2000 input, 3000 output tokens avg)
  const estimatedMonthlyCost = selections.reduce((sum, s) =>
    sum + calculateEstimatedCost(s, 2000, 3000), 0
  );

  const estimatedMonthlySavings = selections.reduce((sum, s) =>
    sum + calculateSavings(s, 2000, 3000), 0
  );

  return {
    modelDistribution,
    tierDistribution,
    avgConfidence,
    manualOverrides,
    conservativeFallbacks,
    estimatedMonthlyCost,
    estimatedMonthlySavings
  };
}

// ========================================
// CLI Testing Interface
// ========================================
if (import.meta.main) {
  const { estimateComplexity, batchEstimateComplexity } = await import('./complexity-classifier.ts');

  const testPrompts = [
    "Read package.json",
    "Fix authentication bug",
    "Design microservices architecture for e-commerce",
    "think hard about database optimization",
    "Format code with prettier",
    "Implement JWT authentication",
    "use opus for this complex analysis",
    "List all files",
    "Security audit of the codebase"
  ];

  console.log("🎯 Model Selector Test\n");
  console.log("=".repeat(80));

  const complexities = batchEstimateComplexity(testPrompts);
  const selections = await batchSelectModel(complexities, testPrompts);

  for (let i = 0; i < selections.length; i++) {
    const prompt = testPrompts[i];
    const selection = selections[i];

    console.log(`\n${i + 1}. "${prompt}"`);
    console.log(`   ├─ Selected: ${selection.model.toUpperCase()} (${selection.tier})`);
    console.log(`   ├─ Confidence: ${(selection.confidence * 100).toFixed(1)}%`);
    console.log(`   ├─ Reasoning: ${selection.reasoning}`);
    if (selection.fallback_reason) {
      console.log(`   ├─ Fallback: ${selection.fallback_reason}`);
    }
    if (selection.manual_override) {
      console.log(`   ├─ Override: "${selection.manual_override}"`);
    }
    console.log(`   └─ Cost: $${calculateEstimatedCost(selection, 2000, 3000).toFixed(4)} (Savings: $${calculateSavings(selection, 2000, 3000).toFixed(4)})`);
  }

  console.log("\n" + "=".repeat(80));

  const stats = getSelectionStats(selections);
  console.log(`\n📊 Selection Statistics:`);
  console.log(`   Model Distribution:`);
  console.log(`     Haiku: ${stats.modelDistribution.haiku || 0} (${(((stats.modelDistribution.haiku || 0) / selections.length) * 100).toFixed(1)}%)`);
  console.log(`     Sonnet: ${stats.modelDistribution.sonnet || 0} (${(((stats.modelDistribution.sonnet || 0) / selections.length) * 100).toFixed(1)}%)`);
  console.log(`     Opus: ${stats.modelDistribution.opus || 0} (${(((stats.modelDistribution.opus || 0) / selections.length) * 100).toFixed(1)}%)`);
  console.log(`   Avg Confidence: ${(stats.avgConfidence * 100).toFixed(1)}%`);
  console.log(`   Manual Overrides: ${stats.manualOverrides}`);
  console.log(`   Conservative Fallbacks: ${stats.conservativeFallbacks}`);
  console.log(`   Estimated Cost (${selections.length} tasks): $${stats.estimatedMonthlyCost.toFixed(4)}`);
  console.log(`   Estimated Savings: $${stats.estimatedMonthlySavings.toFixed(4)} (${((stats.estimatedMonthlySavings / (stats.estimatedMonthlyCost + stats.estimatedMonthlySavings)) * 100).toFixed(1)}%)`);
}
