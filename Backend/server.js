import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { securityHeaders } from './middleware/security.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { methodOverride } from './middleware/methodOverride.js';
import { errorHandler } from './middleware/errorHandler.js';

import accountsRoutes from './services/accounts/routes.js';
import catalogueRoutes from './services/catalogue/routes.js';
import ordersRoutes from './services/orders/routes.js';
import paymentsRoutes from './services/payments/routes.js';
import deliveryRoutes from './services/delivery/routes.js';
import notificationsRoutes from './services/notifications/routes.js';

import { resolvers } from './services/catalogue/resolvers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createServer() {
  const app = express();

  // 1. Assignment 5: Security & CORS headers
  app.use(securityHeaders);
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'If-None-Match', 'If-Match', 'Idempotency-Key', 'X-HTTP-Method-Override'],
    exposedHeaders: ['ETag', 'Location', 'Retry-After', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
  }));

  // 2. Body Parsers & Method Override
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(methodOverride);

  // 3. Assignment 5: Per-Client Rate Limiting
  app.use(rateLimiter);

  // 4. Serve Static Frontend for Assignment 7 GraphQL Page
  app.use(express.static(path.join(__dirname, 'public')));

  // 5. Assignment 7: Apollo Server setup for GraphQL on /graphql
  const typeDefs = fs.readFileSync(path.join(__dirname, 'services/catalogue/schema.graphql'), 'utf-8');
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers
  });
  await apolloServer.start();

  app.all('/graphql', async (req, res, next) => {
    try {
      const { query, variables, operationName } = req.method === 'GET' ? req.query : req.body;
      if (!query) {
        return res.status(400).json({ error: 'GraphQL query or mutation string is required' });
      }

      const response = await apolloServer.executeOperation({
        query,
        variables: typeof variables === 'string' ? JSON.parse(variables) : variables,
        operationName
      });

      if (response.body.kind === 'single') {
        res.status(200).json(response.body.singleResult);
      } else {
        res.status(200).json(response);
      }
    } catch (err) {
      next(err);
    }
  });

  // 6. Microservice REST Routes
  app.use('/api/v1/accounts', accountsRoutes);
  app.use('/api/v1/catalogue', catalogueRoutes);
  app.use('/api/v1/orders', ordersRoutes);
  app.use('/api/v1/payments', paymentsRoutes);
  app.use('/api/v1/delivery', deliveryRoutes);
  app.use('/api/v1/notifications', notificationsRoutes);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'UP',
      system: 'CampusEats Microservices (IIIT Vadodara)',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // 7. Assignment 6: Central RFC 7807 Problem Details Error Handler
  app.use(errorHandler);

  return app;
}
