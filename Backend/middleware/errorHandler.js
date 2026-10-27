import { sendProblem, ProblemError, TYPE_CATALOGUE } from '../utils/problem.js';

/**
 * Assignment 6 (B1, B4): Central Problem Details Error Handler Middleware
 * Intercepts uncaught exceptions, logs internals server-side, and shields clients.
 */
export function errorHandler(err, req, res, next) {
  // If the error was explicitly thrown as a ProblemError, preserve its fields
  if (err instanceof ProblemError) {
    return sendProblem(res, {
      type: err.type,
      title: err.title,
      status: err.status,
      detail: err.detail,
      instance: req.originalUrl,
      errors: err.errors
    });
  }

  // Handle JSON parsing syntax error from Express body-parser
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendProblem(res, {
      type: TYPE_CATALOGUE.VALIDATION_ERROR,
      title: 'Malformed Request Body',
      status: 400,
      detail: 'The JSON body payload could not be parsed. Check for valid JSON formatting.',
      instance: req.originalUrl
    });
  }

  // Log internal server crash details safely to server console / audit logs
  console.error(`[Server Error] Uncaught error on ${req.method} ${req.originalUrl}:`, err);

  // Return sanitized 500 without leaking stack traces or internal DB error messages
  return sendProblem(res, {
    type: TYPE_CATALOGUE.INTERNAL_ERROR,
    title: 'Internal Server Error',
    status: 500,
    detail: 'An unexpected internal error occurred. Please contact system support with the incident reference.',
    instance: req.originalUrl
  });
}
