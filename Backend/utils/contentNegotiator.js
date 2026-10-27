import { XMLBuilder } from 'fast-xml-parser';
import { sendProblem, TYPE_CATALOGUE } from './problem.js';

const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  format: true,
  suppressEmptyNode: false
});

/**
 * Assignment 6 (C3, C4): Content negotiation for JSON and XML
 */
export function sendNegotiated(req, res, statusCode, data, rootXmlTag = 'response') {
  const accept = req.headers['accept'] || 'application/json';

  // 1. JSON (default)
  if (accept.includes('application/json') || accept === '*/*' || accept.includes('*/*')) {
    res.status(statusCode);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.json(data);
  }

  // 2. XML requested
  if (accept.includes('application/xml') || accept.includes('text/xml')) {
    res.status(statusCode);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    const xmlData = { [rootXmlTag]: data };
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${xmlBuilder.build(xmlData)}`;
    return res.send(xml);
  }

  // 3. Unsupported type requested -> 406 Not Acceptable
  return sendProblem(res, {
    type: TYPE_CATALOGUE.VALIDATION_ERROR,
    title: 'Not Acceptable',
    status: 406,
    detail: `Client Accept header '${accept}' is not supported. Supported media types: application/json, application/xml.`,
    instance: req.originalUrl
  });
}
