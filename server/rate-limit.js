export class RateLimiter {
  constructor({ limit = 20, windowMs = 60_000, now = Date.now } = {}) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
    this.clients = new Map();
  }

  consume(clientKey) {
    const now = this.now();
    const record = this.clients.get(clientKey);
    if (!record || record.resetAt <= now) {
      this.clients.set(clientKey, { count: 1, resetAt: now + this.windowMs });
      this.removeExpired(now);
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (record.count >= this.limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((record.resetAt - now) / 1000))
      };
    }

    record.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }

  removeExpired(now) {
    for (const [clientKey, record] of this.clients) {
      if (record.resetAt <= now) this.clients.delete(clientKey);
    }
  }
}
