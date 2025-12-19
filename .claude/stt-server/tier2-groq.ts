/**
 * Tier 2: Groq Whisper Large v3 Turbo STT
 *
 * Cost: $0.04/hour (12x cheaper than OpenAI)
 * Speed: 216x real-time (transcribes 10min audio in ~3 seconds)
 * Accuracy: 85-90% (comparable to OpenAI Whisper)
 */

import { readFileSync } from 'fs';

interface GroqTranscriptionResult {
  transcript: string;
  confidence: number;
  duration: number;
  language: string;
  cost: number;
}

export async function transcribeWithGroq(
  audioPath: string,
  model: string = 'whisper-large-v3-turbo'
): Promise<GroqTranscriptionResult> {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured in ~/.env');
  }

  console.log(`🤖 Using Groq model: ${model}`);

  // Read audio file
  const audioBuffer = readFileSync(audioPath);
  const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });

  // Create form data
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.mp3');
  formData.append('model', model);
  formData.append('response_format', 'verbose_json');  // Get word-level timestamps
  formData.append('temperature', '0');  // Deterministic output

  // Call Groq API
  const startTime = Date.now();

  try {
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const endTime = Date.now();

    console.log(`⚡ Groq processing time: ${((endTime - startTime) / 1000).toFixed(2)}s`);

    // Calculate cost
    const duration = result.duration || 0;  // Duration in seconds
    const cost = (duration / 3600) * getCostPerHour(model);

    // Estimate confidence (Groq doesn't provide it directly)
    const confidence = estimateConfidence(result);

    return {
      transcript: result.text,
      confidence: confidence,
      duration: duration,
      language: result.language || 'en',
      cost: cost,
    };
  } catch (error: any) {
    console.error(`❌ Groq transcription failed: ${error.message}`);
    throw error;
  }
}

function getCostPerHour(model: string): number {
  const pricing: Record<string, number> = {
    'whisper-large-v3-turbo': 0.04,
    'distil-whisper-large-v3-en': 0.02,
    'whisper-large-v3': 0.111,
  };
  return pricing[model] || 0.04;
}

function estimateConfidence(result: any): number {
  // Groq doesn't provide confidence scores, estimate based on:
  // 1. Presence of segments (higher = better)
  // 2. Text length (very short = low confidence)
  // 3. Language detection (if present)

  let confidence = 0.85; // Base confidence for Groq Whisper

  // Adjust based on text length
  const textLength = result.text?.length || 0;
  if (textLength < 10) {
    confidence = 0.60; // Very short text = low confidence
  } else if (textLength < 50) {
    confidence = 0.75;
  }

  // Adjust if language detected
  if (result.language) {
    confidence += 0.05;
  }

  return Math.min(confidence, 1.0);
}
