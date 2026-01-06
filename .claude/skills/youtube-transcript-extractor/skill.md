# YouTube Transcript Extractor Skill

**Reliable YouTube transcript extraction using youtube-transcript-api**

## Overview

Extract complete transcripts from YouTube videos with timestamps. Uses the `youtube-transcript-api` Python library (most reliable 2026 method) to fetch auto-generated or manually created captions.

## Capabilities

- Extract full video transcripts with timestamps
- Support for both auto-generated and manual captions
- Multi-language support (defaults to English)
- Clean formatted output with MM:SS timestamps
- Save transcripts to file or return inline

## Use Cases

- Content analysis and research
- Video summarization
- Quote extraction
- Accessibility improvements
- Documentation from video tutorials
- SEO content generation

## Usage

### Quick Extraction

```
Extract the transcript from: https://www.youtube.com/watch?v=VIDEO_ID
```

### Save to File

```
Extract transcript from https://www.youtube.com/watch?v=VIDEO_ID and save to transcript.txt
```

### Analysis Workflow

```
1. Extract transcript from [video URL]
2. Summarize the key points
3. Create bullet-point notes
```

## Requirements

- Python 3.8+
- youtube-transcript-api package (auto-installed if missing)

## Output Format

```
[0:00] Video starts with introduction
[0:15] Speaker explains main concept
[1:30] Key point about implementation
...
```

## Technical Details

### Method
- Uses YouTube's internal timedtext API
- No API key required
- No headless browser needed
- Works with auto-generated captions

### Reliability
- Tested with 640+ segment videos
- Handles emoji and special characters
- Cross-platform (Windows/Linux/macOS)

### Error Handling
- Checks for transcript availability
- Tries manual captions first, falls back to auto-generated
- Clear error messages for missing captions

## Integration with BOSS Ghost

This skill complements BOSS Ghost MCP for comprehensive video analysis:

1. **Use BOSS Ghost** for visual analysis (screenshots, UI elements)
2. **Use this skill** for transcript extraction
3. **Combine both** for full video understanding (visual + audio content)

## Examples

### Example 1: Quick Extract
```
Input: Extract transcript from https://www.youtube.com/watch?v=VqDs46A8pqE

Output:
Fetching transcript for video: VqDs46A8pqE
Found auto-generated transcript
Successfully extracted 640 segments

[0:00] It's 7:30 in the morning...
[0:15] You crack open your terminal...
...
```

### Example 2: Analysis
```
Input: Get transcript from [URL] and summarize the main topics

Process:
1. Extract transcript
2. Parse content by timestamp sections
3. Identify key topics and themes
4. Generate summary
```

## Version

- **Version**: 1.0.0
- **Created**: 2026-01-06
- **Last Updated**: 2026-01-06
- **Maintainer**: PAI System

## Notes

- First extraction may require pip install (automatic)
- Works with public YouTube videos with captions
- Private/restricted videos may not work
- Live streams require special handling (not yet supported)

## Related Skills

- BOSS Ghost MCP - Visual browser automation
- Chrome DevTools - Browser control and inspection
- Content analysis - Text processing and summarization

---

**Trigger Keywords**: youtube, transcript, captions, video extraction, youtube-transcript

**Category**: Content Extraction, Media Processing, Research Tools
