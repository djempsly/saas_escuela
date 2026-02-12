import express, { Application } from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import * as Sentry from '@sentry/node';
import routes from './routes';
import publicRoutes from './routes/public.routes';
import internalRoutes from './routes/internal.routes';
import adminDominiosRoutes from './routes/admin-dominios.routes';
import { errorHandler } from './middleware/error-handler.middleware';
import { requestLogger } from './middleware/request-logger.middleware';
import prisma from './config/db';
import { checkS3Connection } from './services/s3.service';
import { ValidationError } from './errors';

const app: Application = express();

// Confiar en el proxy (necesario para rate-limiting correcto detrás de Caddy/Docker)
app.set('trust proxy', 1);

// ============ SEGURIDAD: Headers HTTP con Helmet ============
// Protege contra ataques comunes como XSS, clickjacking, etc.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

// ============ Compresión HTTP (gzip/brotli) ============
app.use(compression());

// ============ SEGURIDAD: Rate Limiting ============
// Rate limiting general para toda la API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // Aumentado a 1000 requests por ventana para evitar bloqueos en dashboard
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en 15 minutos.' },
  skip: (req) => {
    // No limitar health check
    return req.path === '/';
  },
});

// Rate limiting estricto para autenticación (previene ataques de fuerza bruta)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Solo 10 intentos de login por ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesion. Intenta de nuevo en 15 minutos.' },
});

// ============ CORS ============
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (como curl, Postman, o server-to-server)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // En desarrollo, permitir cualquier localhost
        if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
          callback(null, true);
        } else {
          callback(new Error('No permitido por CORS'));
        }
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ============ Middlewares de Parsing ============
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============ Request Logger (requestId + pino) ============
app.use(requestLogger);

// ============ Rate Limiters por Ruta ============
// Aplicar rate limiting estricto a rutas de autenticacion
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/forgot-password', authLimiter);
app.use('/api/v1/auth/reset-password', authLimiter);

// Aplicar rate limiting general a toda la API
app.use('/api/v1', apiLimiter);

// ============ Archivos Estaticos ============
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ============ Rutas Públicas (sin autenticación) ============
// Estas rutas se usan para landing pages y resolución de tenant por hostname
app.use('/api/public', publicRoutes);

// ============ Rutas Internas (solo accesibles desde localhost/red interna) ============
// Usadas por Caddy para verificar dominios antes de generar certificados SSL
app.use('/api/internal', internalRoutes);

// ============ Rutas de Administración de Dominios ============
app.use('/api/v1/admin/dominios', adminDominiosRoutes);

// ============ Rutas de API v1 ============
app.use('/api/v1', routes);

// ============ Health Check ============
app.get('/', async (req, res, next) => {
  interface CheckResult {
    status: 'ok' | 'error';
    latency: number;
    error?: string;
  }

  const checks: Record<string, CheckResult> = {};

  // ---- Base de datos ----
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok', latency: Date.now() - dbStart };
  } catch (err: any) {
    checks.database = { status: 'error', latency: Date.now() - dbStart, error: err.message };
  }

  // ---- S3 Storage ----
  const s3Start = Date.now();
  try {
    await checkS3Connection();
    checks.storage = { status: 'ok', latency: Date.now() - s3Start };
  } catch (err: any) {
    checks.storage = { status: 'error', latency: Date.now() - s3Start, error: err.message };
  }

  const allHealthy = Object.values(checks).every((c) => c.status === 'ok');
  const status = allHealthy ? 'healthy' : 'degraded';

  // Si está degradado y se pide vía ?strict=true, propagar como error
  if (!allHealthy && req.query.strict === 'true') {
    const failed = Object.entries(checks)
      .filter(([, c]) => c.status === 'error')
      .map(([name]) => name);
    return next(new ValidationError(`Servicios degradados: ${failed.join(', ')}`));
  }

  res.status(allHealthy ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  });
});

// ============ Manejador de Errores Global ============
// Sentry captura el error primero, luego nuestro handler envía la respuesta
Sentry.setupExpressErrorHandler(app);
app.use(errorHandler);

export default app;
