import { sendProblem, TYPE_CATALOGUE } from '../utils/problem.js';

/**
 * Assignment 5 (B5): Per-Client Rate Limiting Middleware
 * Sets: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
 * On Exceeded: 429 Too Many Requests + Retry-After header
 */

const clientBuckets = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 60;     // 60 requests per minute

export function rateLimiter(req, res, next) {
  const clientId = req.headers['authorization'] || req.ip || req.socket.remoteAddress || 'unknown-client';
  const now = Date.now();

  let clientData = clientBuckets.get(clientId);

  if (!clientData || now > clientData.resetTime) {
    clientData = {
      count: 0,
      resetTime: now + WINDOW_MS
    };
    clientBuckets.set(clientId, clientData);
  }

  const remaining = Math.max(0, MAX_REQUESTS - clientData.count);
  const resetSeconds = Math.ceil((clientData.resetTime - now) / 1000);

  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS.toString());
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(clientData.resetTime / 1000).toString());

  if (clientData.count >= MAX_REQUESTS) {
    res.setHeader('Retry-After', resetSeconds.toString());
    return sendProblem(res, {
      type: TYPE_CATALOGUE.RATE_LIMITED,
      title: 'Too Many Requests',
      status: 429,
      detail: `Exceeded rate limit of ${MAX_REQUESTS} requests per minute. Try again in ${resetSeconds} seconds.`,
      instance: req.originalUrl,
      headers: {
        'Retry-After': resetSeconds.toString()
      }
    });
  }

  clientData.count += 1;
  next();
}
