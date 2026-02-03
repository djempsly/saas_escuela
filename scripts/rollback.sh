#!/bin/bash
# =============================================================
# Script de Rollback - Plataforma Educativa
#
# Uso: ./scripts/rollback.sh
# =============================================================

set -e

echo "=== Rollback de Emergencia ==="
echo ""

cd "$(dirname "$0")/.."

# Mostrar últimos commits
echo "Últimos 5 commits:"
git log --oneline -5
echo ""

# Pedir confirmación
read -p "Escribe el hash del commit al que quieres volver: " COMMIT_HASH

if [ -z "$COMMIT_HASH" ]; then
  echo "ERROR: Debes especificar un commit hash."
  exit 1
fi

read -p "¿Estás seguro de volver al commit $COMMIT_HASH? (s/n): " CONFIRM
if [ "$CONFIRM" != "s" ]; then
  echo "Rollback cancelado."
  exit 0
fi

echo "→ Volviendo al commit $COMMIT_HASH..."
git checkout "$COMMIT_HASH"

echo "→ Reconstruyendo app..."
docker compose build app

echo "→ Reiniciando app..."
docker compose up -d --no-deps --build app

echo ""
echo "=== Rollback de código completado ==="
echo ""

# Preguntar si necesita restaurar DB
read -p "¿Necesitas restaurar un backup de base de datos? (s/n): " RESTORE_DB

if [ "$RESTORE_DB" = "s" ]; then
  echo ""
  echo "Backups disponibles:"
  ls -la ./backups/*.sql 2>/dev/null || echo "  No hay backups en ./backups/"
  echo ""
  read -p "Ruta del backup a restaurar: " BACKUP_PATH

  if [ -f "$BACKUP_PATH" ]; then
    source .env
    echo "→ Restaurando backup..."
    docker compose exec -T db psql -U "${DB_USER}" "${DB_NAME}" < "$BACKUP_PATH"
    echo "→ Base de datos restaurada."
  else
    echo "ERROR: Archivo no encontrado: $BACKUP_PATH"
    exit 1
  fi
fi

echo ""
echo "=== Rollback completado ==="
