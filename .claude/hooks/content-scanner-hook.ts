#!/usr/bin/env bun

/**
 * content-scanner-hook.ts
 *
 * SessionStart hook that performs a quick scan of Tier 1 AI/coding content sources
 * and outputs a brief digest of high-value new content.
 *
 * Features:
 * - Quick scan of priority sources (Tier 1 only)
 * - Last 24 hours of content
 * - PAI-relevant VPM boosting
 * - Brief output (top 3 items)
 * - Cross-session state via local JSON file
 *
 * Setup:
 * 1. Add to settings.json SessionStart hooks
 * 2. Ensure bun is installed
 * 3. Learning state stored in ~/.claude/skills/content-scanner/learning-state.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Types
interface ContentItem {
  title: string;
  url: string;
  source: string;
  published: Date;
  description: string;
  baseVPM: number;
  effectiveVPM: number;
}

interface LearningState {
  version: string;
  lastScan: string;
  sourceAdjustments: Record<string, number>;
  topicBoosts: Record<string, number>;
  interactions: Array<{
    type: 'starred' | 'watched' | 'skipped';
    title?: string;
    source: string;
    date: string;
  }>;
  decayFactor: number;
  lastDecayApplied: string;
}

interface RSSSource {
  name: string;
  url: string;
  type: 'youtube' | 'blog' | 'forum';
}

// Tier 1 Priority Sources (hardcoded) - Verified channel IDs
const TIER1_SOURCES: RSSSource[] = [
  {
    name: 'Daniel Miessler',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCnCikd0s4i9KoDtaHPlK-JA',
    type: 'youtube'
  },
  {
    name: 'Fireship',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCsBjURrPoezykLs9EqgamOA',
    type: 'youtube'
  },
  {
    name: 'Simon Willison',
    url: 'https://simonwillison.net/atom/everything/',
    type: 'blog'
  },
  {
    name: 'AI Explained',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCNJ1Ymd5yFuUPtn21xtRbbw',
    type: 'youtube'
  },
  {
    name: 'Andrej Karpathy',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCXUPKJO5MZQN11PqgIvyuvQ',
    type: 'youtube'
  }
];

// PAI-relevant keywords for VPM boosting
const HIGH_BOOST_KEYWORDS = [
  'claude code', 'mcp server', 'model context protocol',
  'ai agents', 'multi-agent', 'agent orchestration',
  'fabric patterns', 'daniel miessler',
  'prompt engineering', 'context engineering'
];

const LOW_BOOST_KEYWORDS = [
  'claude', 'anthropic', 'sonnet', 'opus',
  'rag', 'vector database', 'embeddings',
  'llm', 'gpt-4', 'gemini',
  'coding assistant', 'ai tools',
  'typescript', 'python', 'node.js'
];

// Helper functions
function getPaiDir(): string {
  return process.env.PAI_DIR || join(homedir(), '.claude');
}

function getLearningStatePath(): string {
  return join(getPaiDir(), 'skills/content-scanner/learning-state.json');
}

function getDefaultLearningState(): LearningState {
  return {
    version: '1.0',
    lastScan: new Date(0).toISOString(),
    sourceAdjustments: {},
    topicBoosts: {},
    interactions: [],
    decayFactor: 0.95,
    lastDecayApplied: new Date().toISOString()
  };
}

function loadLearningState(): LearningState {
  const path = getLearningStatePath();
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8'));
    } catch {
      return getDefaultLearningState();
    }
  }
  return getDefaultLearningState();
}

function saveLearningState(state: LearningState): void {
  const path = getLearningStatePath();
  const dir = join(getPaiDir(), 'skills/content-scanner');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(state, null, 2));
}

function calculateBaseVPM(item: { title: string; description: string }): number {
  // Simple heuristic based on content length and keywords
  const text = `${item.title} ${item.description}`.toLowerCase();
  let vpm = 5; // Default moderate value

  // Boost for educational content
  if (text.includes('tutorial') || text.includes('guide') || text.includes('how to')) {
    vpm += 1;
  }

  // Boost for news/updates
  if (text.includes('new') || text.includes('update') || text.includes('release')) {
    vpm += 0.5;
  }

  // Slight penalty for very short content
  if (text.length < 50) {
    vpm -= 1;
  }

  return Math.max(1, Math.min(10, vpm));
}

function calculatePAIBoost(item: { title: string; description: string }): number {
  const text = `${item.title} ${item.description}`.toLowerCase();
  let boost = 0;

  // High boost keywords (+2)
  for (const keyword of HIGH_BOOST_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      boost += 2;
      break; // Only apply once
    }
  }

  // Low boost keywords (+1)
  for (const keyword of LOW_BOOST_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      boost += 1;
      break; // Only apply once
    }
  }

  return boost;
}

function getLearnedAdjustment(source: string, state: LearningState): number {
  return state.sourceAdjustments[source] || 0;
}

async function fetchRSS(source: RSSSource): Promise<ContentItem[]> {
  try {
    const response = await fetch(source.url, {
      headers: {
        'User-Agent': 'PAI-Content-Scanner/1.0'
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${source.name}: ${response.status}`);
      return [];
    }

    const xml = await response.text();
    const items: ContentItem[] = [];

    // Simple XML parsing for RSS/Atom feeds
    // YouTube and Atom feeds use <entry>, standard RSS uses <item>
    const isAtomFeed = xml.includes('<feed') || source.type === 'youtube';
    const entryRegex = isAtomFeed
      ? /<entry>([\s\S]*?)<\/entry>/g
      : /<item>([\s\S]*?)<\/item>/g;

    const titleRegex = /<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/;
    const linkRegex = isAtomFeed
      ? /<link[^>]*href="([^"]*)"[^>]*\/?>/
      : /<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/;
    const pubDateRegex = isAtomFeed
      ? /<(?:published|updated)>([\s\S]*?)<\/(?:published|updated)>/
      : /<pubDate>([\s\S]*?)<\/pubDate>/;
    const descRegex = source.type === 'youtube'
      ? /<media:description>([\s\S]*?)<\/media:description>/
      : isAtomFeed
        ? /<(?:summary|content)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:summary|content)>/
        : /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/;

    let match;
    while ((match = entryRegex.exec(xml)) !== null) {
      const entry = match[1];

      const titleMatch = titleRegex.exec(entry);
      const linkMatch = linkRegex.exec(entry);
      const pubMatch = pubDateRegex.exec(entry);
      const descMatch = descRegex.exec(entry);

      if (titleMatch && linkMatch) {
        const title = titleMatch[1].trim();
        const url = linkMatch[1].trim();
        const published = pubMatch ? new Date(pubMatch[1].trim()) : new Date();
        const description = descMatch ? descMatch[1].trim().substring(0, 200) : '';

        // Only include items from last 24 hours for quick scan
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (published > oneDayAgo) {
          const baseVPM = calculateBaseVPM({ title, description });
          const paiBoost = calculatePAIBoost({ title, description });

          items.push({
            title,
            url,
            source: source.name,
            published,
            description,
            baseVPM,
            effectiveVPM: baseVPM + paiBoost
          });
        }
      }
    }

    return items;
  } catch (error) {
    console.error(`Error fetching ${source.name}:`, error);
    return [];
  }
}

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours === 1) return '1h ago';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

async function main() {
  try {
    // Check if this is a subagent session - if so, exit silently
    const claudeProjectDir = process.env.CLAUDE_PROJECT_DIR || '';
    const isSubagent = claudeProjectDir.includes('/.claude/agents/') ||
                      process.env.CLAUDE_AGENT_TYPE !== undefined;

    if (isSubagent) {
      process.exit(0);
    }

    console.error('[Content Scanner] Starting quick scan of Tier 1 sources...');

    // Load learning state
    const learningState = loadLearningState();

    // Fetch all sources in parallel
    const fetchPromises = TIER1_SOURCES.map(source => fetchRSS(source));
    const results = await Promise.all(fetchPromises);

    // Flatten and apply learned adjustments
    let allItems: ContentItem[] = results.flat();
    allItems = allItems.map(item => ({
      ...item,
      effectiveVPM: item.effectiveVPM + getLearnedAdjustment(item.source, learningState)
    }));

    // Sort by effective VPM
    allItems.sort((a, b) => b.effectiveVPM - a.effectiveVPM);

    // Filter to high-value items (VPM >= 4)
    const highValueItems = allItems.filter(item => item.effectiveVPM >= 4);

    // Update last scan time
    learningState.lastScan = new Date().toISOString();
    saveLearningState(learningState);

    // Output digest
    if (highValueItems.length === 0) {
      console.log(`\n[Content Scanner] No new high-value content in last 24h\n`);
    } else {
      const top3 = highValueItems.slice(0, 3);
      let output = `\n[Content Scanner] ${highValueItems.length} new item${highValueItems.length > 1 ? 's' : ''} since last scan\n\n`;
      output += `TOP ${Math.min(3, top3.length)}:\n`;

      top3.forEach((item, i) => {
        output += `${i + 1}. [VPM ${item.effectiveVPM.toFixed(1)}] "${item.title}" - ${item.source} (${formatTimeAgo(item.published)})\n`;
      });

      output += `\nSay "show AI news" for full list or "scan channels" for fresh scan.\n`;

      console.log(output);
    }

    console.error('[Content Scanner] Quick scan complete');
    process.exit(0);
  } catch (error) {
    console.error('[Content Scanner] Error:', error);
    process.exit(1);
  }
}

main();
