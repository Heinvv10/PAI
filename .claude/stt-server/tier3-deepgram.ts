/**
 * Tier 3: Deepgram Nova-3 Real-Time Streaming
 *
 * Cost: $0.0077/min ($0.46/hour)
 * Latency: <300ms
 * Use case: Live voice input, real-time transcription
 */

import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";

interface DeepgramStreamConfig {
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  language?: string;
  model?: string;
}

export class DeepgramStreamClient {
  private client: any;
  private connection: any;
  private apiKey: string;
  private isConnected: boolean = false;
  private totalDuration: number = 0;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = createClient(apiKey);
  }

  /**
   * Start streaming connection
   */
  async startStream(config: DeepgramStreamConfig = {}): Promise<void> {
    const {
      onTranscript,
      onError,
      onClose,
      language = "en",
      model = "nova-3",
    } = config;

    try {
      // Create live transcription connection
      // Note: WebM/Opus encoding - Deepgram will auto-detect format
      this.connection = this.client.listen.live({
        model: model,
        language: language,
        smart_format: true,
        interim_results: true,
        utterance_end_ms: 1000,
        vad_events: true,
        // Don't specify encoding - let Deepgram auto-detect WebM/Opus
        // encoding: "linear16",  // Only for raw PCM
        // sample_rate: 16000,    // Only for raw PCM
      });

      // Handle connection open
      this.connection.on(LiveTranscriptionEvents.Open, () => {
        console.log("🎙️ Deepgram connection opened");
        this.isConnected = true;
      });

      // Handle transcript results
      this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
        const transcript = data.channel?.alternatives?.[0]?.transcript;
        const isFinal = data.is_final;

        if (transcript && transcript.length > 0) {
          onTranscript?.(transcript, isFinal);
        }
      });

      // Handle errors
      this.connection.on(LiveTranscriptionEvents.Error, (error: Error) => {
        console.error("❌ Deepgram error:", error);
        onError?.(error);
      });

      // Handle close
      this.connection.on(LiveTranscriptionEvents.Close, () => {
        console.log("🔌 Deepgram connection closed");
        this.isConnected = false;
        onClose?.();
      });

      // Handle metadata (for duration tracking)
      this.connection.on(LiveTranscriptionEvents.Metadata, (metadata: any) => {
        if (metadata.duration) {
          this.totalDuration = metadata.duration;
        }
      });

    } catch (error) {
      console.error("❌ Failed to start Deepgram stream:", error);
      throw error;
    }
  }

  /**
   * Send audio chunk to Deepgram
   */
  sendAudio(audioChunk: Buffer): void {
    if (!this.isConnected || !this.connection) {
      throw new Error("Deepgram connection not established");
    }

    this.connection.send(audioChunk);
  }

  /**
   * Close the streaming connection
   */
  async close(): Promise<void> {
    if (this.connection) {
      this.connection.finish();
      this.isConnected = false;
    }
  }

  /**
   * Get total duration and cost
   */
  getCost(): { duration: number; cost: number } {
    const costPerMinute = 0.0077;
    const durationMinutes = this.totalDuration / 60;
    const cost = durationMinutes * costPerMinute;

    return {
      duration: this.totalDuration,
      cost: cost,
    };
  }

  /**
   * Check if streaming is active
   */
  isStreaming(): boolean {
    return this.isConnected;
  }
}

/**
 * Simple streaming transcription (for testing)
 */
export async function transcribeStreamWithDeepgram(
  audioStream: AsyncIterable<Buffer>,
  options: {
    language?: string;
    model?: string;
  } = {}
): Promise<{
  transcript: string;
  duration: number;
  cost: number;
  language: string;
  confidence: number;
}> {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey) {
    throw new Error("DEEPGRAM_API_KEY not configured");
  }

  const client = new DeepgramStreamClient(apiKey);
  let fullTranscript = "";
  let maxConfidence = 0;

  await client.startStream({
    onTranscript: (transcript, isFinal) => {
      if (isFinal) {
        fullTranscript += transcript + " ";
      }
    },
    onError: (error) => {
      console.error("Stream error:", error);
    },
    language: options.language || "en",
    model: options.model || "nova-3",
  });

  // Send audio chunks
  for await (const chunk of audioStream) {
    client.sendAudio(chunk);
  }

  // Close connection
  await client.close();

  // Get cost info
  const costInfo = client.getCost();

  return {
    transcript: fullTranscript.trim(),
    duration: costInfo.duration,
    cost: costInfo.cost,
    language: options.language || "en",
    confidence: maxConfidence > 0 ? maxConfidence : 0.95, // Estimated
  };
}
