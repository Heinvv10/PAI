#!/usr/bin/env bun
/**
 * Tool Result Cache Hook
 *
 * Caches expensive tool results (file reads, searches, web fetches) to avoid
 * redundant operations within a session. Uses content-based hashing for cache keys.
 *
 * Cacheable tools:
 * - Read: File contents (invalidated on file modification)
 * - Glob: File listings (short TTL)
 * - Grep: Search results (short TTL)
 * - WebFetch: Web content (medium TTL)
 *
 * Non-cacheable tools:
 * - Bash: Side effects possible
 * - Write/Edit: Modifies state
 * - Task: Spawns agents
 */

interface HookInput {
  session_id: string;
  tool_name: string;
  tool_input: Record<string, unknown>;
  hook_type: 'PreToolUse' | 'PostToolUse';
  tool_result?: string;
}

interface CacheEntry {
  result: string;
  timestamp: number;
  ttl: number;
  hits: number;
  file_mtime?: number; // For file-based cache invalidation
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
}

// Tool-specific TTLs (in milliseconds)
const TOOL_TTLS: Record<string, number> = {
  Read: 5 * 60 * 1000, // 5 minutes (invalidated on mtime change)
  Glob: 60 * 1000, // 1 minute
  Grep: 60 * 1000, // 1 minute
  WebFetch: 15 * 60 * 1000, // 15 minutes
  mcp__context7__get_library_docs: 60 * 60 * 1000, // 1 hour (docs rarely change)
  mcp__memory__search_nodes: 5 * 60 * 1000, // 5 minutes
};

// Tools that should never be cached
const NON_CACHEABLE_TOOLS = new Set([
  'Bash',
  'Write',
  'Edit',
  'MultiEdit',
  'NotebookEdit',
  'Task',
  'TodoWrite',
  'AskUserQuestion',
  'mcp__memory__create_entities',
  'mcp__memory__create_relations',
  'mcp__memory__add_observations',
  'mcp__memory__delete_entities',
  'mcp__playwright__browser_click',
  'mcp__playwright__browser_type',
  'mcp__github__create_issue',
  'mcp__github__create_pull_request',
]);

const CACHE_FILE = process.env.PAI_DIR
  ? `${process.env.PAI_DIR}/cache/tool-cache.json`
  : `${process.env.HOME || process.env.USERPROFILE}/.claude/cache/tool-cache.json`;

const MAX_CACHE_SIZE = 100; // Maximum entries
const MAX_RESULT_SIZE = 50000; // Don't cache results > 50KB

/**
 * Generate cache key from tool name and input
 */
function generateCacheKey(toolName: string, toolInput: Record<string, unknown>): string {
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(toolName);
  hasher.update(JSON.stringify(toolInput));
  return hasher.digest('hex').slice(0, 16);
}

/**
 * Get file modification time (for cache invalidation)
 */
async function getFileMtime(filePath: string): Promise<number | undefined> {
  try {
    const file = Bun.file(filePath);
    const stat = await file.stat();
    return stat?.mtime?.getTime();
  } catch {
    return undefined;
  }
}

/**
 * Load cache from file
 */
async function loadCache(): Promise<Map<string, CacheEntry>> {
  try {
    const file = Bun.file(CACHE_FILE);
    if (await file.exists()) {
      const data = await file.json();
      return new Map(Object.entries(data.entries || {}));
    }
  } catch {
    // Cache file doesn't exist or is corrupt
  }
  return new Map();
}

/**
 * Save cache to file
 */
async function saveCache(
  cache: Map<string, CacheEntry>,
  stats: CacheStats
): Promise<void> {
  try {
    const dir = CACHE_FILE.substring(0, CACHE_FILE.lastIndexOf('/'));
    await Bun.write(`${dir}/.gitkeep`, '');

    const entries: Record<string, CacheEntry> = {};
    for (const [key, entry] of cache) {
      entries[key] = entry;
    }

    await Bun.write(
      CACHE_FILE,
      JSON.stringify({ entries, stats, updated: new Date().toISOString() }, null, 2)
    );
  } catch (error) {
    console.error('[ToolCache] Failed to save cache:', error);
  }
}

/**
 * Evict expired or oldest entries to maintain cache size
 */
function evictEntries(cache: Map<string, CacheEntry>, stats: CacheStats): void {
  const now = Date.now();

  // First, remove expired entries
  for (const [key, entry] of cache) {
    if (now - entry.timestamp > entry.ttl) {
      cache.delete(key);
      stats.evictions++;
    }
  }

  // If still too large, remove least recently used
  while (cache.size > MAX_CACHE_SIZE) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      cache.delete(oldestKey);
      stats.evictions++;
    }
  }
}

/**
 * Check if tool result is cacheable
 */
function isCacheable(toolName: string, result: string): boolean {
  if (NON_CACHEABLE_TOOLS.has(toolName)) return false;
  if (!TOOL_TTLS[toolName]) return false;
  if (result.length > MAX_RESULT_SIZE) return false;
  return true;
}

async function main() {
  let hookInput: HookInput | null = null;

  try {
    const decoder = new TextDecoder();
    const reader = Bun.stdin.stream().getReader();
    let input = '';

    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 300);
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

  if (!hookInput?.tool_name) {
    process.exit(0);
  }

  // Skip non-cacheable tools early
  if (NON_CACHEABLE_TOOLS.has(hookInput.tool_name)) {
    process.exit(0);
  }

  const cache = await loadCache();
  const stats: CacheStats = { hits: 0, misses: 0, evictions: 0, size: cache.size };
  const cacheKey = generateCacheKey(hookInput.tool_name, hookInput.tool_input);

  if (hookInput.hook_type === 'PreToolUse') {
    // Check for cache hit
    const entry = cache.get(cacheKey);

    if (entry) {
      const now = Date.now();
      const isExpired = now - entry.timestamp > entry.ttl;

      // For file reads, also check mtime
      let isFileChanged = false;
      if (hookInput.tool_name === 'Read' && hookInput.tool_input.file_path) {
        const currentMtime = await getFileMtime(hookInput.tool_input.file_path as string);
        if (currentMtime && entry.file_mtime && currentMtime !== entry.file_mtime) {
          isFileChanged = true;
        }
      }

      if (!isExpired && !isFileChanged) {
        // Cache hit!
        entry.hits++;
        stats.hits++;
        await saveCache(cache, stats);

        // Output cached result (Claude Code will use this)
        console.log(
          JSON.stringify({
            cached: true,
            result: entry.result,
            cache_hits: entry.hits,
          })
        );
        process.exit(0);
      }
    }

    stats.misses++;
  } else if (hookInput.hook_type === 'PostToolUse' && hookInput.tool_result) {
    // Cache the result
    if (isCacheable(hookInput.tool_name, hookInput.tool_result)) {
      const ttl = TOOL_TTLS[hookInput.tool_name] || 60 * 1000;

      const entry: CacheEntry = {
        result: hookInput.tool_result,
        timestamp: Date.now(),
        ttl,
        hits: 0,
      };

      // Store file mtime for Read operations
      if (hookInput.tool_name === 'Read' && hookInput.tool_input.file_path) {
        entry.file_mtime = await getFileMtime(hookInput.tool_input.file_path as string);
      }

      cache.set(cacheKey, entry);
      evictEntries(cache, stats);
      stats.size = cache.size;

      await saveCache(cache, stats);
    }
  }

  process.exit(0);
}

main().catch(() => {
  process.exit(0);
});
