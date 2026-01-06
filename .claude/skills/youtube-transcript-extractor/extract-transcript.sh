#!/usr/bin/env bash
# YouTube Transcript Extractor - Shell Wrapper
# Usage: ./extract-transcript.sh VIDEO_ID [OUTPUT_FILE]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VIDEO_ID="$1"
OUTPUT_FILE="${2:-}"

if [ -z "$VIDEO_ID" ]; then
    echo "Usage: $0 VIDEO_ID [OUTPUT_FILE]"
    echo "Example: $0 VqDs46A8pqE transcript.txt"
    exit 1
fi

# Extract video ID from URL if full URL provided
if [[ "$VIDEO_ID" == *"youtube.com"* ]] || [[ "$VIDEO_ID" == *"youtu.be"* ]]; then
    # Extract ID from various YouTube URL formats
    VIDEO_ID=$(echo "$VIDEO_ID" | sed -E 's/.*[?&]v=([^&]+).*/\1/' | sed -E 's/.*youtu\.be\/([^?]+).*/\1/')
fi

# Check if youtube-transcript-api is installed
if ! python3 -c "import youtube_transcript_api" 2>/dev/null; then
    echo "Installing youtube-transcript-api..."
    pip install youtube-transcript-api
fi

# Create temporary Python script
TEMP_SCRIPT=$(mktemp)
cat > "$TEMP_SCRIPT" << 'PYTHON_SCRIPT'
import sys
from youtube_transcript_api import YouTubeTranscriptApi

video_id = sys.argv[1]

try:
    api = YouTubeTranscriptApi()
    transcript_list = api.list(video_id)

    # Try manual transcript first, fallback to auto-generated
    try:
        transcript = transcript_list.find_manually_created_transcript(['en'])
        print(f"Found manually created transcript", file=sys.stderr)
    except:
        transcript = transcript_list.find_generated_transcript(['en'])
        print(f"Found auto-generated transcript", file=sys.stderr)

    transcript_data = transcript.fetch()
    print(f"Successfully extracted {len(transcript_data)} segments", file=sys.stderr)
    print(f"Language: {transcript.language_code}\n", file=sys.stderr)

    # Output transcript
    for entry in transcript_data:
        start_time = entry.start
        text = entry.text

        minutes = int(start_time // 60)
        seconds = int(start_time % 60)
        timestamp = f"{minutes}:{seconds:02d}"

        print(f"[{timestamp}] {text}")

except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
    sys.exit(1)
PYTHON_SCRIPT

# Run extraction
if [ -n "$OUTPUT_FILE" ]; then
    python3 "$TEMP_SCRIPT" "$VIDEO_ID" > "$OUTPUT_FILE" 2>&1
    echo "Transcript saved to: $OUTPUT_FILE"
else
    python3 "$TEMP_SCRIPT" "$VIDEO_ID"
fi

# Cleanup
rm -f "$TEMP_SCRIPT"
