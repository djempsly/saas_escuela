import { redis } from '../config/redis';
import { logger } from '../config/logger';

const BLACKLIST_PREFIX = 'bl:';

/**
 * Agrega un access token al blacklist en Redis.
 * TTL = segundos restantes hasta la expiración del token.
 * Fail-open: si Redis falla, no bloquea al usuario.
 */
export async function blacklistToken(jti: string, exp: number): Promise<void> {
  const ttl = exp - Math.floor(Date.now() / 1000);
  if (ttl <= 0) return;
  try {
    await redis.set(`${BLACKLIST_PREFIX}${jti}`, '1', 'EX', ttl);
  } catch (err) {
    logger.error({ err, jti }, 'Error al agregar token al blacklist');
  }
}

/**
 * Verifica si un token está en el blacklist.
 * Fail-open: si Redis falla, retorna false (request pasa).
 */
export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  try {
    const result = await redis.get(`${BLACKLIST_PREFIX}${jti}`);
    return result !== null;
  } catch (err) {
    logger.error({ err, jti }, 'Error al verificar blacklist');
    return false;
  }
}
