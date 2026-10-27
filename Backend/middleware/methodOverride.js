/**
 * Assignment 5 (A5): X-HTTP-Method-Override Middleware
 * Allows constrained clients (e.g. firewalls/clients restricted to POST)
 * to override the HTTP verb safely.
 */
export function methodOverride(req, res, next) {
  const overrideMethod = req.headers['x-http-method-override'];
  if (req.method === 'POST' && overrideMethod) {
    const method = overrideMethod.toUpperCase();
    if (['PUT', 'PATCH', 'DELETE', 'GET'].includes(method)) {
      req.originalMethod = req.method;
      req.method = method;
    }
  }
  next();
}
