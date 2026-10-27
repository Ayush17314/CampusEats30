import crypto from 'crypto';

/**
 * Assignment 5 (Part B4, C1, C2): ETag and Conditional HTTP Evaluation
 */

export function generateETag(data) {
  const content = typeof data === 'string' ? data : JSON.stringify(data);
  const hash = crypto.createHash('sha1').update(content).digest('hex').substring(0, 16);
  return `"${hash}"`;
}

/**
 * Checks If-None-Match on GET reads.
 * If match -> returns true (caller should send 304).
 */
export function checkIfNoneMatch(req, currentETag) {
  const ifNoneMatch = req.headers['if-none-match'];
  if (!ifNoneMatch) return false;
  return ifNoneMatch === currentETag || ifNoneMatch === '*';
}

/**
 * Checks If-Match on PUT/PATCH writes (optimistic locking).
 * If header is provided and does NOT match -> returns false (caller should return 412).
 */
export function checkIfMatch(req, currentETag) {
  const ifMatch = req.headers['if-match'];
  if (!ifMatch) return true; // If-Match wasn't sent, proceed
  return ifMatch === currentETag || ifMatch === '*';
}
