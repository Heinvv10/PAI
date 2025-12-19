/**
 * Auto-Transcription Hook for Audio Files
 *
 * Automatically transcribes audio files when attached to Claude Code prompts
 * Triggers: File attachment with audio extensions (.mp3, .wav, .m4a, etc.)
 */

import { readFileSync } from 'fs';

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.webm', '.aac', '.opus'];
const STT_SERVER_URL = 'http://localhost:8889';

export async function onFileAttach(filePath: string, filename: string): Promise<void> {
  // Check if file is audio
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));

  if (!AUDIO_EXTENSIONS.includes(ext)) {
    return; // Not an audio file, skip
  }

  console.log(`🎙️ Audio file detected: ${filename}`);

  try {
    // Check if STT server is running
    const healthCheck = await fetch(`${STT_SERVER_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });

    if (!healthCheck.ok) {
      console.log(`⚠️  STT server not healthy, skipping transcription`);
      return;
    }

    console.log(`📤 Sending to STT server for transcription...`);

    // Read audio file
    const audioBuffer = readFileSync(filePath);

    // Send to STT server
    const response = await fetch(`${STT_SERVER_URL}/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Filename': filename,
      },
      body: audioBuffer,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`❌ Transcription failed: ${errorData.message}`);
      return;
    }

    const result = await response.json();

    // Display transcript to user
    console.log(``);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🎙️ AUDIO TRANSCRIPTION`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(``);
    console.log(`📄 File: ${filename}`);
    console.log(`⏱️  Duration: ${result.duration.toFixed(1)}s`);
    console.log(`🌍 Language: ${result.language}`);
    console.log(`💰 Cost: $${result.cost.toFixed(4)}`);
    console.log(`🎯 Tier: ${result.tier_used} (${result.tier_reason})`);
    console.log(`📊 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(``);
    console.log(`📝 Transcript:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(result.transcript);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(``);

  } catch (error: any) {
    if (error.name === 'TimeoutError' || error.code === 'ECONNREFUSED') {
      console.log(`⚠️  STT server not running on port 8889`);
      console.log(`   Start with: cd ~/.claude/stt-server && ./start.sh`);
    } else {
      console.error(`❌ Transcription error: ${error.message}`);
    }
  }
}
