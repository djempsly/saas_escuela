#!/bin/bash
# =============================================================
# Script de Deploy - Plataforma Educativa Multi-Tenant
#
# Uso: ./scripts/deploy.sh
# =============================================================

set -e

echo "=== Deploy de Plataforma Educativa ==="
echo ""

cd "$(dirname "$0")/.."

# Verificar que .env existe
if [ ! -f .env ]; then
  echo "ERROR: No existe archivo .env"
  echo "Copia .env.production.example a .env y configúralo"
  exit 1
fi

# Cargar variables de entorno
source .env

# Verificar variables requeridas
REQUIRED_VARS=("DB_USER" "DB_PASSWORD" "DB_NAME" "JWT_SECRET" "BASE_DOMAIN" "SERVER_IP")
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "ERROR: Variable $var no está definida en .env"
    exit 1
  fi
done

# Verificar si es primer deploy
FIRST_DEPLOY=false
if ! docker compose ps --quiet app 2>/dev/null | grep -q .; then
  FIRST_DEPLOY=true
fi

echo "→ Descargando última versión..."
git pull origin main || true

if [ "$FIRST_DEPLOY" = true ]; then
  echo ""
  echo "=== PRIMER DEPLOY DETECTADO ==="
  echo ""

  echo "→ Construyendo imágenes..."
  docker compose build

  echo "→ Levantando base de datos..."
  docker compose up -d db

  echo "→ Esperando que PostgreSQL esté listo..."
  sleep 10

  echo "→ Ejecutando migraciones de Prisma..."
  docker compose run --rm app npx prisma migrate deploy

  echo "→ Levantando todos los servicios..."
  docker compose up -d

else
  echo ""
  echo "=== ACTUALIZACIÓN SIN DOWNTIME ==="
  echo ""

  # Backup pre-deploy
  echo "→ Creando backup pre-deploy..."
  mkdir -p ./backups
  BACKUP_FILE="./backups/pre_deploy_$(date +%Y%m%d_%H%M%S).sql"
  docker compose exec -T db pg_dump -U "${DB_USER}" "${DB_NAME}" > "$BACKUP_FILE"
  echo "  Backup guardado: $BACKUP_FILE"

  # Construir nueva imagen SIN detener la app actual
  echo "→ Construyendo nueva imagen..."
  docker compose build app

  # Aplicar migraciones
  echo "→ Ejecutando migraciones..."
  docker compose run --rm app npx prisma migrate deploy

  # Reiniciar SOLO la app (Caddy y DB no se tocan)
  echo "→ Reiniciando app (zero-downtime)..."
  docker compose up -d --no-deps --build app

  # Limpiar imágenes viejas
  docker image prune -f > /dev/null 2>&1
fi

# Verificar estado
echo ""
echo "→ Verificando servicios..."
sleep 5
docker compose ps

echo ""
echo "=== Deploy completado ==="
echo ""
echo "URLs disponibles:"
echo "  - https://${BASE_DOMAIN}"
echo "  - https://<slug>.${BASE_DOMAIN}"
echo ""
