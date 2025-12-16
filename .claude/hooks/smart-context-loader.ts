#!/usr/bin/env bun

/**
 * smart-context-loader.ts
 *
 * Intelligent context loading hook that uses progressive disclosure.
 * Analyzes the user's first prompt to determine which protocols to pre-load.
 *
 * Triggers: User prompt submit (first prompt of session)
 *
 * What it does:
 * - Detects task type from user prompt keywords
 * - Loads relevant protocols only
 * - Points to memory system if continuing previous work
 * - Saves 10k+ tokens by not loading everything upfront
 *
 * Setup:
 * Add to settings.json UserPromptSubmit hooks array
 */

import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

interface ProtocolSuggestion {
  name: string;
  path: string;
  reason: string;
}

function analyzePrompt(prompt: string): ProtocolSuggestion[] {
  const suggestions: ProtocolSuggestion[] = [];
  const lowerPrompt = prompt.toLowerCase();
  const paiDir = process.env.PAI_DIR || join(homedir(), '.claude');
  const protocolsDir = join(paiDir, 'protocols');

  // Validation/Quality keywords
  if (lowerPrompt.match(/\b(validate|validation|quality|review|check|lint|test|commit|pre-?commit)\b/)) {
    suggestions.push({
      name: 'Zero Tolerance Quality Gates',
      path: join(protocolsDir, 'zero-tolerance-quality.md'),
      reason: 'Detected validation/quality check keywords'
    });
    suggestions.push({
      name: 'DGTS Validation',
      path: join(protocolsDir, 'dgts-validation.md'),
      reason: 'Prevent gaming during validation'
    });
  }

  // Code suggestion/implementation keywords
  if (lowerPrompt.match(/\b(implement|create|add|build|write|code|develop|fix|refactor)\b/)) {
    suggestions.push({
      name: 'AntiHall Validator',
      path: join(protocolsDir, 'antihall-validator.md'),
      reason: 'Prevent hallucinating non-existent code'
    });
  }

  // Testing keywords
  if (lowerPrompt.match(/\b(test|testing|tdd|spec|suite|coverage|jest|vitest|pytest)\b/)) {
    suggestions.push({
      name: 'Doc-Driven TDD',
      path: join(protocolsDir, 'doc-driven-tdd.md'),
      reason: 'Tests from documentation detected'
    });
  }

  // UI/E2E testing keywords
  if (lowerPrompt.match(/\b(ui|e2e|end-?to-?end|playwright|cypress|integration|frontend)\b/)) {
    suggestions.push({
      name: 'Playwright Testing',
      path: join(protocolsDir, 'playwright-testing.md'),
      reason: 'UI/E2E testing detected'
    });
  }

  // Uncertainty/verification keywords
  if (lowerPrompt.match(/\b(uncertain|unsure|verify|confirm|check|doubt|sure|correct)\b/) ||
      lowerPrompt.includes('?')) {
    suggestions.push({
      name: 'NLNH Protocol',
      path: join(protocolsDir, 'nlnh-protocol.md'),
      reason: 'Uncertainty or verification needed'
    });
  }

  // Process/terminal keywords
  if (lowerPrompt.match(/\b(kill|stop|terminate|process|pid|taskkill|pkill)\b/)) {
    suggestions.push({
      name: 'Forbidden Commands',
      path: join(protocolsDir, 'forbidden-commands.md'),
      reason: 'CRITICAL: Process management detected'
    });
  }

  // Feature development keywords
  if (lowerPrompt.match(/\b(feature|new|add|implement|develop|build)\b/) &&
      lowerPrompt.match(/\b(prd|requirement|spec|documentation)\b/)) {
    suggestions.push({
      name: 'Doc-Driven TDD',
      path: join(protocolsDir, 'doc-driven-tdd.md'),
      reason: 'New feature from requirements'
    });
  }

  return suggestions;
}

