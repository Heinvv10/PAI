---
name: skill-management
description: |
  Skill Hot-Reloading and Management System for PAI

  Enables dynamic skill updates without restarting Claude Code sessions.
  Provides skill discovery, validation, and lifecycle management.

  === CAPABILITIES ===

  - Hot-reload skills on demand
  - Validate skill YAML frontmatter
  - List available skills with triggers
  - Enable/disable skills dynamically
  - Create new skills from templates

  === WHEN TO USE ===

  - After editing a skill file
  - When skills aren't triggering
  - To see available skills
  - When creating new skills

triggers:
  - reload skills
  - refresh skills
  - list skills
  - skill status
  - hot reload
  - skill management
---

# Skill Hot-Reloading System

## Quick Commands

| Action | How to Trigger |
|--------|----------------|
| List all skills | "list skills" or "show available skills" |
| Reload a skill | "reload [skill-name]" or "refresh [skill-name]" |
| Check skill status | "skill status" or "which skills are loaded" |
| Create new skill | Use `create-skill` skill |

---

## How Skill Loading Works

### Initial Load (Session Start)

1. Claude Code scans `~/.claude/skills/*/SKILL.md`
2. Reads YAML frontmatter from each file
3. Extracts `name`, `description`, and `triggers`
4. Registers skills in Skill tool's available list

### Hot-Reload Process

When you say "reload skills" or edit a skill:

1. **Detect Change**: File watcher notices SKILL.md modification
2. **Parse Updated Frontmatter**: Re-read YAML header
3. **Validate Structure**: Ensure required fields present
4. **Update Registry**: Replace old skill definition
5. **Confirm Reload**: Report success/failure

---

## Skill File Structure

```markdown
---
name: my-skill
description: |
  Brief description (shown in skill list)

  === WHEN TO USE ===
  - Trigger condition 1
  - Trigger condition 2

triggers:
  - trigger phrase 1
  - trigger phrase 2
  - keyword
---

# Full Skill Documentation

[Detailed content loaded when skill activated]
```

### Required Fields

| Field | Purpose | Example |
|-------|---------|---------|
| `name` | Unique identifier | `my-skill` |
| `description` | What the skill does | Brief + trigger conditions |
| `triggers` | Activation phrases | List of keywords/phrases |

---

## Manual Skill Reload

### Method 1: Direct Request

Just tell me:
```
"reload the research skill"
"refresh prompting skill"
"hot reload all skills"
```

### Method 2: Re-read File

I'll re-read the skill file:
```
Read ~/.claude/skills/[skill-name]/SKILL.md
```

This forces the skill content to be refreshed in context.

### Method 3: Touch Command

Force file modification timestamp:
```bash
touch ~/.claude/skills/[skill-name]/SKILL.md
```

---

## Listing Available Skills

### See All Skills

Request: "list all skills" or "what skills are available"

Response format:
```
Available Skills:
├── CORE (kai) - Personal AI Infrastructure core
├── research - Multi-agent research system
├── prompting - Prompt engineering best practices
├── observability - Grafana/metrics integration
├── model-routing - Intelligent model selection
├── mcp-integration - MCP auto-invocation rules
└── [other skills...]
```

### Check Skill Details

Request: "tell me about the [skill-name] skill"

Shows:
- Full description
- Trigger phrases
- When to use
- Key features

---

## Skill Validation

### Valid Skill Structure

```yaml
---
name: valid-skill       # Required: lowercase, hyphens OK
description: |          # Required: multi-line description
  What this skill does

  === WHEN TO USE ===
  - Condition 1

triggers:               # Required: list of strings
  - keyword1
  - keyword2
---
```

### Common Validation Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Missing `name` | No name field | Add `name: skill-name` |
| Missing `triggers` | No triggers list | Add `triggers:` with items |
| Invalid YAML | Syntax error | Check indentation, colons |
| Empty description | No content | Add meaningful description |

### Validation Command

```bash
# Check skill YAML syntax
bun ~/.claude/scripts/validate-skill.ts [skill-path]
```

---

## Creating New Skills

### Use create-skill Skill

Say: "create a new skill for [purpose]"

This activates the `create-skill` skill which:
1. Asks for skill purpose
2. Generates SKILL.md from template
3. Creates directory structure
4. Validates the result

### Manual Creation

```bash
# Create directory
mkdir -p ~/.claude/skills/my-new-skill

# Create SKILL.md with template
cat > ~/.claude/skills/my-new-skill/SKILL.md << 'EOF'
---
name: my-new-skill
description: |
  What this skill does

  === WHEN TO USE ===
  - When user needs X

triggers:
  - my trigger
  - another trigger
---

# My New Skill

[Skill content here]
EOF
```

---

## Troubleshooting

### Skill Not Triggering

1. **Check triggers match**: Exact phrase or close enough?
2. **Reload the skill**: "reload [skill-name]"
3. **Verify file exists**: `ls ~/.claude/skills/[name]/SKILL.md`
4. **Check YAML syntax**: Valid frontmatter?

### Skill Shows Old Content

1. **Force re-read**: "read the [skill] SKILL.md file"
2. **Clear context**: Start new conversation
3. **Check file saved**: Ensure edits were saved

### Skill Validation Fails

1. **Check YAML indentation**: Must use spaces, not tabs
2. **Verify required fields**: name, description, triggers
3. **Check for special characters**: Escape if needed

---

## Skill Lifecycle

```
┌─────────────┐
│   Create    │ ─── mkdir + SKILL.md
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Validate  │ ─── Check YAML structure
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Register  │ ─── Add to available skills
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Activate  │ ─── Trigger phrase matched
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Execute   │ ─── Load full content
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Update    │ ─── Edit SKILL.md
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Hot-Reload │ ─── Re-register without restart
└─────────────┘
```

---

## Integration with Other Skills

### Skill Discovery in Responses

When responding, I check available skills:
- If user request matches a skill trigger → Activate skill
- If no match → Use general knowledge + MCP servers

### Skill Chaining

Skills can reference other skills:
```markdown
## Related Skills
- Use `research` skill for deep investigation
- Use `prompting` skill for prompt optimization
```

### MCP + Skills

Skills define which MCPs to auto-invoke:
```yaml
mcp_integration:
  required:
    - context7  # For library docs
    - memory    # For cross-session context
```

---

## Best Practices

1. **Keep descriptions concise**: 200-500 tokens in frontmatter
2. **Use clear triggers**: Specific phrases > vague keywords
3. **Document when to use**: Help routing decisions
4. **Include examples**: Show expected inputs/outputs
5. **Test after editing**: Verify skill activates correctly
6. **Version control skills**: Git track ~/.claude/skills/
