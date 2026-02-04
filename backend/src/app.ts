import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import routes from './routes';
import publicRoutes from './routes/public.routes';
import internalRoutes from './routes/internal.routes';
import adminDominiosRoutes from './routes/admin-dominios.routes';
import { errorHandler } from './middleware/error-handler.middleware';

const app: Application = express();

// ============ SEGURIDAD: Headers HTTP con Helmet ============
// Protege contra ataques comunes como XSS, clickjacking, etc.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// ============ SEGURIDAD: Rate Limiting ============
// Rate limiting general para toda la API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo 100 requests por ventana por IP
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
  : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'];

app.use(cors({
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
}));

// ============ Middlewares de Parsing ============
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
// Also mount at /api/v1 for consistency with frontend api calls
app.use('/api/admin/dominios', adminDominiosRoutes);
app.use('/api/v1/admin/dominios', adminDominiosRoutes);

// ============ Rutas de API v1 ============
app.use('/api/v1', routes);

// ============ Health Check ============
app.get('/', (req, res) => {
  res.send('API funcionando correctamente');
});

// ============ Manejador de Errores Global ============
// Usa el error handler mejorado que maneja Prisma, Zod y errores conocidos
app.use(errorHandler);

export default app;
