import dotenv from 'dotenv';
dotenv.config();

const PAYMENTS_SERVICE_URL = process.env.PAYMENTS_SERVICE_URL || 'http://127.0.0.1:3001/api/v1/payments';
const CATALOGUE_SERVICE_URL = process.env.CATALOGUE_SERVICE_URL || 'http://127.0.0.1:3001/api/v1/catalogue';
const DELIVERY_SERVICE_URL = process.env.DELIVERY_SERVICE_URL || 'http://127.0.0.1:3001/api/v1/delivery';
const NOTIFICATIONS_SERVICE_URL = process.env.NOTIFICATIONS_SERVICE_URL || 'http://127.0.0.1:3001/api/v1/notifications';

/**
 * Assignment 4 (D1, D2): Hardened Outbound Cross-Service HTTP Client
 * Features: Timeout via AbortSignal, Exponential Backoff with Jitter, Safe Retry Filtering.
 */
export async function hardenedFetch(url, options = {}, { maxRetries = 3, baseDelayMs = 150, timeoutMs = 4000 } = {}) {
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      // Rule: 4xx Client Errors must NEVER be retried (bad request, declined, validation)
      if (response.status >= 400 && response.status < 500) {
        return response;
      }

      // If success or acceptable redirect, return immediately
      if (response.ok) {
        return response;
      }

      // 5xx Server Error: Safe to retry with exponential backoff and jitter
      console.warn(`[Network Retry] Attempt ${attempt} failed with status ${response.status} for ${url}`);
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn(`[Network Retry] Attempt ${attempt} network/timeout error for ${url}:`, err.message);
    }

    if (attempt < maxRetries) {
      // Exponential backoff: baseDelay * 2^(attempt-1) + full jitter
      const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);
      const jitter = Math.random() * exponentialDelay;
      const sleepTime = Math.floor(exponentialDelay + jitter);
      await new Promise(resolve => setTimeout(resolve, sleepTime));
    }
  }

  throw new Error(`Hardened outbound call to ${url} failed after ${maxRetries} attempts.`);
}

export const endpoints = {
  payments: PAYMENTS_SERVICE_URL,
  catalogue: CATALOGUE_SERVICE_URL,
  delivery: DELIVERY_SERVICE_URL,
  notifications: NOTIFICATIONS_SERVICE_URL
};
