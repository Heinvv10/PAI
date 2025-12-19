/**
 * STT Cost Tracking
 *
 * Logs all STT operations to file for cost monitoring
 * TODO: Integrate with PostgreSQL for BOSS knowledge layer
 */

import { appendFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface CostLogEntry {
  tier: 1 | 2 | 3;
  duration: number;  // Audio duration in seconds
  cost: number;      // USD
  provider: string;  // "local", "groq", "deepgram"
  filename: string;
  timestamp?: Date;
}

const LOG_DIR = join(process.env.HOME || '/tmp', '.claude', 'stt-server', 'logs');
const COST_LOG_FILE = join(LOG_DIR, 'cost-log.jsonl');

export async function logCost(entry: CostLogEntry): Promise<void> {
  // Ensure log directory exists
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }

  // Add timestamp
  const logEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  // Append to JSONL file
  const logLine = JSON.stringify(logEntry) + '\n';

  try {
    await appendFile(COST_LOG_FILE, logLine);
    console.log(`💾 Cost logged: Tier ${entry.tier}, ${entry.duration.toFixed(1)}s, $${entry.cost.toFixed(4)} (${entry.provider})`);
  } catch (error: any) {
    console.error(`❌ Failed to log cost: ${error.message}`);
  }
}

export async function getCostSummary(period: 'day' | 'week' | 'month' = 'month'): Promise<any> {
  // TODO: Implement cost retrieval and aggregation
  // For now, return empty summary
  return {
    period: period,
    total_cost: 0,
    total_hours: 0,
    tier_breakdown: {
      tier1: { hours: 0, cost: 0 },
      tier2: { hours: 0, cost: 0 },
      tier3: { hours: 0, cost: 0 },
    },
  };
}
