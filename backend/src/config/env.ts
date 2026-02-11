import { z } from 'zod';

/**
 * Schema de validación de variables de entorno.
 *
 * Este archivo debe importarse al inicio de server.ts para que
 * la aplicación falle rápido si falta alguna variable crítica.
 */
const envSchema = z.object({
  // Base de datos (requerido)
  DATABASE_URL: z.string().url('DATABASE_URL debe ser una URL válida'),

  // Seguridad (requerido)
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres para ser seguro'),

  // URLs
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Entorno
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Servidor
  PORT: z.coerce.number().default(4000),

  // Multi-tenant (opcional pero recomendado en producción)
  BASE_DOMAIN: z.string().min(3).optional(),
  SERVER_IP: z
    .string()
    .regex(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, 'SERVER_IP debe ser una IP válida')
    .optional(),

  // CORS
  ALLOWED_ORIGINS: z.string().optional(),

  // Sentry (opcional - si no hay DSN, queda deshabilitado)
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),

  // Email (opcional - si no está, forgot password no enviará emails)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
});

// Tipo inferido del schema
export type Env = z.infer<typeof envSchema>;

// Función para validar y obtener las variables de entorno
function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('='.repeat(60));
    console.error('ERROR: Variables de entorno inválidas o faltantes');
    console.error('='.repeat(60));

    const errors = result.error.flatten().fieldErrors;

    for (const [key, messages] of Object.entries(errors)) {
      console.error(`  ${key}: ${messages?.join(', ')}`);
    }

    console.error('='.repeat(60));
    console.error('Por favor, revisa tu archivo .env');
    console.error('='.repeat(60));

    // En producción, fallar inmediatamente
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }

    // En desarrollo, usar valores por defecto donde sea posible
    console.warn('ADVERTENCIA: Usando valores por defecto en desarrollo');
  }

  return result.success
    ? result.data
    : (envSchema.parse({
        ...process.env,
        // Valores por defecto para desarrollo
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/test',
        JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-key-cambiar-en-produccion-min-32-chars',
      }) as Env);
}

// Exportar las variables validadas
export const env = validateEnv();

// Helpers para verificar el entorno
export const isDev = env.NODE_ENV === 'development';
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
