// ── Env + mocks created in vi.hoisted (runs before vi.mock factories + imports) ──
import { vi } from 'vitest';

const mockPrisma = vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-jwt-secret-key-must-be-at-least-32-chars!!';
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://localhost:5432/test';

  return {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  };
});

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

vi.mock('../config/db', () => ({ default: mockPrisma }));

// ── Mock: S3 (app.ts health check imports it) ──
vi.mock('../services/s3.service', () => ({
  checkS3Connection: vi.fn().mockResolvedValue(true),
  uploadToS3: vi.fn(),
  deleteFromS3: vi.fn(),
  isS3Url: vi.fn(),
}));

// ── Mock: Email (auth.service imports it) ──
vi.mock('../services/email.service', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

// ── Mock: Token Blacklist (auth.middleware imports it) ──
vi.mock('../services/token-blacklist.service', () => ({
  blacklistToken: vi.fn().mockResolvedValue(undefined),
  isTokenBlacklisted: vi.fn().mockResolvedValue(false),
}));

// ── Mock: Logger (silence pino output in tests) ──
vi.mock('../config/logger', () => {
  const noop = () => {};
  const log: Record<string, (...args: unknown[]) => void> & { child: () => typeof log } = { info: noop, error: noop, warn: noop, debug: noop, trace: noop, fatal: noop, child: () => log };
  log.child = () => log;
  return { logger: log };
});

import app from '../app';

const JWT_SECRET = process.env.JWT_SECRET!;

describe('Auth API', () => {
  let hashedPassword: string;

  const makeUser = (overrides: Record<string, unknown> = {}) => ({
    id: 'user-1',
    username: 'testuser',
    email: 'test@test.com',
    password: hashedPassword,
    nombre: 'Test',
    apellido: 'User',
    role: 'ADMIN',
    activo: true,
    debeCambiarPassword: false,
    institucionId: null,
    fotoUrl: null,
    institucion: null,
    ...overrides,
  });

  beforeAll(async () => {
    hashedPassword = await bcrypt.hash('ValidPass1', 12);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──────────────────────────────────────────────
  // 1. Login con credenciales válidas
  // ──────────────────────────────────────────────
  describe('POST /api/v1/auth/login', () => {
    it('retorna accessToken + refreshToken con credenciales válidas', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeUser());
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ identificador: 'testuser', password: 'ValidPass1' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body).toHaveProperty('token'); // backward compat alias
      expect(res.body.accessToken).toBe(res.body.token);
      expect(res.body.user).toMatchObject({
        id: 'user-1',
        nombre: 'Test',
        role: 'ADMIN',
      });
    });

    // ──────────────────────────────────────────────
    // 2. Login con password incorrecta
    // ──────────────────────────────────────────────
    it('retorna 401 con password incorrecta', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeUser());

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ identificador: 'testuser', password: 'WrongPass1' });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/no válidas/i);
    });
  });

  // ──────────────────────────────────────────────
  // 4. Refresh token válido → nuevos tokens
  // ──────────────────────────────────────────────
  describe('POST /api/v1/auth/refresh', () => {
    it('retorna nuevos tokens y revoca el viejo', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({});

      mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({
          refreshToken: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'rt-1',
              token: 'valid-refresh-token',
              userId: 'user-1',
              expiresAt: new Date(Date.now() + 7 * 86400000),
              revoked: false,
              user: { id: 'user-1', role: 'ADMIN', institucionId: null, activo: true },
            }),
            update: mockUpdate,
            create: vi.fn().mockResolvedValue({}),
          },
        });
      });

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      // Old token was revoked
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rt-1' },
          data: { revoked: true },
        }),
      );
    });

    // ──────────────────────────────────────────────
    // 5. Refresh con token revocado → 401
    // ──────────────────────────────────────────────
    it('retorna 401 con refresh token revocado', async () => {
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({
          refreshToken: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'rt-1',
              token: 'revoked-token',
              userId: 'user-1',
              expiresAt: new Date(Date.now() + 7 * 86400000),
              revoked: true,
              user: { id: 'user-1', role: 'ADMIN', institucionId: null, activo: true },
            }),
            update: vi.fn(),
            create: vi.fn(),
          },
        });
      });

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'revoked-token' });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/inválido/i);
    });
  });

  // ──────────────────────────────────────────────
  // 6. Logout → refresh token revocado
  // ──────────────────────────────────────────────
  describe('POST /api/v1/auth/logout', () => {
    it('revoca el refresh token al cerrar sesión', async () => {
      const accessToken = jwt.sign(
        { usuarioId: 'user-1', institucionId: null, rol: 'ADMIN' },
        JWT_SECRET,
        { expiresIn: '15m' },
      );

      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'token-to-revoke',
        revoked: false,
      });
      mockPrisma.refreshToken.update.mockResolvedValue({});

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken: 'token-to-revoke' });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/cerrada/i);
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { revoked: true },
        }),
      );
    });
  });

  // ──────────────────────────────────────────────
  // 7. Password policy: password débil → 400
  // ──────────────────────────────────────────────
  describe('Password policy', () => {
    it('rechaza password menor a 8 caracteres', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'some-token', newPassword: 'Ab1' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('rechaza password sin mayúscula', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'some-token', newPassword: 'abcdefg1' });

      expect(res.status).toBe(400);
    });

    it('rechaza password sin número', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'some-token', newPassword: 'Abcdefgh' });

      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────────
  // 3. Rate limit (LAST — exhausts the quota)
  // ──────────────────────────────────────────────
  describe('Rate limiting', () => {
    it('retorna 429 después de exceder el rate limit de login', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      // App-level authLimiter: max 10 per 15 min (shared across login + reset-password)
      // Prior tests consumed some quota; send enough to guarantee 429
      const responses = [];
      for (let i = 0; i < 15; i++) {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({ identificador: 'bruteforce@test.com', password: 'SomePass1' });
        responses.push(res);
      }

      const has429 = responses.some((r) => r.status === 429);
      expect(has429).toBe(true);
    });
  });
});
