#!/usr/bin/env bun

/**
 * Subagent Stop Hook - Voice notifications for subagent completions
 *
 * MIGRATED: Now uses kai-hook-system utilities for event handling
 */

import { existsSync } from 'fs';
import { EventBus, TranscriptEntry } from './kai/event-bus';
import { securityMiddleware } from './kai/security';
import { logHook } from './kai/shared';

// Voice mappings for different agent types
const AGENT_VOICE_IDS: Record<string, string> = {
  researcher: 'AXdMgz6evoL7OPd7eU12',
  pentester: 'hmMWXCj9K7N5mCPcRkfC',
  engineer: 'kmSVBPu7loj4ayNinwWM',
  designer: 'ZF6FPAbjXT4488VcRRnw',
  architect: 'muZKMsIDGYtIkjjiUS82',
  writer: 'gfRt6Z3Z8aTbpLfexQ7N',
  kai: 'jqcCZkN6Knx8BJ5TBdYR',
  default: 'jqcCZkN6Knx8BJ5TBdYR'
};

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function findTaskResult(transcriptPath: string, maxAttempts: number = 10): Promise<{ result: string | null, agentType: string | null }> {
  logHook('subagent-stop-hook', `Looking for Task result in transcript: ${transcriptPath}`, 'debug');

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      // Wait progressively longer between attempts
      await delay(100 * attempt);
    }

    if (!existsSync(transcriptPath)) {
      logHook('subagent-stop-hook', `Transcript file doesn't exist yet (attempt ${attempt + 1}/${maxAttempts})`, 'debug');
      continue;
    }

    try {
      // Load and parse transcript using kai utilities
      const transcript = await EventBus.loadTranscript({ transcript_path: transcriptPath } as any);
      const entries = EventBus.parseTranscript(transcript);

      // Search from the end of the transcript backwards
      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i];

        // Look for assistant messages that contain Task tool_use
        if (entry.type === 'assistant' && entry.message?.content) {
          for (const content of entry.message.content) {
            if (content.type === 'tool_use' && content.name === 'Task') {
              logHook('subagent-stop-hook', `Found Task invocation with subagent: ${content.input?.subagent_type}`, 'debug');
              // Found a Task invocation, now look for its result
              // The result should be in a subsequent user message
              for (let j = i + 1; j < entries.length; j++) {
                const resultEntry = entries[j];
                if (resultEntry.type === 'user' && resultEntry.message?.content) {
                  for (const resultContent of resultEntry.message.content) {
                    if (resultContent.type === 'tool_result' && resultContent.tool_use_id === content.id) {
                      // Found the matching Task result
                      const taskOutput = resultContent.content;

                      // Extract agent type from the output
                      let agentType = 'default';
                      const agentMatch = taskOutput.match(/Sub-agent\s+(\w+)\s+completed/i);
                      if (agentMatch) {
                        agentType = agentMatch[1].toLowerCase();
                      }

                      return { result: taskOutput, agentType };
                    }
                  }
                }
              }
            }
          }
        }
      }
    } catch (e) {
      // Error reading file, will retry
    }
  }

  return { result: null, agentType: null };
}

