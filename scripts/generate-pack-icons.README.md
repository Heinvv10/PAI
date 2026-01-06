# Pack Icon Generator

Automated generation of 256x256 PNG icons for all PAI packs.

## Features

- **256x256 PNG icons** - Standard pack icon size
- **Gradient backgrounds** - Beautiful color gradients per pack
- **Emoji symbols** - Unique emoji for each pack
- **Rounded corners** - Modern design with 40px radius
- **Shine effect** - Subtle lighting for depth
- **Text shadows** - Enhanced readability
- **Consistent branding** - Cohesive visual identity

## Generated Icons

✅ **41 icons generated** for all packs:

- agent-observability (📊) - Dashboard and monitoring
- alex-hormozi-pitch (💰) - Offer creation
- apex-ui (🎨) - UI components
- apex-ui-ux (✨) - UX design
- async-orchestration (🔄) - Parallel agents
- auto (🤖) - Autonomous coding
- boss-ui-ux (👔) - Business UI/UX
- claude-agent-sdk (🧩) - Agent building
- content-scanner (🔍) - Content analysis
- CORE (⚡) - PAI core system
- create-skill (🏗️) - Skill creation
- docx (📄) - Word documents
- example-skill (📝) - Template skill
- fabric (🧵) - Fabric CLI integration
- ffuf (🔐) - Web fuzzing
- input-leap-manager (⌨️) - Input management
- kai (🌟) - Core orchestration
- mcp-builder (🔨) - MCP server creation
- mcp-troubleshooter (🔧) - MCP debugging
- meta-prompting (🎯) - Prompt engineering
- mt5-trading (📈) - Trading automation
- pai-diagnostics (🩺) - System diagnostics
- pdf (📕) - PDF processing
- pptx (📊) - PowerPoint creation
- proactive-scanner (👁️) - Code scanning
- project-codebase (📦) - Codebase analysis
- prompt-enhancement (✍️) - Prompt improvement
- prompting (💬) - Prompt management
- python-agent-patterns (🐍) - Python agents
- ref-tools (🔗) - Reference tools
- research (🔬) - Research agents
- session-persistence (💾) - Session storage
- skill-creator-anthropic (🎨) - Anthropic skill creation
- typescript-architectural-fixer (🏗️) - TS architecture
- typescript-error-fixer (🔧) - TS error fixing
- upgrade (⬆️) - System upgrades
- validation (✅) - Validation tools
- veritas (⚖️) - Truth enforcement
- webapp-testing (🧪) - Web testing
- xlsx (📊) - Excel processing

## Usage

### Generate All Icons

```bash
bun run scripts/generate-pack-icons.ts
```

### Regenerate Specific Pack

```bash
# Delete the icon first
rm ~/.claude/skills/pack-name/icon.png

# Regenerate all (will skip existing)
bun run scripts/generate-pack-icons.ts
```

## Icon Specifications

- **Format**: PNG (RGBA)
- **Size**: 256 x 256 pixels
- **File Size**: 15-26 KB per icon
- **Design**: Gradient background with emoji symbol
- **Border Radius**: 40px (rounded corners)
- **Color Scheme**: Unique per pack (primary + secondary gradient)

## Adding New Packs

To add an icon for a new pack:

1. **Edit `scripts/generate-pack-icons.ts`**
2. **Add entry to `PACK_ICONS` object**:

```typescript
const PACK_ICONS: Record<string, PackIcon> = {
  'new-pack-name': {
    emoji: '🎯',
    primaryColor: '#4F46E5',
    secondaryColor: '#818CF8',
  },
  // ... rest
};
```

3. **Run generator**:

```bash
bun run scripts/generate-pack-icons.ts
```

## Color Palette Reference

### Blue Spectrum
- `#2563EB` → `#60A5FA` (Primary Blue)
- `#0891B2` → `#22D3EE` (Cyan)
- `#4F46E5` → `#818CF8` (Indigo)

### Purple Spectrum
- `#7C3AED` → `#A78BFA` (Purple)
- `#8B5CF6` → `#C4B5FD` (Violet)

### Green Spectrum
- `#059669` → `#34D399` (Emerald)
- `#0D9488` → `#5EEAD4` (Teal)

### Red Spectrum
- `#DC2626` → `#F87171` (Red)
- `#DB2777` → `#F9A8D4` (Pink)

### Orange/Yellow Spectrum
- `#F59E0B` → `#FCD34D` (Amber)
- `#EAB308` → `#FDE047` (Yellow)
- `#EA580C` → `#FDBA74` (Orange)

### Neutral
- `#6B7280` → `#D1D5DB` (Gray)

## Technical Details

### Canvas API

Uses Node.js `canvas` package (compatible with Bun):

```bash
bun add canvas
```

### Icon Generation Process

1. **Create canvas** (256x256)
2. **Draw gradient background** (primary → secondary color)
3. **Draw rounded rectangle** (40px border radius)
4. **Add shine effect** (white gradient overlay)
5. **Render emoji** (120px font, centered)
6. **Add text shadow** (depth effect)
7. **Draw border** (subtle white outline)
8. **Export PNG** (RGBA format)

### Fallback Colors

For packs without explicit configuration, the generator creates a deterministic color scheme based on the pack name hash:

```typescript
// Hash pack name to generate consistent HSL color
let hash = 0;
for (let i = 0; i < packName.length; i++) {
  hash = packName.charCodeAt(i) + ((hash << 5) - hash);
}

const hue = Math.abs(hash % 360);
const primaryColor = `hsl(${hue}, 65%, 50%)`;
const secondaryColor = `hsl(${hue}, 65%, 70%)`;
```

## Icon Locations

All icons are stored in their respective pack directories:

```
~/.claude/skills/
  ├── agent-observability/
  │   └── icon.png (256x256)
  ├── kai/
  │   └── icon.png (256x256)
  └── [other packs...]
```

## Pack v2.0 Compliance

Icons fulfill the Pack v2.0 specification requirement:

> Each pack MUST include a 256x256 PNG icon for visual identification

✅ All 41 packs now have compliant icons.

---

**Generator**: `scripts/generate-pack-icons.ts`
**Canvas Library**: Node.js Canvas API (v3.2.0)
**Total Icons**: 41
**Average File Size**: ~20 KB
**Generation Time**: ~3 seconds
