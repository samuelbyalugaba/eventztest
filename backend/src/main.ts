import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

import { database } from './shared/database';
import { redis } from './shared/redis';
import { authMiddleware } from './shared/middleware/auth';
import { errorHandler } from './shared/middleware/error';
import { requestLogger } from './shared/middleware/logger';

// Domain routes
import { identityRoutes } from './domains/identity/api/routes';
import { eventsRoutes } from './domains/events/api/routes';
import { ticketsRoutes } from './domains/tickets/api/routes';
import { messagingRoutes } from './domains/messaging/api/routes';
import { paymentsRoutes } from './domains/payments/api/routes';
import { notificationsRoutes } from './domains/notifications/api/routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(requestLogger);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes (no auth required)
app.use('/api/v1/identity/auth', identityRoutes);

// Protected routes (auth required)
app.use('/api/v1/identity', authMiddleware, identityRoutes);
app.use('/api/v1/events', authMiddleware, eventsRoutes);
app.use('/api/v1/tickets', authMiddleware, ticketsRoutes);
app.use('/api/v1/messaging', authMiddleware, messagingRoutes);
app.use('/api/v1/payments', authMiddleware, paymentsRoutes);
app.use('/api/v1/notifications', authMiddleware, notificationsRoutes);

// Error handling
app.use(errorHandler);

// Start server
async function bootstrap() {
  try {
    await database.connect();
    await redis.connect();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
