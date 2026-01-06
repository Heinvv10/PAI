#!/usr/bin/env bun
/**
 * Capture All Events Hook
 * Captures ALL Claude Code hook events (not just tools) to JSONL
 * This hook provides comprehensive event tracking for the PAI observability system
 *
 * SETUP REQUIRED:
 * 1. Install Bun: https://bun.sh
 * 2. Set PAI_DIR environment variable (defaults to ~/.claude)
 * 3. Make this file executable: chmod +x capture-all-events.ts
 * 4. Configure in settings.json under "hooks" section
 *
 * MIGRATED: Now uses kai-hook-system utilities for DRY code and security
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { EventBus, KaiEvent, KaiEventType } from './kai/event-bus';
import { securityMiddleware } from './kai/security';
import { getPAIDir, appendJSONL, logHook, ensureDirectory } from './kai/shared';

interface HookEvent {
  source_app: string;
  session_id: string;
  hook_event_type: string;
  payload: Record<string, any>;
  timestamp: number;
  timestamp_pst: string;
}

// Get PST timestamp (adjust timezone as needed for your location)
function getPSTTimestamp(): string {
  const date = new Date();
  // Change 'America/Los_Angeles' to your preferred timezone
  const pstDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));

  const year = pstDate.getFullYear();
  const month = String(pstDate.getMonth() + 1).padStart(2, '0');
  const day = String(pstDate.getDate()).padStart(2, '0');
  const hours = String(pstDate.getHours()).padStart(2, '0');
  const minutes = String(pstDate.getMinutes()).padStart(2, '0');
  const seconds = String(pstDate.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} PST`;
}

// Get current events file path using PAI conventions
function getEventsFilePath(): string {
  const paiDir = getPAIDir();
  const now = new Date();
  const pstDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const year = pstDate.getFullYear();
  const month = String(pstDate.getMonth() + 1).padStart(2, '0');
  const day = String(pstDate.getDate()).padStart(2, '0');

  const monthDir = join(paiDir, 'history', 'raw-outputs', `${year}-${month}`);

  // Ensure directory exists using shared utility
  ensureDirectory(monthDir);

  return join(monthDir, `${year}-${month}-${day}_all-events.jsonl`);
}

// Session-to-agent mapping functions
function getSessionMappingFile(): string {
  const paiDir = getPAIDir();
  return join(paiDir, 'agent-sessions.json');
}

function getAgentForSession(sessionId: string): string {
  try {
    const mappingFile = getSessionMappingFile();
    if (existsSync(mappingFile)) {
      const mappings = JSON.parse(readFileSync(mappingFile, 'utf-8'));
      // Default agent name - change 'kai' to your primary agent's name
      return mappings[sessionId] || 'kai';
    }
  } catch (error) {
    // Ignore errors, default to primary agent
  }
  // Change 'kai' to your primary agent's name
  return 'kai';
}

function setAgentForSession(sessionId: string, agentName: string): void {
  try {
    const mappingFile = getSessionMappingFile();
    let mappings: Record<string, string> = {};

    if (existsSync(mappingFile)) {
      mappings = JSON.parse(readFileSync(mappingFile, 'utf-8'));
    }

    mappings[sessionId] = agentName;
    writeFileSync(mappingFile, JSON.stringify(mappings, null, 2), 'utf-8');
  } catch (error) {
    // Silently fail - don't block
  }
}

async function main() {
  try {
    // Get event type from command line args
    const args = process.argv.slice(2);
    const eventTypeIndex = args.indexOf('--event-type');

    if (eventTypeIndex === -1) {
      logHook('capture-all-events', 'Missing --event-type argument', 'error');
      process.exit(0); // Don't block Claude Code
    }

    const eventType = args[eventTypeIndex + 1] as KaiEventType;

    // Parse event using kai utilities
    const kaiEvent = await EventBus.parseEvent(eventType);

    // Security validation
    if (!(await securityMiddleware(kaiEvent, 'capture-all-events'))) {
      logHook('capture-all-events', 'Security validation failed', 'error');
      process.exit(0);
    }

    // Detect agent type from session mapping or payload
    const sessionId = kaiEvent.session_id || 'main';
    let agentName = getAgentForSession(sessionId);

    // If this is a Task tool launching a subagent, update the session mapping
    const toolName = kaiEvent.payload.tool_name;
    const toolInput = kaiEvent.payload.tool_input;

    if (toolName === 'Task' && toolInput?.subagent_type) {
      agentName = toolInput.subagent_type;
      setAgentForSession(sessionId, agentName);
    }
    // If this is a SubagentStop or Stop event, reset to primary agent
    else if (eventType === 'SubagentStop' || eventType === 'Stop') {
      // Change 'kai' to your primary agent's name
      agentName = 'kai';
      setAgentForSession(sessionId, 'kai');
    }
    // Check if CLAUDE_CODE_AGENT env variable is set (for subagents)
    else if (process.env.CLAUDE_CODE_AGENT) {
      agentName = process.env.CLAUDE_CODE_AGENT;
      setAgentForSession(sessionId, agentName);
    }
    // Check if agent type is in the payload (alternative detection method)
    else if (kaiEvent.payload.agent_type) {
      agentName = kaiEvent.payload.agent_type;
      setAgentForSession(sessionId, agentName);
    }
    // Check if this is from a subagent based on cwd containing 'agent'
    else if (kaiEvent.payload.cwd && kaiEvent.payload.cwd.includes('/agents/')) {
      // Extract agent name from path like "/agents/designer/"
      const agentMatch = kaiEvent.payload.cwd.match(/\/agents\/([^\/]+)/);
      if (agentMatch) {
        agentName = agentMatch[1];
        setAgentForSession(sessionId, agentName);
      }
    }

    // Create event object
    const event: HookEvent = {
      source_app: agentName,
      session_id: sessionId,
      hook_event_type: eventType,
      payload: kaiEvent.payload,
      timestamp: Date.now(),
      timestamp_pst: getPSTTimestamp()
    };

    // Append to events file using shared utility
    const eventsFile = getEventsFilePath();
    appendJSONL(eventsFile, event);

    logHook('capture-all-events', `Event captured: ${eventType} for ${agentName}`, 'debug');

  } catch (error) {
    // Log error using shared utility instead of console.error
    logHook('capture-all-events', `Event capture error: ${error}`, 'error');
  }

  process.exit(0);
}

main();
