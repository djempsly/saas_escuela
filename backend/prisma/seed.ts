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

  // 2. Crear Planes de Suscripción
  const featuresBasico = {
    items: ['gestion_academica', 'calificaciones', 'asistencia'],
    dominioPropio: false,
    maxImagenesActividad: 5,
    maxVideosActividad: 0,
  };

  const featuresPro = {
    items: ['gestion_academica', 'calificaciones', 'asistencia', 'mensajeria', 'tareas', 'reportes', 'exportar_excel'],
    dominioPropio: true,
    maxImagenesActividad: 10,
    maxVideosActividad: 2,
  };

  const featuresEnterprise = {
    items: ['gestion_academica', 'calificaciones', 'asistencia', 'mensajeria', 'tareas', 'reportes', 'exportar_excel', 'cobros', 'api_access', 'soporte_prioritario'],
    dominioPropio: true,
    maxImagenesActividad: 10,
    maxVideosActividad: 5,
  };

  const planBasico = await prisma.plan.upsert({
    where: { nombre: 'Basico' },
    update: { features: featuresBasico },
    create: {
      nombre: 'Basico',
      maxEstudiantes: 200,
      precioMensual: 49.00,
      precioAnual: 470.00,
      features: featuresBasico,
    },
  });

  const planPro = await prisma.plan.upsert({
    where: { nombre: 'Pro' },
    update: { features: featuresPro },
    create: {
      nombre: 'Pro',
      maxEstudiantes: 500,
      precioMensual: 99.00,
      precioAnual: 950.00,
      features: featuresPro,
    },
  });

  const planEnterprise = await prisma.plan.upsert({
    where: { nombre: 'Enterprise' },
    update: { features: featuresEnterprise },
    create: {
      nombre: 'Enterprise',
      maxEstudiantes: null,
      precioMensual: 199.00,
      precioAnual: 1900.00,
      features: featuresEnterprise,
    },
  });

  console.log('✅ Planes creados:', [planBasico.nombre, planPro.nombre, planEnterprise.nombre].join(', '));
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
