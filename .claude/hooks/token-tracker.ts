#!/usr/bin/env bun
/**
 * Token Usage Tracker Hook
 *
 * Tracks token usage and estimates costs per session.
 * Stores metrics in a local file and optionally sends to Veritas.
 *
 * Runs on: PostToolUse
 */

interface HookInput {
  session_id: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_result?: string;
  transcript_path?: string;
}

interface TokenMetrics {
  session_id: string;
  timestamp: string;
  tool_name: string;
  estimated_input_tokens: number;
  estimated_output_tokens: number;
  estimated_cost_usd: number;
  cumulative_tokens: number;
  cumulative_cost_usd: number;
}

interface SessionMetrics {
  session_id: string;
  started_at: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  tool_calls: number;
  tools_used: Record<string, number>;
}

// Model pricing per 1M tokens (as of 2025)
const MODEL_PRICING = {
  'claude-3-5-sonnet': { input: 3.0, output: 15.0 },
  'claude-3-5-haiku': { input: 0.25, output: 1.25 },
  'claude-3-opus': { input: 15.0, output: 75.0 },
  'claude-3-sonnet': { input: 3.0, output: 15.0 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'claude-opus-4': { input: 15.0, output: 75.0 },
  'claude-sonnet-4': { input: 3.0, output: 15.0 },
  default: { input: 3.0, output: 15.0 }, // Assume Sonnet pricing
};

const METRICS_FILE = process.env.PAI_DIR
  ? `${process.env.PAI_DIR}/metrics/token-usage.json`
  : `${process.env.HOME || process.env.USERPROFILE}/.claude/metrics/token-usage.json`;

/**
 * Estimate tokens from text (rough approximation: ~4 chars per token)
 */
function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Calculate cost based on tokens and model
 */
function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: string = 'default'
): number {
  const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING] || MODEL_PRICING.default;
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

/**
 * Load existing session metrics
 */
async function loadSessionMetrics(sessionId: string): Promise<SessionMetrics> {
  try {
    const file = Bun.file(METRICS_FILE);
    if (await file.exists()) {
      const data = await file.json();
      if (data.sessions && data.sessions[sessionId]) {
        return data.sessions[sessionId];
      }
    }
  } catch {
    // File doesn't exist or is invalid
  }

  return {
    session_id: sessionId,
    started_at: new Date().toISOString(),
    total_input_tokens: 0,
    total_output_tokens: 0,
    total_cost_usd: 0,
    tool_calls: 0,
    tools_used: {},
  };
}

/**
 * Save session metrics
 */
async function saveSessionMetrics(metrics: SessionMetrics): Promise<void> {
  try {
    // Ensure directory exists
    const dir = METRICS_FILE.substring(0, METRICS_FILE.lastIndexOf('/'));
    await Bun.write(`${dir}/.gitkeep`, '');

    let data: { sessions: Record<string, SessionMetrics>; history: TokenMetrics[] } = {
      sessions: {},
      history: [],
    };

    try {
      const file = Bun.file(METRICS_FILE);
      if (await file.exists()) {
        data = await file.json();
      }
    } catch {
      // Start fresh
    }

    data.sessions[metrics.session_id] = metrics;

    // Keep only last 7 days of sessions
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    for (const [id, session] of Object.entries(data.sessions)) {
      if (new Date(session.started_at).getTime() < cutoff) {
        delete data.sessions[id];
      }
    }

    await Bun.write(METRICS_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('[TokenTracker] Failed to save metrics:', error);
  }
}

/**
 * Send metrics to Veritas (if running)
 */
async function sendToVeritas(metrics: TokenMetrics): Promise<void> {
  try {
    const response = await fetch('http://localhost:8282/api/metrics/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metrics),
      signal: AbortSignal.timeout(1000), // 1s timeout
    });

    if (!response.ok) {
      // Veritas not running or endpoint not available - that's fine
    }
  } catch {
    // Veritas not available - silent fail
  }
}

async function main() {
  let hookInput: HookInput | null = null;

  try {
    const decoder = new TextDecoder();
    const reader = Bun.stdin.stream().getReader();
    let input = '';

    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });

    const readPromise = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        input += decoder.decode(value, { stream: true });
      }
    })();

    await Promise.race([readPromise, timeoutPromise]);

    if (input.trim()) {
      hookInput = JSON.parse(input) as HookInput;
    }
  } catch {
    process.exit(0);
  }

  if (!hookInput?.session_id) {
    process.exit(0);
  }

  // Estimate tokens
  const inputText = JSON.stringify(hookInput.tool_input || {});
  const outputText = hookInput.tool_result || '';

  const inputTokens = estimateTokens(inputText);
  const outputTokens = estimateTokens(outputText);
  const cost = calculateCost(inputTokens, outputTokens);

  // Load and update session metrics
  const session = await loadSessionMetrics(hookInput.session_id);
  session.total_input_tokens += inputTokens;
  session.total_output_tokens += outputTokens;
  session.total_cost_usd += cost;
  session.tool_calls += 1;
  session.tools_used[hookInput.tool_name] =
    (session.tools_used[hookInput.tool_name] || 0) + 1;

  // Save metrics
  await saveSessionMetrics(session);

  // Create detailed metrics for this call
  const tokenMetrics: TokenMetrics = {
    session_id: hookInput.session_id,
    timestamp: new Date().toISOString(),
    tool_name: hookInput.tool_name,
    estimated_input_tokens: inputTokens,
    estimated_output_tokens: outputTokens,
    estimated_cost_usd: cost,
    cumulative_tokens: session.total_input_tokens + session.total_output_tokens,
    cumulative_cost_usd: session.total_cost_usd,
  };

  // Try to send to Veritas (non-blocking)
  sendToVeritas(tokenMetrics).catch(() => {});

  // Log summary every 10 tool calls
  if (session.tool_calls % 10 === 0) {
    console.error(
      `\n[TokenTracker] Session ${hookInput.session_id.slice(0, 8)}... ` +
        `| Calls: ${session.tool_calls} ` +
        `| Tokens: ${(session.total_input_tokens + session.total_output_tokens).toLocaleString()} ` +
        `| Est. Cost: $${session.total_cost_usd.toFixed(4)}\n`
    );
  }

  process.exit(0);
}

main().catch(() => {
  process.exit(0);
});
