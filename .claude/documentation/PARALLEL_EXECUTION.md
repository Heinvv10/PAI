# Parallel Execution Patterns for PAI

Best practices for running operations concurrently in Claude Code.

---

## When to Use Parallel Execution

### Good Candidates
- **Independent file reads**: Reading multiple files that don't depend on each other
- **Multiple searches**: Running Glob/Grep across different directories
- **Agent spawning**: Launching multiple Task agents for independent work
- **Web fetches**: Fetching from multiple URLs simultaneously
- **MCP calls**: Multiple MCP server queries that don't depend on each other

### Bad Candidates (Must Be Sequential)
- **Dependent operations**: Where output of A is input to B
- **File modifications**: Write/Edit to the same file
- **Git operations**: add → commit → push must be sequential
- **Database transactions**: Operations that must be atomic

---

## Pattern 1: Parallel File Reads

**Before (Sequential)**:
```
Read file A → Read file B → Read file C
Total time: 3 × latency
```

**After (Parallel)**:
```
Read file A ─┐
Read file B ─┼─→ All results at once
Read file C ─┘
Total time: 1 × latency
```

**Implementation**:
Call multiple Read tools in a single message block.

---

## Pattern 2: Parallel Agent Spawning

**Use Case**: Research requiring multiple perspectives

**Implementation**:
```markdown
Launch these agents in parallel:
1. Task(subagent_type="researcher", prompt="Research topic A")
2. Task(subagent_type="researcher", prompt="Research topic B")
3. Task(subagent_type="researcher", prompt="Research topic C")
```

**Benefits**:
- 3x faster for independent research
- Each agent has full context
- Results synthesized after all complete

---

## Pattern 3: Parallel Search + Read

**Use Case**: Find and read related files

**Phase 1 (Parallel)**:
```
Glob("**/*.ts") ─┐
Grep("function") ─┼─→ Get file lists
Glob("**/*.md")  ─┘
```

**Phase 2 (Parallel)**:
```
Read(file1) ─┐
Read(file2) ─┼─→ Get contents
Read(file3) ─┘
```

---

## Pattern 4: MCP Server Parallelism

**Parallel MCP Calls**:
```
mcp__context7__get_library_docs("react") ───┐
mcp__context7__get_library_docs("next.js") ─┼─→ All docs
mcp__memory__search_nodes("patterns") ──────┘
```

**Note**: Different MCP servers can always run in parallel.

---

## Pattern 5: Hybrid Sequential + Parallel

**Complex Workflow**:
```
Phase 1 (Sequential): Understand requirements
  └─ Read PLANNING.md

Phase 2 (Parallel): Gather context
  ├─ Read src/components/Button.tsx
  ├─ Read src/components/Input.tsx
  └─ Grep "Button" in tests/

Phase 3 (Sequential): Implement
  └─ Edit Button.tsx

Phase 4 (Parallel): Verify
  ├─ Bash "npm run lint"
  ├─ Bash "npm run type-check"
  └─ Bash "npm test"
```

---

## Performance Guidelines

### Optimal Parallelism

| Operation | Max Parallel | Reason |
|-----------|--------------|--------|
| File reads | 10 | I/O bound |
| Searches | 5 | CPU bound |
| Web fetches | 3 | Network bound |
| Task agents | 5 | Resource intensive |
| MCP calls | 5 | Server capacity |

### Latency Expectations

| Operation | Sequential (5 items) | Parallel (5 items) |
|-----------|---------------------|-------------------|
| File reads | ~500ms | ~100ms |
| Searches | ~2.5s | ~500ms |
| Web fetches | ~5s | ~1s |
| Agent tasks | ~30s | ~10s |

---

## Anti-Patterns to Avoid

### 1. Parallel File Modifications
```
❌ Bad: Edit file A in parallel with Edit file B (if B depends on A)
✅ Good: Edit A → Read A → Edit B
```

### 2. Parallel Git Operations
```
❌ Bad: git add in parallel with git commit
✅ Good: git add && git commit && git push
```

### 3. Parallel Database Writes
```
❌ Bad: Multiple INSERTs to same table in parallel
✅ Good: Batch INSERT or sequential with transactions
```

### 4. Too Many Parallel Operations
```
❌ Bad: 50 parallel file reads (overwhelms system)
✅ Good: Batch in groups of 10
```

---

## Integration with Veritas

When using Veritas monitoring:

```bash
# Check parallel execution metrics
curl http://localhost:8282/api/metrics | grep parallel

# Metrics tracked:
# - veritas_parallel_operations_total
# - veritas_parallel_duration_seconds
# - veritas_parallel_failures_total
```

---

## Best Practices Summary

1. **Always parallelize independent reads**: Files, searches, web fetches
2. **Keep writes sequential**: Edit, Write, Bash with side effects
3. **Batch large parallel sets**: No more than 10 concurrent operations
4. **Use agents for complex parallel work**: Task tool handles orchestration
5. **Monitor performance**: Use Veritas/Grafana for metrics
6. **Chain dependencies properly**: Phase outputs feed next phase inputs

---

## Example: Full Research Workflow

```markdown
## Phase 1: Parallel Research (3 agents)
- Task(researcher): "Current state of the art"
- Task(researcher): "Historical approaches"
- Task(researcher): "Future directions"

## Phase 2: Parallel Context Gathering
- Read(README.md)
- Read(ARCHITECTURE.md)
- Glob(**/*.md)

## Phase 3: Sequential Synthesis
- Analyze all results
- Write(RESEARCH_SUMMARY.md)

## Phase 4: Parallel Validation
- Bash("npm run lint")
- Bash("npm run test")
- Task(reviewer): "Review summary"
```

**Expected Performance**:
- Without parallelism: ~5 minutes
- With parallelism: ~2 minutes
- Improvement: 60% faster
