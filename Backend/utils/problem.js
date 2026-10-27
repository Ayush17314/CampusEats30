/**
 * Assignment 6 (Part B) & RFC 7807 / RFC 9457: Problem Details for HTTP APIs
 * Media Type: application/problem+json
 */

export const TYPE_CATALOGUE = {
  EMPTY_CART: 'https://campuseats.iiitv.ac.in/errors/empty-cart',
  ITEM_UNAVAILABLE: 'https://campuseats.iiitv.ac.in/errors/item-unavailable',
  PAYMENT_DECLINED: 'https://campuseats.iiitv.ac.in/errors/payment-declined',
  ORDER_NOT_FOUND: 'https://campuseats.iiitv.ac.in/errors/order-not-found',
  ILLEGAL_TRANSITION: 'https://campuseats.iiitv.ac.in/errors/illegal-transition',
  VALIDATION_ERROR: 'https://campuseats.iiitv.ac.in/errors/validation-error',
  UNAUTHORIZED: 'https://campuseats.iiitv.ac.in/errors/unauthorized',
  RATE_LIMITED: 'https://campuseats.iiitv.ac.in/errors/rate-limited',
  PRECONDITION_FAILED: 'https://campuseats.iiitv.ac.in/errors/precondition-failed',
  SERVICE_UNAVAILABLE: 'https://campuseats.iiitv.ac.in/errors/service-unavailable',
  INTERNAL_ERROR: 'https://campuseats.iiitv.ac.in/errors/internal-error'
};

export class ProblemError extends Error {
  constructor({ type, title, status, detail, instance, errors }) {
    super(detail || title);
    this.type = type || 'about:blank';
    this.title = title;
    this.status = status;
    this.detail = detail;
    this.instance = instance;
    this.errors = errors;
  }
}

/**
 * Standard RFC 7807 problem details response helper
 */
export function sendProblem(res, { type, title, status, detail, instance, errors, headers = {} }) {
  res.status(status);
  res.setHeader('Content-Type', 'application/problem+json; charset=utf-8');
  
  for (const [k, v] of Object.entries(headers)) {
    res.setHeader(k, v);
  }

  const body = {
    type: type || 'about:blank',
    title,
    status,
    detail
  };

  if (instance) body.instance = instance;
  if (errors && errors.length > 0) body.errors = errors;

  return res.json(body);
}
