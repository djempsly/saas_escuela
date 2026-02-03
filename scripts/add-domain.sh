#!/bin/bash
# =============================================================
# Script para agregar dominio personalizado
#
# Uso: ./scripts/add-domain.sh <dominio> <institucion_id>
# Ejemplo: ./scripts/add-domain.sh politecnicoolga.com clxyz123abc
# =============================================================

DOMINIO=$1
INSTITUCION_ID=$2

if [ -z "$DOMINIO" ] || [ -z "$INSTITUCION_ID" ]; then
  echo "Uso: ./scripts/add-domain.sh <dominio> <institucion_id>"
  echo ""
  echo "Ejemplo:"
  echo "  ./scripts/add-domain.sh politecnicoolga.com clxyz123abc"
  exit 1
fi

cd "$(dirname "$0")/.."

echo "Registrando dominio $DOMINIO para institución $INSTITUCION_ID..."
echo ""

# Ejecutar script dentro del contenedor
docker compose exec -T app node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const registro = await prisma.institucionDominio.create({
      data: {
        institucionId: '$INSTITUCION_ID',
        dominio: '$DOMINIO'.toLowerCase().trim(),
        verificado: false,
        sslActivo: false,
      }
    });
    console.log('✅ Dominio registrado:', registro.dominio);
    console.log('   ID:', registro.id);
    console.log('   Estado: Pendiente de verificación DNS');
  } catch (e) {
    if (e.code === 'P2002') {
      console.error('❌ Error: Este dominio ya está registrado');
    } else if (e.code === 'P2003') {
      console.error('❌ Error: Institución no encontrada');
    } else {
      console.error('❌ Error:', e.message);
    }
    process.exit(1);
  } finally {
    await prisma.\$disconnect();
  }
}
main();
"

source .env

echo ""
echo "=== Instrucciones para el cliente ==="
echo ""
echo "Configura el DNS de tu dominio con una de estas opciones:"
echo ""
echo "  Opción A (Registro A):"
echo "    Tipo:   A"
echo "    Nombre: @"
echo "    Valor:  ${SERVER_IP}"
echo ""
echo "  Opción B (CNAME):"
echo "    Tipo:   CNAME"
echo "    Nombre: @"
echo "    Valor:  ${BASE_DOMAIN}"
echo ""
echo "Los cambios de DNS pueden tardar hasta 48 horas."
echo "El sistema verificará automáticamente cada hora."
echo ""
