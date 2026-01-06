#!/usr/bin/env python3
"""
YouTube Transcript Extractor using youtube-transcript-api
Most reliable method according to 2026 research
"""

try:
    from youtube_transcript_api import YouTubeTranscriptApi

    video_id = 'VqDs46A8pqE'

    print(f"Fetching transcript for video: {video_id}")
    print("=" * 80)

    # Create instance and get transcript list
    api = YouTubeTranscriptApi()
    transcript_list = api.list(video_id)

    # Try to get manually created transcript first, fallback to auto-generated
    try:
        transcript = transcript_list.find_manually_created_transcript(['en'])
        print("\nFound manually created transcript")
    except:
        transcript = transcript_list.find_generated_transcript(['en'])
        print("\nFound auto-generated transcript")

    # Fetch the actual transcript data
    transcript_data = transcript.fetch()

    print(f"Successfully extracted {len(transcript_data)} segments")
    print(f"Language: {transcript.language_code}\n")
    print("=" * 80)
    print("\nTRANSCRIPT:\n")

    # Format and print transcript
    for entry in transcript_data:
        start_time = entry.start
        text = entry.text

        # Convert to MM:SS format
        minutes = int(start_time // 60)
        seconds = int(start_time % 60)
        timestamp = f"{minutes}:{seconds:02d}"

        print(f"[{timestamp}] {text}")

except ImportError:
    print("ERROR: youtube-transcript-api not installed")
    print("\nTo install, run:")
    print("  pip install youtube-transcript-api")

except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
