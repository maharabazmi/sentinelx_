import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';

import authRoutes from './server/routes/auth.routes';
import citizenRoutes from './server/routes/citizen.routes';
import policeRoutes from './server/routes/police.routes';
import consumerRoutes from './server/routes/consumer.routes';
import adminRoutes from './server/routes/admin.routes';
import { PostgresService } from './server/services/postgres-service';

async function startServer() {
  // Initialize Cloud SQL PostgreSQL data
  PostgresService.initAndSeed().catch(err => {
    console.warn('PostgreSQL bootstrap warning:', err.message);
  });

  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Health endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'OK',
      platform: 'SentinelX - AI-Assisted Public Safety & Consumer Protection Platform',
      jurisdiction: 'People\'s Republic of Bangladesh',
      timestamp: new Date().toISOString()
    });
  });

  // REST API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/citizen', citizenRoutes);
  app.use('/api/police', policeRoutes);
  app.use('/api/consumer', consumerRoutes);
  app.use('/api/admin', adminRoutes);

  // Global API 404 handler
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: `API endpoint ${req.originalUrl} not found.` });
  });

  // Frontend Integration (Vite Middleware in Dev, Static in Prod)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🛡️ SentinelX Backend Engine running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal server startup failure:', err);
  process.exit(1);
});
