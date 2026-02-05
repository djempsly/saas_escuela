import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando siembra de base de datos...');

  // 1. Crear Super Admin Global con los datos proporcionados
  const adminPassword = await bcrypt.hash('admin123', 10);
  
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'djempsly120@gmail.com',
      password: adminPassword,
      nombre: 'Jeffry',
      apellido: 'Almonte Dely',
      role: Role.ADMIN,
      debeCambiarPassword: false,
      activo: true
    },
  });

  console.log('✅ Super Admin creado con éxito:');
  console.log('   - Usuario: admin');
  console.log('   - Contraseña: admin123');
  console.log('   - Email: djempsly120@gmail.com');
  console.log('   - Nombre: Jeffry Almonte Dely');
  console.log('🌿 Siembra completada.');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
