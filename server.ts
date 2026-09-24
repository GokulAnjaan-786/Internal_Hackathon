import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticate, rateLimit } from './src/server/middleware/auth.ts';
import { authRouter } from './src/server/routes/auth.ts';
import { casesRouter } from './src/server/routes/cases.ts';
import { reportsRouter } from './src/server/routes/reports.ts';
import { sightingsRouter } from './src/server/routes/sightings.ts';
import { tasksRouter } from './src/server/routes/tasks.ts';
import { leadsRouter } from './src/server/routes/leads.ts';
import { aiRouter } from './src/server/routes/ai.ts';
import { systemRouter } from './src/server/routes/system.ts';
import { locationRouter } from './src/server/routes/location.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // Request Parsers
  app.use(express.json({ limit: '12mb' }));
  app.use(express.urlencoded({ extended: true, limit: '12mb' }));

  // Global Rate Limiting for Public Protection
  app.use(rateLimit(120, 60000));

  // Global Session Authentication Middleware
  app.use(authenticate);

  // Health and Readiness
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'HEALTHY', timestamp: new Date().toISOString() });
  });
  app.get('/ready', (req, res) => {
    res.status(200).json({ ready: true, timestamp: new Date().toISOString() });
  });

  // REST API Endpoints
  app.use('/api/auth', authRouter);
  app.use('/api/cases', casesRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/sightings', sightingsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/leads', leadsRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/location', locationRouter);
  app.use('/api', systemRouter);

  // Serve Frontend
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Application Error:', err);
    res.status(500).json({
      error: 'An internal emergency server error occurred. The incident team has been notified.',
      code: 'SERVER_ERROR',
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Emergency Command Center] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal Server Startup Error:', err);
  process.exit(1);
});
