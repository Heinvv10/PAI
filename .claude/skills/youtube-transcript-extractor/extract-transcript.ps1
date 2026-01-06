# YouTube Transcript Extractor - PowerShell Wrapper
# Usage: .\extract-transcript.ps1 -VideoId "VIDEO_ID" [-OutputFile "transcript.txt"]

param(
    [Parameter(Mandatory=$true)]
    [string]$VideoId,

    [Parameter(Mandatory=$false)]
    [string]$OutputFile = ""
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Extract video ID from URL if full URL provided
if ($VideoId -match "youtube\.com|youtu\.be") {
    if ($VideoId -match "[?&]v=([^&]+)") {
        $VideoId = $Matches[1]
    } elseif ($VideoId -match "youtu\.be/([^?]+)") {
        $VideoId = $Matches[1]
    }
}

Write-Host "Extracting transcript for video: $VideoId" -ForegroundColor Cyan

# Check if youtube-transcript-api is installed
$pipList = python -m pip list 2>&1 | Out-String
if ($pipList -notmatch "youtube-transcript-api") {
    Write-Host "Installing youtube-transcript-api..." -ForegroundColor Yellow
    python -m pip install youtube-transcript-api | Out-Null
}

# Create temporary Python script
$TempScript = [System.IO.Path]::GetTempFileName() + ".py"
@'
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
    print(f"Language: {transcript.language_code}", file=sys.stderr)
    print("=" * 80, file=sys.stderr)

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
    import traceback
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)
'@ | Out-File -FilePath $TempScript -Encoding UTF8

try {
    # Run extraction
    if ($OutputFile) {
        python $TempScript $VideoId > $OutputFile 2>&1
        Write-Host "`nTranscript saved to: $OutputFile" -ForegroundColor Green
    } else {
        python $TempScript $VideoId
    }
} finally {
    # Cleanup
    Remove-Item $TempScript -ErrorAction SilentlyContinue
}
