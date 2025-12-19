/**
 * Audio Processing Utilities
 *
 * FFmpeg-based audio format conversion and preprocessing
 */

import { spawn } from 'child_process';
import { unlink } from 'fs/promises';

export interface AudioMetadata {
  duration: number;    // seconds
  format: string;      // mp3, wav, m4a, etc.
  sampleRate: number;  // Hz
  channels: number;    // 1=mono, 2=stereo
  bitrate: number;     // bps
  size: number;        // bytes
}

/**
 * Convert audio file to WAV format (required for whisper.cpp)
 */
export async function convertToWav(
  inputPath: string,
  outputPath: string = '/tmp/converted.wav'
): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`🔄 Converting ${inputPath} to WAV format...`);

    const ffmpeg = spawn('ffmpeg', [
      '-i', inputPath,
      '-ar', '16000',      // 16kHz sample rate (whisper.cpp requirement)
      '-ac', '1',          // Mono
      '-f', 'wav',         // WAV format
      '-y',                // Overwrite output file
      outputPath,
    ]);

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Converted to WAV: ${outputPath}`);
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg conversion failed (code ${code}): ${stderr}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg error: ${error.message}`));
    });
  });
}

/**
 * Get audio file metadata using ffprobe
 */
export async function getAudioMetadata(audioPath: string): Promise<AudioMetadata> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      audioPath,
    ]);

    let stdout = '';
    let stderr = '';

    ffprobe.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code === 0) {
        try {
          const data = JSON.parse(stdout);
          const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio');

          if (!audioStream) {
            reject(new Error('No audio stream found in file'));
            return;
          }

          const metadata: AudioMetadata = {
            duration: parseFloat(data.format?.duration || '0'),
            format: data.format?.format_name || 'unknown',
            sampleRate: parseInt(audioStream.sample_rate || '0'),
            channels: parseInt(audioStream.channels || '0'),
            bitrate: parseInt(data.format?.bit_rate || '0'),
            size: parseInt(data.format?.size || '0'),
          };

          resolve(metadata);
        } catch (error: any) {
          reject(new Error(`Failed to parse ffprobe output: ${error.message}`));
        }
      } else {
        reject(new Error(`ffprobe failed (code ${code}): ${stderr}`));
      }
    });

    ffprobe.on('error', (error) => {
      reject(new Error(`ffprobe error: ${error.message}`));
    });
  });
}

/**
 * Split large audio file into chunks (for >25MB files)
 */
export async function splitAudioFile(
  inputPath: string,
  segmentDuration: number = 600  // 10 minutes
): Promise<string[]> {
  const outputPattern = `/tmp/segment_%03d.mp3`;

  return new Promise((resolve, reject) => {
    console.log(`✂️  Splitting audio into ${segmentDuration}s segments...`);

    const ffmpeg = spawn('ffmpeg', [
      '-i', inputPath,
      '-f', 'segment',
      '-segment_time', segmentDuration.toString(),
      '-c', 'copy',
      '-y',
      outputPattern,
    ]);

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        // Parse segment filenames from stderr
        const segmentFiles: string[] = [];
        const segmentRegex = /segment_(\d+)\.mp3/g;
        let match;

        while ((match = segmentRegex.exec(stderr)) !== null) {
          segmentFiles.push(`/tmp/segment_${match[1]}.mp3`);
        }

        console.log(`✅ Split into ${segmentFiles.length} segments`);
        resolve(segmentFiles);
      } else {
        reject(new Error(`FFmpeg split failed (code ${code}): ${stderr}`));
      }
    });

    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg error: ${error.message}`));
    });
  });
}

/**
 * Clean up temporary audio files
 */
export async function cleanupTempFiles(files: string[]): Promise<void> {
  for (const file of files) {
    try {
      await unlink(file);
      console.log(`🗑️  Deleted temp file: ${file}`);
    } catch (error: any) {
      console.warn(`⚠️  Failed to delete ${file}: ${error.message}`);
    }
  }
}
