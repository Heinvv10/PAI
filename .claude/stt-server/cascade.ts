/**
 * STT Cascade Tier Selection Logic
 *
 * 3-Tier Cost-Optimized Approach:
 * - Tier 1 (60%): Local whisper.cpp (FREE) - <5 min audio
 * - Tier 2 (35%): Groq Whisper ($0.04/hour) - 5-60 min audio
 * - Tier 3 (5%): Deepgram (real-time) - streaming only
 *
 * Target: 97% cost reduction vs OpenAI-only ($3/month vs $36/month for 100 hours)
 */

import { spawn } from 'child_process';
import { stat } from 'fs/promises';

interface TierSelection {
  tier: 1 | 2 | 3;
  reason: string;
  estimatedCost: number;
}

export async function selectTier(
  audioPath: string,
  options: {
    realtime?: boolean;
    maxCost?: number;
    preferLocal?: boolean;
  } = {}
): Promise<TierSelection> {
  // Get audio file metadata
  const stats = await stat(audioPath);
  const fileSizeMB = stats.size / (1024 * 1024);

  // Estimate duration using ffprobe
  const estimatedDuration = await estimateDuration(audioPath);

  console.log(`📊 Audio analysis:`);
  console.log(`   File size: ${fileSizeMB.toFixed(2)} MB`);
  console.log(`   Estimated duration: ${(estimatedDuration / 60).toFixed(1)} minutes`);

  // Rule 1: Real-time streaming → Tier 3 (Deepgram)
  if (options.realtime) {
    return {
      tier: 3,
      reason: 'Real-time streaming required',
      estimatedCost: (estimatedDuration / 3600) * 0.30, // Estimated Deepgram cost
    };
  }

  // Rule 2: Short audio (<5 min) → Tier 1 (Local whisper.cpp)
  // NOTE: Tier 1 not yet implemented, fallback to Tier 2
  if (estimatedDuration < 300 && options.preferLocal) {
    return {
      tier: 1,
      reason: 'Short audio (<5 min), using local whisper.cpp (FREE)',
      estimatedCost: 0.00,
    };
  }

  // Rule 3: Medium audio (5-60 min) → Tier 2 (Groq)
  if (estimatedDuration < 3600) {
    const cost = (estimatedDuration / 3600) * 0.04;
    return {
      tier: 2,
      reason: `Medium audio (${(estimatedDuration / 60).toFixed(1)} min), using Groq Whisper Turbo`,
      estimatedCost: cost,
    };
  }

  // Rule 4: Long audio (>60 min) → Check cost limit
  const groqCost = (estimatedDuration / 3600) * 0.04;

  if (options.maxCost && groqCost > options.maxCost) {
    return {
      tier: 1,
      reason: `Long audio (${(estimatedDuration / 60).toFixed(0)} min), cost limit exceeded ($${groqCost.toFixed(2)} > $${options.maxCost}), using local`,
      estimatedCost: 0.00,
    };
  }

  // Default: Tier 2 (Groq) for long audio
  return {
    tier: 2,
    reason: `Long audio (${(estimatedDuration / 60).toFixed(0)} min), using Groq Whisper Turbo`,
    estimatedCost: groqCost,
  };
}

async function estimateDuration(audioPath: string): Promise<number> {
  // Use ffprobe to get precise audio duration
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      audioPath,
    ]);

    let output = '';
    let errorOutput = '';

    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code === 0) {
        const duration = parseFloat(output.trim());
        if (isNaN(duration)) {
          // Fallback: estimate from file size (rough approximation)
          // Assume ~1MB per minute for compressed audio
          const stats = require('fs').statSync(audioPath);
          const estimatedDuration = (stats.size / (1024 * 1024)) * 60;
          console.warn(`⚠️  ffprobe failed to parse duration, estimating from file size: ${estimatedDuration.toFixed(0)}s`);
          resolve(estimatedDuration);
        } else {
          resolve(duration);
        }
      } else {
        // Fallback if ffprobe not available
        console.warn(`⚠️  ffprobe not available (code ${code}), estimating duration from file size`);
        const stats = require('fs').statSync(audioPath);
        const estimatedDuration = (stats.size / (1024 * 1024)) * 60; // 1MB ≈ 1min
        resolve(estimatedDuration);
      }
    });

    ffprobe.on('error', (error) => {
      console.warn(`⚠️  ffprobe error: ${error.message}, estimating from file size`);
      const stats = require('fs').statSync(audioPath);
      const estimatedDuration = (stats.size / (1024 * 1024)) * 60;
      resolve(estimatedDuration);
    });
  });
}
