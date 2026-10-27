/**
 * Assignment 5 (B7): Security Headers Middleware
 */
export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Server', 'CampusEats-NodeExpress/1.0');
  next();
}
