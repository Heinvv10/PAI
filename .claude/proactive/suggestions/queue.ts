#!/usr/bin/env bun

/**
 * queue.ts
 *
 * Suggestion queue system with persistence.
 * Stores, loads, and manages proactive suggestions.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import type { Suggestion, SuggestionQueue } from '../scanner/types';

const SUGGESTIONS_DIR = join(dirname(import.meta.dir), 'suggestions', 'data');
const MAX_SUGGESTIONS_PER_PROJECT = 100;
const MAX_HISTORY_DAYS = 30;

// Ensure data directory exists
function ensureDataDir(): void {
  if (!existsSync(SUGGESTIONS_DIR)) {
    mkdirSync(SUGGESTIONS_DIR, { recursive: true });
  }
}

// Generate a safe filename from project path
function getProjectFileName(projectPath: string): string {
  const safeName = projectPath
    .replace(/[:\\\/]/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  return `${safeName}.json`;
}

// Get queue file path for a project
function getQueuePath(projectPath: string): string {
  ensureDataDir();
  return join(SUGGESTIONS_DIR, getProjectFileName(projectPath));
}

/**
 * Load existing queue for a project
 */
export function loadQueue(projectPath: string): SuggestionQueue | null {
  const queuePath = getQueuePath(projectPath);

  if (!existsSync(queuePath)) {
    return null;
  }

  try {
    const content = readFileSync(queuePath, 'utf-8');
    return JSON.parse(content) as SuggestionQueue;
  } catch {
    return null;
  }
}

/**
 * Save queue for a project
 */
export function saveQueue(queue: SuggestionQueue): void {
  const queuePath = getQueuePath(queue.projectPath);

  // Limit suggestions
  if (queue.suggestions.length > MAX_SUGGESTIONS_PER_PROJECT) {
    queue.suggestions = queue.suggestions.slice(0, MAX_SUGGESTIONS_PER_PROJECT);
  }

  // Update stats
  queue.stats = calculateStats(queue.suggestions);

  writeFileSync(queuePath, JSON.stringify(queue, null, 2));
}

/**
 * Calculate suggestion statistics
 */
function calculateStats(suggestions: Suggestion[]): SuggestionQueue['stats'] {
  const byType: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  let highConfidence = 0;

  for (const s of suggestions) {
    byType[s.type] = (byType[s.type] || 0) + 1;

    const priorityBucket = s.priority >= 7 ? 'high' : s.priority >= 4 ? 'medium' : 'low';
    byPriority[priorityBucket] = (byPriority[priorityBucket] || 0) + 1;

    if (s.confidence >= 0.8) {
      highConfidence++;
    }
  }

  return {
    total: suggestions.length,
    byType,
    byPriority,
    highConfidence
  };
}

/**
 * Create a new queue from scan results
 */
export function createQueue(
  projectName: string,
  projectPath: string,
  suggestions: Suggestion[],
  scanDuration: number
): SuggestionQueue {
  return {
    projectName,
    projectPath,
    lastScan: new Date().toISOString(),
    scanDuration,
    suggestions,
    stats: calculateStats(suggestions)
  };
}

/**
 * Merge new suggestions with existing queue
 * - Keeps existing statuses (acted, dismissed, snoozed)
 * - Adds new suggestions
 * - Removes suggestions that no longer exist
 */
export function mergeQueues(
  existing: SuggestionQueue | null,
  newSuggestions: Suggestion[],
  projectName: string,
  projectPath: string,
  scanDuration: number
): SuggestionQueue {
  if (!existing) {
    return createQueue(projectName, projectPath, newSuggestions, scanDuration);
  }

  // Create lookup of existing suggestions by ID
  const existingById = new Map<string, Suggestion>();
  for (const s of existing.suggestions) {
    existingById.set(s.id, s);
  }

  // Merge suggestions
  const merged: Suggestion[] = [];
  const seenIds = new Set<string>();

  for (const newSuggestion of newSuggestions) {
    const existingSuggestion = existingById.get(newSuggestion.id);

    if (existingSuggestion) {
      // Preserve status from existing
      merged.push({
        ...newSuggestion,
        status: existingSuggestion.status,
        actedAt: existingSuggestion.actedAt
      });
    } else {
      // New suggestion
      merged.push(newSuggestion);
    }

    seenIds.add(newSuggestion.id);
  }

  // Keep acted/dismissed/snoozed items that are no longer detected
  // (they may have been fixed or are temporarily hidden)
  for (const oldSuggestion of existing.suggestions) {
    if (!seenIds.has(oldSuggestion.id) && oldSuggestion.status && oldSuggestion.status !== 'pending') {
      // Keep for history, but mark as resolved if it was acted upon
      if (oldSuggestion.status === 'acted') {
        // Don't re-add acted items that are now fixed
        continue;
      }
      merged.push(oldSuggestion);
    }
  }

  return {
    projectName,
    projectPath,
    lastScan: new Date().toISOString(),
    scanDuration,
    suggestions: merged,
    stats: calculateStats(merged)
  };
}