function extractCompletionMessage(taskOutput: string): { message: string | null, agentType: string | null } {
  logHook('subagent-stop-hook', `Extracting from task output, length: ${taskOutput.length}`, 'debug');

  // First, check for CUSTOM COMPLETED line (voice-optimized) - with or without emoji
  const customCompletedMatch = taskOutput.match(/(?:🗣️\s*)?(?:\*+)?CUSTOM\s+COMPLETED:\s*(?:\*+)?\s*(.+?)(?:\n|$)/im);

  if (customCompletedMatch) {
    // Get the custom voice response
    let customText = customCompletedMatch[1].trim()
      .replace(/\[.*?\]/g, '') // Remove bracketed text like [Optional: ...]
      .replace(/\*+/g, '') // Remove asterisks
      .trim();

    // Use custom completed if it's under 8 words
    const wordCount = customText.split(/\s+/).length;
    if (customText && wordCount <= 8) {
      // Try to extract agent type from the full output
      let agentType = null;

      // Look for agent type in various formats
      const agentTypePatterns = [
        /\[AGENT:(\w+)\]/i,
        /Sub-agent\s+(\w+)\s+completed/i,
        /(\w+)\s+Agent\s+completed/i,
        /🎯\s*COMPLETED:\s*\[AGENT:(\w+)\]/i
      ];

      for (const pattern of agentTypePatterns) {
        const match = taskOutput.match(pattern);
        if (match) {
          agentType = match[1].toLowerCase();
          break;
        }
      }

      logHook('subagent-stop-hook', `FOUND CUSTOM COMPLETED: ${customText} [Agent: ${agentType || 'unknown'}]`, 'debug');

      // Don't prepend agent name if custom text already sounds complete
      return { message: customText, agentType };
    }
  }

  // Look for the COMPLETED section in the agent's output
  // Priority is given to [AGENT:type] format
  const agentPatterns = [
    // Handle markdown formatting with asterisks
    /\*+🎯\s*COMPLETED:\*+\s*\[AGENT:(\w+)\]\s*I\s+completed\s+(.+?)(?:\n|$)/is,
    /\*+🎯\s+COMPLETED:\*+\s*\[AGENT:(\w+)\]\s*I\s+completed\s+(.+?)(?:\n|$)/is,
    // Non-markdown patterns
    /🎯\s*COMPLETED:\s*\[AGENT:(\w+)\]\s*I\s+completed\s+(.+?)(?:\n|$)/is,
    /COMPLETED:\s*\[AGENT:(\w+)\]\s*I\s+completed\s+(.+?)(?:\n|$)/is,
    /\[AGENT:(\w+)\]\s*I\s+completed\s+(.+?)(?:\.|!|\n|$)/is,
    // Generic pattern for current format
    /🎯.*COMPLETED.*\[AGENT:(\w+)\]\s*I\s+completed\s+(.+?)(?:\n|$)/is
  ];

  // First try to match agent-specific patterns
  for (const pattern of agentPatterns) {
    const match = taskOutput.match(pattern);
    if (match && match[1] && match[2]) {
      const agentType = match[1].toLowerCase();
      let message = match[2].trim();

      // Clean up the message
      message = message.replace(/\*+/g, '');
      message = message.replace(/\s+/g, ' ');

      // Prepend agent name for spoken message
      const agentName = agentType.charAt(0).toUpperCase() + agentType.slice(1);
      const fullMessage = `${agentName} completed ${message}`;

      logHook('subagent-stop-hook', `FOUND AGENT MATCH: [${agentType}] ${fullMessage}`, 'debug');

      // Return agent type and message
      return { message: fullMessage, agentType };
    }
  }

  // Fall back to generic patterns but try to extract agent type
  const genericPatterns = [
    // Handle markdown formatting
    /\*+🎯\s*COMPLETED:\*+\s*(.+?)(?:\n|$)/i,
    /\*+COMPLETED:\*+\s*(.+?)(?:\n|$)/i,
    // Non-markdown patterns
    /🎯\s*COMPLETED:\s*(.+?)(?:\n|$)/i,
    /COMPLETED:\s*(.+?)(?:\n|$)/i,
    /Sub-agent\s+\w+\s+completed\s+(.+?)(?:\.|!|\n|$)/i,
    /Agent\s+completed\s+(.+?)(?:\.|!|\n|$)/i
  ];

  for (const pattern of genericPatterns) {
    const match = taskOutput.match(pattern);
    if (match && match[1]) {
      let message = match[1].trim();

      // Clean up the message
      message = message.replace(/^(the\s+)?requested\s+task$/i, '');
      message = message.replace(/\*+/g, '');
      message = message.replace(/\s+/g, ' ');

      // Only return if it's not a generic message
      if (message &&
          !message.match(/^(the\s+)?requested\s+task$/i) &&
          !message.match(/^task$/i) &&
          message.length > 5) {

        // Try to detect agent type from context
        let agentType = null;
        const agentMatch = taskOutput.match(/Sub-agent\s+(\w+)\s+completed/i);
        if (agentMatch) {
          agentType = agentMatch[1].toLowerCase();
        }

        return { message, agentType };
      }
    }
  }

  return { message: null, agentType: null };
}

async function main() {
  logHook('subagent-stop-hook', 'Hook started', 'debug');

  try {
    // Parse event using kai utilities
    const event = await EventBus.parseEvent('SubagentStop');

    // Security validation
    if (!(await securityMiddleware(event, 'subagent-stop-hook'))) {
      logHook('subagent-stop-hook', 'Security validation failed', 'error');
      process.exit(0);
    }

    if (!event.transcript_path) {
      logHook('subagent-stop-hook', 'No transcript path provided', 'warn');
      process.exit(0);
    }

    // Wait for and find the Task result
    const { result: taskOutput, agentType } = await findTaskResult(event.transcript_path);

    if (!taskOutput) {
      logHook('subagent-stop-hook', 'No Task result found in transcript after waiting', 'warn');
      process.exit(0);
    }

    // Extract the completion message and agent type
    const { message: completionMessage, agentType: extractedAgentType } = extractCompletionMessage(taskOutput);

    if (!completionMessage) {
      logHook('subagent-stop-hook', 'No specific completion message found in Task output', 'warn');
      process.exit(0);
    }

    // Use extracted agent type if available, otherwise use the one from task analysis
    const finalAgentType = extractedAgentType || agentType || 'default';

    // Prepare the notification
    const fullMessage = completionMessage; // Message is already prepared with agent name
    const agentName = finalAgentType.charAt(0).toUpperCase() + finalAgentType.slice(1);

    // Send to notification server
    try {
      await fetch('http://localhost:8888/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${agentName} Agent`,
          message: fullMessage,
          voice_enabled: true,
          agent_type: finalAgentType,
          voice_id: AGENT_VOICE_IDS[finalAgentType] || AGENT_VOICE_IDS.default
        })
      });

      logHook('subagent-stop-hook', `Sent: [${agentName}] ${fullMessage}`, 'info');
    } catch (e) {
      logHook('subagent-stop-hook', `Failed to send notification: ${e}`, 'error');
    }
  } catch (error) {
    logHook('subagent-stop-hook', `Error: ${error}`, 'error');
  }
}

main().catch((error) => {
  logHook('subagent-stop-hook', `Unhandled error: ${error}`, 'error');
});
