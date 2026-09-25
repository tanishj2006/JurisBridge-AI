export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

interface RequestRecord {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RequestRecord>();

// Cleanup stale IP entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((record, ip) => {
    record.timestamps = record.timestamps.filter((ts: number) => now - ts < 60000);
    if (record.timestamps.length === 0) {
      rateLimitMap.delete(ip);
    }
  });
}, 5 * 60 * 1000);

/**
 * Sliding-window rate limiter per IP address.
 * Defaults to 10 requests per 60-second window.
 */
export function checkRateLimit(
  ip: string = '127.0.0.1',
  maxRequests: number = 10,
  windowMs: number = 60000
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { timestamps: [] };

  // Filter out timestamps older than the sliding window
  record.timestamps = record.timestamps.filter((ts: number) => now - ts < windowMs);

  if (record.timestamps.length >= maxRequests) {
    const oldest = record.timestamps[0];
    const resetInSeconds = Math.ceil((oldest + windowMs - now) / 1000);

    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      resetInSeconds: Math.max(1, resetInSeconds),
    };
  }

  record.timestamps.push(now);
  rateLimitMap.set(ip, record);

  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - record.timestamps.length,
    resetInSeconds: Math.ceil(windowMs / 1000),
  };
}

/**
 * Clears the rate limiter cache (useful for testing).
 */
export function resetRateLimiter(): void {
  rateLimitMap.clear();
}
