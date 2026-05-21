const attempts = new Map<string, { count: number; resetAt: number }>()

// Cleans up expired entries to avoid memory growth
function cleanup() {
  const now = Date.now()
  for (const [key, entry] of attempts) {
    if (entry.resetAt < now) attempts.delete(key)
  }
}

export function checkRateLimit(
  key: string,
  max = 10,
  windowMs = 15 * 60 * 1000
): { allowed: boolean; retryAfterSeconds: number } {
  cleanup()

  const now = Date.now()
  const entry = attempts.get(key)

  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (entry.count >= max) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) }
  }

  entry.count++
  return { allowed: true, retryAfterSeconds: 0 }
}
