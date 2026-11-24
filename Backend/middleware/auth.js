import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const SECRET = process.env.JWT_SECRET || 'campuseats_cs543_super_secret_jwt_key_2026';

/**
 * CS543 Assignment 09: Guard 1 — Authentication
 * "Who are you?"
 * Reads Authorization: Bearer <token>, verifies via jwt.verify,
 * replies 401 if missing, invalid, or expired.
 */
export function auth(req, res, next) {
  const authHeader = req.get('Authorization') || req.headers['authorization'] || '';
  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'missing token',
      title: 'Unauthorized',
      status: 401,
      detail: 'Missing Authorization: Bearer <token> header.'
    });
  }

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'invalid token',
      title: 'Unauthorized',
      status: 401,
      detail: 'Token is invalid, malformed, or expired.'
    });
  }
}

// Alias for backwards compatibility
export const requireAuth = auth;

/**
 * CS543 Assignment 09: Guard 2 — Authorization
 * "May you?"
 * Checks if req.user.role is among the permitted roles (...ok).
 * Replies 403 Forbidden for any other authenticated user.
 */
export const requireRole = (...ok) => (req, res, next) => {
  if (!req.user || !ok.includes(req.user.role)) {
    return res.status(403).json({
      error: 'forbidden',
      title: 'Forbidden',
      status: 403,
      detail: `Role '${req.user?.role || 'anonymous'}' is not authorized to access this resource. Required role(s): ${ok.join(', ')}`
    });
  }
  next();
};
