-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DIRECTOR', 'COORDINADOR_ACADEMICO', 'COORDINADOR', 'DOCENTE', 'ESTUDIANTE', 'SECRETARIA');

-- CreateEnum
CREATE TYPE "Pais" AS ENUM ('DO', 'HT');

-- CreateEnum
CREATE TYPE "SistemaEducativo" AS ENUM ('PRIMARIA_DO', 'SECUNDARIA_GENERAL_DO', 'POLITECNICO_DO', 'PRIMARIA_HT', 'SECUNDARIA_HT');

-- CreateEnum
CREATE TYPE "Idioma" AS ENUM ('ESPANOL', 'FRANCES', 'INGLES', 'KREYOL');

-- CreateEnum
CREATE TYPE "EstadoAsistencia" AS ENUM ('PRESENTE', 'AUSENTE', 'TARDE', 'JUSTIFICADO');

-- CreateEnum
CREATE TYPE "TipoMateria" AS ENUM ('GENERAL', 'TECNICA');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ESTUDIANTE',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "debeCambiarPassword" BOOLEAN NOT NULL DEFAULT true,
    "fotoUrl" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "institucionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institucion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "lema" TEXT,
    "direccion" TEXT,
    "logoUrl" TEXT,
    "colorPrimario" TEXT NOT NULL DEFAULT '#000000',
    "colorSecundario" TEXT NOT NULL DEFAULT '#ffffff',
    "pais" "Pais" NOT NULL DEFAULT 'DO',
    "sistema" "SistemaEducativo" NOT NULL,
    "idiomaPrincipal" "Idioma" NOT NULL DEFAULT 'ESPANOL',
    "codigoCentro" TEXT,
    "distritoEducativo" TEXT,
    "regionalEducacion" TEXT,
    "directorId" TEXT NOT NULL,

    CONSTRAINT "Institucion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nivel" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "institucionId" TEXT NOT NULL,
    "coordinadorId" TEXT,

    CONSTRAINT "Nivel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CicloLectivo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "institucionId" TEXT NOT NULL,

    CONSTRAINT "CicloLectivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Materia" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" "TipoMateria" NOT NULL DEFAULT 'GENERAL',
    "institucionId" TEXT NOT NULL,

    CONSTRAINT "Materia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clase" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "materiaId" TEXT NOT NULL,
    "nivelId" TEXT NOT NULL,
    "docenteId" TEXT NOT NULL,
    "cicloLectivoId" TEXT NOT NULL,
    "institucionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inscripcion" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estudianteId" TEXT NOT NULL,
    "claseId" TEXT NOT NULL,

    CONSTRAINT "Inscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Calificacion" (
    "id" TEXT NOT NULL,
    "p1" DOUBLE PRECISION DEFAULT 0,
    "p2" DOUBLE PRECISION DEFAULT 0,
    "p3" DOUBLE PRECISION DEFAULT 0,
    "p4" DOUBLE PRECISION DEFAULT 0,
    "rp1" DOUBLE PRECISION DEFAULT 0,
    "rp2" DOUBLE PRECISION DEFAULT 0,
    "rp3" DOUBLE PRECISION DEFAULT 0,
    "rp4" DOUBLE PRECISION DEFAULT 0,
    "cpc_30" DOUBLE PRECISION DEFAULT 0,
    "cpc_total" DOUBLE PRECISION DEFAULT 0,
    "cpex_70" DOUBLE PRECISION DEFAULT 0,
    "cpex_total" DOUBLE PRECISION DEFAULT 0,
    "promedioFinal" DOUBLE PRECISION DEFAULT 0,
    "situacion" TEXT DEFAULT 'PENDIENTE',
    "estudianteId" TEXT NOT NULL,
    "claseId" TEXT NOT NULL,
    "cicloLectivoId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Calificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalificacionTecnica" (
    "id" TEXT NOT NULL,
    "ra_codigo" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estudianteId" TEXT NOT NULL,
    "claseId" TEXT NOT NULL,

    CONSTRAINT "CalificacionTecnica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asistencia" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoAsistencia" NOT NULL,
    "estudianteId" TEXT NOT NULL,
    "claseId" TEXT NOT NULL,

    CONSTRAINT "Asistencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Actividad" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "urlArchivo" TEXT,
    "autorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Actividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Institucion_directorId_key" ON "Institucion"("directorId");

-- CreateIndex
CREATE UNIQUE INDEX "Materia_nombre_institucionId_key" ON "Materia"("nombre", "institucionId");

-- CreateIndex
CREATE UNIQUE INDEX "Clase_codigo_key" ON "Clase"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Inscripcion_estudianteId_claseId_key" ON "Inscripcion"("estudianteId", "claseId");

-- CreateIndex
CREATE UNIQUE INDEX "Calificacion_estudianteId_claseId_cicloLectivoId_key" ON "Calificacion"("estudianteId", "claseId", "cicloLectivoId");

-- CreateIndex
CREATE UNIQUE INDEX "CalificacionTecnica_estudianteId_claseId_ra_codigo_key" ON "CalificacionTecnica"("estudianteId", "claseId", "ra_codigo");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Institucion" ADD CONSTRAINT "Institucion_directorId_fkey" FOREIGN KEY ("directorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nivel" ADD CONSTRAINT "Nivel_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nivel" ADD CONSTRAINT "Nivel_coordinadorId_fkey" FOREIGN KEY ("coordinadorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CicloLectivo" ADD CONSTRAINT "CicloLectivo_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Materia" ADD CONSTRAINT "Materia_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clase" ADD CONSTRAINT "Clase_materiaId_fkey" FOREIGN KEY ("materiaId") REFERENCES "Materia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clase" ADD CONSTRAINT "Clase_nivelId_fkey" FOREIGN KEY ("nivelId") REFERENCES "Nivel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clase" ADD CONSTRAINT "Clase_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clase" ADD CONSTRAINT "Clase_cicloLectivoId_fkey" FOREIGN KEY ("cicloLectivoId") REFERENCES "CicloLectivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clase" ADD CONSTRAINT "Clase_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_claseId_fkey" FOREIGN KEY ("claseId") REFERENCES "Clase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calificacion" ADD CONSTRAINT "Calificacion_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calificacion" ADD CONSTRAINT "Calificacion_claseId_fkey" FOREIGN KEY ("claseId") REFERENCES "Clase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calificacion" ADD CONSTRAINT "Calificacion_cicloLectivoId_fkey" FOREIGN KEY ("cicloLectivoId") REFERENCES "CicloLectivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalificacionTecnica" ADD CONSTRAINT "CalificacionTecnica_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalificacionTecnica" ADD CONSTRAINT "CalificacionTecnica_claseId_fkey" FOREIGN KEY ("claseId") REFERENCES "Clase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asistencia" ADD CONSTRAINT "Asistencia_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asistencia" ADD CONSTRAINT "Asistencia_claseId_fkey" FOREIGN KEY ("claseId") REFERENCES "Clase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actividad" ADD CONSTRAINT "Actividad_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