function checkMemoryContext(): string | null {
  const paiDir = process.env.PAI_DIR || join(homedir(), '.claude');
  const currentMemoryPath = join(paiDir, 'memories', 'current.md');

  if (!existsSync(currentMemoryPath)) {
    return null;
  }

  try {
    const content = readFileSync(currentMemoryPath, 'utf-8');

    // Check if there's active content (not just template)
    const hasActiveContent = content.includes('## Active Tasks') &&
                            !content.match(/<!-- Current work in progress -->\s*\n\s*---/);

    if (hasActiveContent) {
      return currentMemoryPath;
    }
  } catch (e) {
    // Ignore errors
  }

  return null;
}

async function main() {
  try {
    // Get input
    let input = '';
    const decoder = new TextDecoder();
    const reader = Bun.stdin.stream().getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        input += decoder.decode(value, { stream: true });
      }
    } catch (e) {
      console.error(`❌ Error reading input: ${e}`);
      process.exit(0);
    }

    if (!input) {
      console.error('❌ No input received');
      process.exit(0);
    }

    let userPrompt = '';
    try {
      const parsed = JSON.parse(input);

      // Extract user prompt from the message
      if (parsed.message?.content) {
        const content = parsed.message.content;
        if (typeof content === 'string') {
          userPrompt = content;
        } else if (Array.isArray(content)) {
          for (const item of content) {
            if (item.type === 'text' && item.text) {
              userPrompt = item.text;
              break;
            }
          }
        }
      }
    } catch (e) {
      console.error(`❌ Error parsing input: ${e}`);
      process.exit(0);
    }

    if (!userPrompt) {
      console.error('⚠️ No user prompt found');
      process.exit(0);
    }

    console.error(`\n🧠 SMART CONTEXT LOADER`);
    console.error(`📝 Analyzing prompt: "${userPrompt.slice(0, 100)}..."`);

    // Analyze the prompt
    const protocolSuggestions = analyzePrompt(userPrompt);

    // Check for memory context
    const memoryPath = checkMemoryContext();

    // Build the context injection
    let contextMessage = '<system-reminder>\n**SMART CONTEXT LOADING**\n\n';

    // Memory context
    if (memoryPath) {
      contextMessage += `**📚 MEMORY CONTEXT AVAILABLE**\n`;
      contextMessage += `You have active context from a previous session.\n`;
      contextMessage += `Read: ${memoryPath}\n\n`;
    }

    // Protocol suggestions
    if (protocolSuggestions.length > 0) {
      contextMessage += `**📋 RELEVANT PROTOCOLS DETECTED**\n\n`;
      contextMessage += `Based on your prompt, these protocols may be relevant:\n\n`;

      for (const suggestion of protocolSuggestions) {
        contextMessage += `- **${suggestion.name}**: ${suggestion.reason}\n`;
        contextMessage += `  Read: ${suggestion.path}\n\n`;
      }

      contextMessage += `**Instructions**:\n`;
      contextMessage += `1. Read only the protocols you actually need for this task\n`;
      contextMessage += `2. Don't load all protocols upfront\n`;
      contextMessage += `3. Progressive disclosure saves context for actual work\n\n`;
    } else {
      contextMessage += `**✨ NO SPECIFIC PROTOCOLS NEEDED**\n\n`;
      contextMessage += `Your prompt doesn't match specific protocol keywords.\n`;
      contextMessage += `Available protocols are in ~/.claude/protocols/ if needed.\n\n`;
    }

    contextMessage += `**Context Engineering**: Loading only what's needed saves ~10k tokens!\n`;
    contextMessage += `</system-reminder>\n`;

    // Output to stdout - this gets injected as a system reminder
    console.log(contextMessage);

    console.error(`✅ Suggested ${protocolSuggestions.length} protocol(s)`);
    console.error(`💾 Memory context: ${memoryPath ? 'Available' : 'None'}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Smart context loader error:', error);
    process.exit(1);
  }
}

main();
