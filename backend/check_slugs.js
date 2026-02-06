const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const instituciones = await prisma.institucion.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      director: {
        select: { id: true, nombre: true, apellido: true }
      }
    }
  });
  console.log(JSON.stringify(instituciones, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());