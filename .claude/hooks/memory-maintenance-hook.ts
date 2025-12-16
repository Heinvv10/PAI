#!/usr/bin/env bun

/**
 * memory-maintenance-hook.ts
 *
 * Stop hook that enforces memory system updates at the end of each conversation turn.
 * Inspired by Kenny's context engineering video - forces Claude to update memories
 * before completing the response.
 *
 * Triggers: Stop event (before Claude finishes its response)
 *
 * What it does:
 * - Injects a system reminder to update memory files
 * - Points to memory system files and instructions
 * - Ensures consistent memory maintenance across sessions
 *
 * Setup:
 * Add to settings.json Stop hooks array
 */

import { homedir } from 'os';
import { join } from 'path';

async function main() {
  try {
    // Check if this is a subagent session - if so, exit silently
    const claudeProjectDir = process.env.CLAUDE_PROJECT_DIR || '';
    const isSubagent = claudeProjectDir.includes('/.claude/agents/') ||
                      process.env.CLAUDE_AGENT_TYPE !== undefined;

    if (isSubagent) {
      // Subagents don't need to update memory
      console.error('🤖 Subagent session - skipping memory maintenance');
      process.exit(0);
    }

    const paiDir = process.env.PAI_DIR || join(homedir(), '.claude');
    const memoriesDir = join(paiDir, 'memories');

    // Output the system reminder that will be injected into Claude's context
    const reminder = `
<system-reminder>
**MEMORY SYSTEM UPDATE REQUIRED**

Before finishing your response, you MUST update the memory system.

**Memory Files to Update**:
1. **${memoriesDir}/current.md** - Update with:
   - Tasks completed in this turn
   - Important decisions made
   - Context needed for next turn
   - Any blockers or questions

2. **${memoriesDir}/project-index.md** - Update if:
   - Working on a new project
   - Project status changed
   - Important project info to track

**Instructions**:
- Read the current memory files first
- Add new information, don't erase existing context
- Use concise, clear language
- Move old items from current.md to archive.md if they're no longer active
- Keep current.md focused on immediate context

**When to Skip**:
- Trivial queries (e.g., "what time is it?")
- Simple questions that don't change project state
- User just said "thanks" or similar

For all other interactions, update the memory system now.

Read: ${memoriesDir}/README.md for memory system documentation.
</system-reminder>
`;

    // Output to stdout - this gets injected as a user message
    console.log(reminder);

    console.error('💾 Memory maintenance reminder injected');
    process.exit(0);
  } catch (error) {
    console.error('❌ Memory maintenance hook error:', error);
    process.exit(1);
  }
}

main();