/**
 * Update suggestion status
 */
export function updateSuggestionStatus(
  projectPath: string,
  suggestionId: string,
  status: 'pending' | 'acted' | 'dismissed' | 'snoozed'
): boolean {
  const queue = loadQueue(projectPath);
  if (!queue) return false;

  const suggestion = queue.suggestions.find(s => s.id === suggestionId);
  if (!suggestion) return false;

  suggestion.status = status;
  if (status === 'acted') {
    suggestion.actedAt = new Date().toISOString();
  }

  saveQueue(queue);
  return true;
}

/**
 * Get pending suggestions (not acted, dismissed, or snoozed)
 */
export function getPendingSuggestions(projectPath: string): Suggestion[] {
  const queue = loadQueue(projectPath);
  if (!queue) return [];

  return queue.suggestions.filter(s => !s.status || s.status === 'pending');
}

/**
 * Get suggestions by type
 */
export function getSuggestionsByType(
  projectPath: string,
  type: 'todo' | 'quality' | 'security' | 'testing'
): Suggestion[] {
  const queue = loadQueue(projectPath);
  if (!queue) return [];

  return queue.suggestions.filter(s => s.type === type);
}

/**
 * Get high priority suggestions (priority >= 7)
 */
export function getHighPrioritySuggestions(projectPath: string): Suggestion[] {
  const queue = loadQueue(projectPath);
  if (!queue) return [];

  return queue.suggestions
    .filter(s => s.priority >= 7 && (!s.status || s.status === 'pending'))
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Get suggestions for context injection
 * Returns a concise summary suitable for injecting into conversation context
 */
export function getSuggestionsForContext(
  projectPath: string,
  maxItems: number = 5
): string {
  const pending = getPendingSuggestions(projectPath);

  if (pending.length === 0) {
    return '';
  }

  // Sort by priority and confidence
  pending.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return b.confidence - a.confidence;
  });

  const top = pending.slice(0, maxItems);

  let context = `PROACTIVE SUGGESTIONS (${pending.length} total):\n`;

  for (const s of top) {
    const conf = Math.round(s.confidence * 100);
    context += `  [${s.type.toUpperCase()}] ${s.file}`;
    if (s.line > 0) context += `:${s.line}`;
    context += ` - ${s.description} (${conf}% confidence)\n`;
  }

  if (pending.length > maxItems) {
    context += `  ...and ${pending.length - maxItems} more\n`;
  }

  context += '\nSay "show suggestions" to see all, or "fix [type]" to address them.';

  return context;
}

/**
 * Clean up old queues
 */
export function cleanupOldQueues(): number {
  ensureDataDir();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - MAX_HISTORY_DAYS);

  let cleaned = 0;

  try {
    const { readdirSync, unlinkSync, statSync } = require('fs');
    const files = readdirSync(SUGGESTIONS_DIR);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = join(SUGGESTIONS_DIR, file);
      const stat = statSync(filePath);

      if (stat.mtime < cutoffDate) {
        unlinkSync(filePath);
        cleaned++;
      }
    }
  } catch {
    // Silent fail
  }

  return cleaned;
}

/**
 * List all tracked projects
 */
export function listTrackedProjects(): { name: string; path: string; lastScan: string; suggestionCount: number }[] {
  ensureDataDir();

  const projects: { name: string; path: string; lastScan: string; suggestionCount: number }[] = [];

  try {
    const { readdirSync } = require('fs');
    const files = readdirSync(SUGGESTIONS_DIR);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = join(SUGGESTIONS_DIR, file);
      try {
        const content = readFileSync(filePath, 'utf-8');
        const queue = JSON.parse(content) as SuggestionQueue;

        projects.push({
          name: queue.projectName,
          path: queue.projectPath,
          lastScan: queue.lastScan,
          suggestionCount: queue.suggestions.filter(s => !s.status || s.status === 'pending').length
        });
      } catch {
        // Skip invalid files
      }
    }
  } catch {
    // Return empty
  }

  return projects.sort((a, b) => b.lastScan.localeCompare(a.lastScan));
}

// CLI usage
if (import.meta.main) {
  const command = process.argv[2];
  const projectPath = process.argv[3] || process.cwd();

  switch (command) {
    case 'list':
      console.log(JSON.stringify(listTrackedProjects(), null, 2));
      break;

    case 'pending':
      console.log(JSON.stringify(getPendingSuggestions(projectPath), null, 2));
      break;

    case 'high':
      console.log(JSON.stringify(getHighPrioritySuggestions(projectPath), null, 2));
      break;

    case 'context':
      console.log(getSuggestionsForContext(projectPath));
      break;

    case 'cleanup':
      const cleaned = cleanupOldQueues();
      console.log(`Cleaned up ${cleaned} old queue files`);
      break;

    default:
      console.log('Usage: bun queue.ts <command> [projectPath]');
      console.log('Commands: list, pending, high, context, cleanup');
  }
}
