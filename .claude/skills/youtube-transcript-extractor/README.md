# YouTube Transcript Extractor

**Extract complete transcripts from YouTube videos with timestamps**

## Quick Start

### Using Python Script Directly
```bash
cd ~/.claude/skills/youtube-transcript-extractor
python extract.py
```

### Using PowerShell Wrapper (Windows)
```powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.claude\skills\youtube-transcript-extractor\extract-transcript.ps1" -VideoId "VIDEO_ID"
```

### Using Shell Wrapper (Linux/macOS)
```bash
~/.claude/skills/youtube-transcript-extractor/extract-transcript.sh VIDEO_ID
```

## Usage Examples

### Example 1: Extract to Console
```bash
python extract.py
# Extracts hardcoded video ID: VqDs46A8pqE
```

### Example 2: Extract with PowerShell
```powershell
# Extract and display
.\extract-transcript.ps1 -VideoId "VqDs46A8pqE"

# Extract and save to file
.\extract-transcript.ps1 -VideoId "VqDs46A8pqE" -OutputFile "transcript.txt"
```

### Example 3: Extract from URL
```bash
# The wrappers accept full URLs and extract the video ID
./extract-transcript.sh "https://www.youtube.com/watch?v=VqDs46A8pqE"
```

## Features

- ✅ Auto-generated and manual captions
- ✅ Timestamp formatting (MM:SS)
- ✅ Multi-language support (defaults to English)
- ✅ No API key required
- ✅ Cross-platform (Windows/Linux/macOS)
- ✅ 640+ segment videos tested

## Requirements

**Python 3.8+** with the following package:
```bash
pip install youtube-transcript-api
```

The wrappers will automatically install this package if missing.

## Files

```
youtube-transcript-extractor/
├── skill.md                  # Skill documentation (for Claude)
├── README.md                 # This file
├── icon.png                  # 256x256 skill icon
├── extract.py               # Core Python extraction script
├── extract-transcript.ps1   # PowerShell wrapper (Windows)
└── extract-transcript.sh    # Shell wrapper (Linux/macOS)
```

## Output Format

```
Fetching transcript for video: VqDs46A8pqE
================================================================================

Found auto-generated transcript
Successfully extracted 640 segments
Language: en

================================================================================

TRANSCRIPT:

[0:00] It's 7:30 in the morning and you're a
[0:02] hotshot agentic engineer getting ahead
[0:04] on the new year. You crack open your
...
[22:20] keep building.
```

## Integration with BOSS Ghost

This skill complements BOSS Ghost MCP:

1. **BOSS Ghost** → Visual analysis (screenshots, UI inspection)
2. **This Skill** → Transcript extraction (audio content)
3. **Combined** → Complete video understanding

### Example Workflow
```
1. Navigate to YouTube video with BOSS Ghost
2. Extract transcript with this skill
3. Analyze both visual and textual content
4. Generate comprehensive video summary
```

## Customization

### Change Default Video ID

Edit `extract.py` line 10:
```python
video_id = 'YOUR_VIDEO_ID_HERE'
```

### Change Language

Edit the language code in wrappers:
```python
# For Spanish
transcript_list.find_generated_transcript(['es'])

# For French
transcript_list.find_generated_transcript(['fr'])
```

### Add Multiple Languages

```python
# Try English, then Spanish, then French
for lang in ['en', 'es', 'fr']:
    try:
        transcript = transcript_list.find_generated_transcript([lang])
        break
    except:
        continue
```

## Troubleshooting

### No Captions Found
- Video may not have captions enabled
- Try different language codes
- Check if video is public

### Import Error
```bash
pip install youtube-transcript-api
# or
python -m pip install youtube-transcript-api
```

### Unicode Errors (Windows)
- Use PowerShell wrapper instead of direct Python
- Or redirect output to file: `python extract.py > transcript.txt 2>&1`

## Version History

- **1.0.0** (2026-01-06) - Initial release
  - Core extraction functionality
  - PowerShell and shell wrappers
  - 256x256 PNG icon
  - Tested with 640+ segment videos

## Credits

- **youtube-transcript-api** - Reliable Python library for transcript extraction
- **PAI System** - Skill framework and integration
- **BOSS Ghost MCP** - Complementary visual analysis

## License

Part of the Personal AI Infrastructure (PAI) system.

---

**Created**: 2026-01-06
**Maintainer**: PAI System
**Category**: Content Extraction, Media Processing
