/**
 * Lightweight, memory-bounded LRU Cache for JurisBridge AI.
 *
 * - Max 50 entries (configurable).
 * - 15-minute TTL with automatic stale eviction.
 * - Cache keys are SHA-256 hashes of (documentText + persona) for deterministic dedup.
 * - Zero external dependencies — uses Web Crypto API for hashing.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MAX_ENTRIES = 50;
const TTL_MS = 15 * 60 * 1000; // 15 minutes
const EVICTION_INTERVAL_MS = 5 * 60 * 1000; // Prune every 5 minutes

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  value: T;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// LRU Cache Implementation
// ---------------------------------------------------------------------------

class LRUCache<T> {
  private map = new Map<string, CacheEntry<T>>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;
  private evictionTimer: ReturnType<typeof setInterval> | null = null;

  constructor(maxEntries: number = MAX_ENTRIES, ttlMs: number = TTL_MS) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
    this.startEvictionTimer();
  }

  /** Retrieve a cached value. Returns undefined on miss or if the entry is stale. */
  get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;

    // Stale check
    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.map.delete(key);
      return undefined;
    }

    // Move to end (most recently used) by re-inserting
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  /** Insert a value. Evicts the least-recently-used entry if at capacity. */
  set(key: string, value: T): void {
    // If key already exists, delete it first so re-insert goes to the end
    if (this.map.has(key)) {
      this.map.delete(key);
    }

    // Evict LRU (first entry in insertion-order Map) if at capacity
    if (this.map.size >= this.maxEntries) {
      const lruKey = this.map.keys().next().value;
      if (lruKey !== undefined) {
        this.map.delete(lruKey);
      }
    }

    this.map.set(key, { value, createdAt: Date.now() });
  }

  /** Number of live (non-evicted) entries. */
  get size(): number {
    return this.map.size;
  }

  /** Prune all entries that have exceeded the TTL. */
  prune(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [key, entry] of this.map) {
      if (now - entry.createdAt > this.ttlMs) {
        this.map.delete(key);
        pruned++;
      }
    }
    return pruned;
  }

  /** Clear all entries. */
  clear(): void {
    this.map.clear();
  }

  /** Stop the background eviction timer. */
  destroy(): void {
    if (this.evictionTimer) {
      clearInterval(this.evictionTimer);
      this.evictionTimer = null;
    }
  }

  private startEvictionTimer(): void {
    this.evictionTimer = setInterval(() => {
      const pruned = this.prune();
      if (pruned > 0) {
        console.info(`[LRUCache] Pruned ${pruned} stale entries.`);
      }
    }, EVICTION_INTERVAL_MS);

    // Allow Node process to exit even if the timer is pending
    if (this.evictionTimer && typeof this.evictionTimer === 'object' && 'unref' in this.evictionTimer) {
      this.evictionTimer.unref();
    }
  }
}

// ---------------------------------------------------------------------------
// SHA-256 hashing helper
// ---------------------------------------------------------------------------

/**
 * Computes a SHA-256 hex digest of the given input string.
 * Uses the Web Crypto API (available in Node 18+ and all modern browsers).
 */
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);

  // crypto.subtle is available in Next.js server runtime (Node 18+)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Builds a deterministic cache key from documentText and an optional persona.
 * Uses SHA-256 to produce a fixed-length key regardless of input size.
 */
export async function buildCacheKey(documentText: string, persona?: string): Promise<string> {
  const raw = `${documentText}::${persona || '__default__'}`;
  return sha256(raw);
}

/**
 * Builds a deterministic cache key for comparison operations.
 */
export async function buildComparisonCacheKey(docA: string, docB: string): Promise<string> {
  const raw = `compare::${docA}::${docB}`;
  return sha256(raw);
}

// ---------------------------------------------------------------------------
// Singleton cache instances
// ---------------------------------------------------------------------------

/** Analysis result cache (keyed by SHA-256 of documentText + persona). */
export const analysisCache = new LRUCache<any>(MAX_ENTRIES, TTL_MS);

/** Comparison result cache (keyed by SHA-256 of docA + docB). */
export const comparisonCache = new LRUCache<any>(MAX_ENTRIES, TTL_MS);

// ---------------------------------------------------------------------------
// Exports for testing
// ---------------------------------------------------------------------------

export { LRUCache, MAX_ENTRIES, TTL_MS };
