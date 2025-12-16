# Memory System

This directory contains the structured memory system for PAI, inspired by context engineering best practices.

---

## Files

### current.md
- **Purpose**: Active session state
- **Updated**: Every conversation turn (via stop-hook)
- **Contains**:
  - Tasks in progress
  - Today's decisions
  - Context for next session
  - Blockers and questions

### archive.md
- **Purpose**: Long-term memory storage
- **Updated**: When current.md entries become historical
- **Contains**:
  - Archived memories with dates
  - Session summaries
  - Important learnings

### project-index.md
- **Purpose**: Cross-project awareness
- **Updated**: When switching projects or starting new ones
- **Contains**:
  - Active projects with paths
  - Project status and context file locations
  - Last worked dates
  - Key project-specific notes

---

## Memory Workflow

### During Session (Automatic)
1. Stop-hook triggers at end of each conversation turn
2. Claude updates `current.md` with:
   - Progress made
   - Decisions taken
   - Context for resumption

### End of Session (Automatic)
1. Important items from `current.md` moved to `archive.md`
2. `current.md` reset for next session
3. `project-index.md` updated if project status changed

### Across Sessions
- `archive.md` provides historical context
- `project-index.md` helps switch between projects
- `current.md` always shows immediate state

---

## Benefits

1. **Consistency**: Claude remembers context across sessions
2. **Efficiency**: No need to re-explain project details
3. **Reliability**: Important decisions are persisted
4. **Awareness**: Track progress across multiple projects

---

## Integration

Memory system is triggered by:
- **stop-hook.ts**: Updates current.md at end of each turn
- **initialize-pai-session.ts**: Loads memories at session start
- **User**: Can manually edit any memory file
