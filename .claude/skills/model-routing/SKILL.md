---
name: model-routing
description: |
  Intelligent Model Selection and Routing for PAI

  Automatically routes tasks to the optimal Claude model based on:
  - Task complexity (simple lookup → complex reasoning)
  - Cost sensitivity (minimize spend for routine tasks)
  - Latency requirements (fast response vs thorough analysis)
  - Token budget (context size requirements)

  === MODEL TIERS ===

  FAST (Haiku): Quick lookups, formatting, simple edits
  STANDARD (Sonnet): Most coding tasks, analysis, research
  ADVANCED (Opus): Complex architecture, deep reasoning, critical decisions

  === AUTO-ROUTING RULES ===

  Use FAST (Haiku) for:
  - File reads without analysis
  - Simple search queries
  - Formatting and linting
  - Status checks
  - Quick confirmations

  Use STANDARD (Sonnet) for:
  - Code implementation
  - Bug fixes
  - Research synthesis
  - Documentation
  - Most user requests

  Use ADVANCED (Opus) for:
  - Architecture design
  - Security audits
  - Complex debugging
  - Multi-system analysis
  - Critical business logic

triggers:
  - model routing
  - which model
  - use haiku
  - use sonnet
  - use opus
  - cost optimization
---

# Model Routing System

## Quick Reference

| Tier | Model | Cost (per 1M) | Use For |
|------|-------|---------------|---------|
| **FAST** | claude-3-5-haiku | $0.25/$1.25 | Quick tasks, lookups |
| **STANDARD** | claude-sonnet-4-5 | $3/$15 | Most coding work |
| **ADVANCED** | claude-opus-4 | $15/$75 | Complex reasoning |

---

## Automatic Routing Rules

### Route to FAST (Haiku)

**Task Patterns**:
```yaml
fast_tasks:
  - file_read_only          # Read without analysis
  - simple_search           # Grep/Glob without complex patterns
  - format_code             # Prettier, Black, etc.
  - lint_check              # ESLint, Ruff output
  - status_query            # "What's the build status?"
  - yes_no_confirmation     # Simple confirmations
  - list_files              # Directory listings
  - git_status              # Simple git queries
```

**Estimated Savings**: 90% cost reduction vs Sonnet for these tasks

### Route to STANDARD (Sonnet)

**Task Patterns**:
```yaml
standard_tasks:
  - code_implementation     # Write new features
  - bug_fix                 # Debug and fix issues
  - code_review             # Review PRs
  - documentation           # Write docs, comments
  - research_synthesis      # Combine research results
  - test_writing            # Create test cases
  - refactoring             # Improve code structure
  - api_integration         # Connect to external services
```

**Default choice** for most development work.

### Route to ADVANCED (Opus)

**Task Patterns**:
```yaml
advanced_tasks:
  - architecture_design     # System design decisions
  - security_audit          # Find vulnerabilities
  - complex_debugging       # Multi-file, multi-system bugs
  - performance_analysis    # Deep optimization
  - critical_business_logic # Payment, auth, data integrity
  - multi_agent_orchestration  # Complex agent coordination
  - extended_thinking       # "think hard", "ultrathink"
```

**Use sparingly** - 5x cost of Sonnet.

---

## Manual Override

### Force Specific Model

In Task tool calls:
```yaml
Task:
  subagent_type: "engineer"
  model: "haiku"   # Force fast model
  prompt: "Format this JSON file"
```

### Extended Thinking Triggers

These phrases automatically route to Opus with extended thinking:
- `think` → 4K-8K thinking tokens
- `think hard` → 8K-16K thinking tokens
- `think harder` → 16K-32K thinking tokens
- `ultrathink` → 32K+ thinking tokens

---

## Cost Optimization Strategies

### 1. Batch Similar Tasks

**Instead of**:
```
Read file A → Analyze
Read file B → Analyze
Read file C → Analyze
```

**Do**:
```
Read files A, B, C (Haiku) → Analyze all (Sonnet)
```

**Savings**: ~60%

### 2. Tiered Analysis

**Phase 1 (Haiku)**: Quick scan for obvious issues
**Phase 2 (Sonnet)**: Deep analysis only on flagged items
**Phase 3 (Opus)**: Critical decisions only

### 3. Cache Expensive Results

Use tool-cache.ts to avoid re-running expensive operations.

---

## Integration with PAI Agents

### Agent Model Assignments

From `project_agents.yaml`:

```yaml
agents:
  researcher:
    model_tier: STANDARD
    fallback: FAST

  engineer:
    model_tier: STANDARD
    complex_tasks: ADVANCED

  architect:
    model_tier: ADVANCED
    fallback: STANDARD

  reviewer:
    model_tier: FAST
    deep_review: STANDARD
```

### Veritas Model Configuration

When Veritas Docker is running:
```python
# From Veritas config.py
MODEL_TIER_MAPPING = {
    ModelTier.FAST: "claude-3-haiku-20240307",
    ModelTier.STANDARD: "claude-sonnet-4-5-20250929",
    ModelTier.ADVANCED: "claude-3-opus-20240229",
    ModelTier.CODE_MAX: "claude-sonnet-4-5-20250929",
}
```

---

## Decision Flow

```
Task Received
     │
     ▼
┌────────────────┐
│ Complexity     │
│ Assessment     │
└────────────────┘
     │
     ├── Simple (lookup, format) ──► HAIKU
     │
     ├── Standard (code, docs) ────► SONNET
     │
     └── Complex (arch, security) ─► OPUS
           │
           ▼
     Extended Thinking?
           │
           ├── "think" ────► 4K tokens
           ├── "think hard" ► 16K tokens
           └── "ultrathink" ► 32K+ tokens
```

---

## Monitoring Model Usage

### Token Tracking

The `token-tracker.ts` hook logs:
- Estimated tokens per call
- Cumulative session cost
- Model distribution

### Veritas Metrics

When monitoring is running:
```promql
# Model usage by tier
sum by (model_tier) (rate(veritas_model_requests_total[1h]))

# Cost by model
sum by (model) (veritas_estimated_cost_usd)
```

---

## Best Practices

1. **Default to Sonnet**: Best balance of capability and cost
2. **Use Haiku liberally**: For any non-analytical task
3. **Reserve Opus for decisions**: Architecture, security, critical logic
4. **Enable caching**: Reduce redundant expensive calls
5. **Batch operations**: Combine similar tasks before analysis
6. **Monitor costs**: Use observability skill to track spend

---

## MCP Integration

### With context7
```yaml
# Documentation lookup - use FAST
model: haiku
action: mcp__context7__get_library_docs
```

### With sequential-thinking
```yaml
# Complex reasoning - use ADVANCED
model: opus
action: mcp__sequential_thinking__sequentialthinking
```

### With memory
```yaml
# Simple recall - use FAST
model: haiku
action: mcp__memory__search_nodes

# Complex synthesis - use STANDARD
model: sonnet
action: Synthesize multiple memory results
```
