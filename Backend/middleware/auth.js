import { sendProblem, TYPE_CATALOGUE } from '../utils/problem.js';

/**
 * Assignment 5 (B3): Bearer Token Authorization Middleware
 * Format: Authorization: Bearer <token>
 * Missing or empty token -> 401 Unauthorized
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendProblem(res, {
      type: TYPE_CATALOGUE.UNAUTHORIZED,
      title: 'Unauthorized',
      status: 401,
      detail: 'Missing or malformed Authorization header. Expected: Bearer <token>',
      instance: req.originalUrl,
      headers: {
        'WWW-Authenticate': 'Bearer error="invalid_token", error_description="The access token is missing or malformed"'
      }
    });
  }

  const token = authHeader.split(' ')[1]?.trim();
  if (!token) {
    return sendProblem(res, {
      type: TYPE_CATALOGUE.UNAUTHORIZED,
      title: 'Unauthorized',
      status: 401,
      detail: 'Bearer token string cannot be empty.',
      instance: req.originalUrl,
      headers: {
        'WWW-Authenticate': 'Bearer error="invalid_token"'
      }
    });
  }

  // Header verification only, attach mock authenticated student user context
  req.user = {
    studentId: token,
    role: 'STUDENT'
  };

  next();
}
