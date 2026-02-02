import * as XLSX from 'xlsx';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import prisma from '../config/db';
import { generateSecurePassword, generateUsername } from '../utils/security';

interface StudentRow {
  nombre: string;
  apellido: string;
  email?: string;
  nivel?: string;
}

interface ImportResult {
  exitosos: number;
  fallidos: number;
  credenciales: {
    nivel: string;
    estudiantes: {
      nombre: string;
      apellido: string;
      username: string;
      password: string;
    }[];
  }[];
  errores: {
    fila: number;
    error: string;
  }[];
}

export const parseExcelFile = (buffer: Buffer): StudentRow[] => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON, header row is first row
  const data = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });

  return data.map((row) => ({
    nombre: String(row.nombre || row.Nombre || row.NOMBRE || '').trim(),
    apellido: String(row.apellido || row.Apellido || row.APELLIDO || '').trim(),
    email: row.email || row.Email || row.EMAIL || row.correo || row.Correo || undefined,
    nivel: String(row.nivel || row.Nivel || row.NIVEL || row.grado || row.Grado || '').trim() || undefined,
  }));
};

export const importStudents = async (
  rows: StudentRow[],
  institucionId: string,
  defaultNivelId?: string,
  autoEnroll?: boolean
): Promise<ImportResult> => {
  const result: ImportResult = {
    exitosos: 0,
    fallidos: 0,
    credenciales: [],
    errores: [],
  };

  // Group credentials by nivel
  const credentialsByNivel: Map<string, ImportResult['credenciales'][0]> = new Map();

  // Get niveles for the institution if we need to match by name
  const niveles = await prisma.nivel.findMany({
    where: { institucionId },
    select: { id: true, nombre: true },
  });
  const nivelMap = new Map(niveles.map((n) => [n.nombre.toLowerCase(), n]));

  // Get classes for auto-enrollment if needed
  let clasesByNivel: Map<string, { id: string }[]> = new Map();
  if (autoEnroll) {
    const clases = await prisma.clase.findMany({
      where: { institucionId },
      select: { id: true, nivelId: true },
    });
    clasesByNivel = clases.reduce((acc, c) => {
      if (!acc.has(c.nivelId)) acc.set(c.nivelId, []);
      acc.get(c.nivelId)!.push({ id: c.id });
      return acc;
    }, new Map<string, { id: string }[]>());
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // +2 because header is row 1, data starts at row 2

    // Validate required fields
    if (!row.nombre) {
      result.errores.push({ fila: rowNumber, error: 'Nombre es requerido' });
      result.fallidos++;
      continue;
    }
    if (!row.apellido) {
      result.errores.push({ fila: rowNumber, error: 'Apellido es requerido' });
      result.fallidos++;
      continue;
    }

    // Validate email if provided
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      result.errores.push({ fila: rowNumber, error: 'Email inválido' });
      result.fallidos++;
      continue;
    }

    // Check for duplicate email
    if (row.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: row.email },
      });
      if (existingUser) {
        result.errores.push({ fila: rowNumber, error: `Email ya registrado: ${row.email}` });
        result.fallidos++;
        continue;
      }
    }

    // Determine nivel
    let nivelId = defaultNivelId;
    let nivelNombre = 'Sin Nivel';

    if (row.nivel) {
      const matchedNivel = nivelMap.get(row.nivel.toLowerCase());
      if (matchedNivel) {
        nivelId = matchedNivel.id;
        nivelNombre = matchedNivel.nombre;
      } else {
        result.errores.push({
          fila: rowNumber,
          error: `Nivel no encontrado: ${row.nivel}`,
        });
        result.fallidos++;
        continue;
      }
    } else if (defaultNivelId) {
      const nivel = niveles.find((n) => n.id === defaultNivelId);
      nivelNombre = nivel?.nombre || 'Sin Nivel';
    }

    try {
      // Generate credentials
      const tempPassword = generateSecurePassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 12);
      const username = generateUsername(row.nombre, row.apellido);

      // Create student
      const student = await prisma.user.create({
        data: {
          nombre: row.nombre,
          apellido: row.apellido,
          username,
          email: row.email || null,
          password: hashedPassword,
          role: Role.ESTUDIANTE,
          institucionId,
          debeCambiarPassword: true,
        },
      });

      // Auto-enroll in classes if requested
      if (autoEnroll && nivelId) {
        const clasesDelNivel = clasesByNivel.get(nivelId) || [];
        for (const clase of clasesDelNivel) {
          try {
            await prisma.inscripcion.create({
              data: {
                estudianteId: student.id,
                claseId: clase.id,
              },
            });
          } catch {
            // Ignore duplicate enrollment errors
          }
        }
      }

      // Add credentials to result grouped by nivel
      if (!credentialsByNivel.has(nivelNombre)) {
        credentialsByNivel.set(nivelNombre, {
          nivel: nivelNombre,
          estudiantes: [],
        });
      }
      credentialsByNivel.get(nivelNombre)!.estudiantes.push({
        nombre: row.nombre,
        apellido: row.apellido,
        username,
        password: tempPassword,
      });

      result.exitosos++;
    } catch (error: any) {
      if (error.code === 'P2002') {
        result.errores.push({
          fila: rowNumber,
          error: 'Usuario duplicado (nombre de usuario ya existe)',
        });
      } else {
        result.errores.push({
          fila: rowNumber,
          error: error.message || 'Error al crear estudiante',
        });
      }
      result.fallidos++;
    }
  }

  // Convert map to array
  result.credenciales = Array.from(credentialsByNivel.values());

  return result;
};

export const generateExcelTemplate = (): Buffer => {
  const workbook = XLSX.utils.book_new();

  // Create header row with example data
  const data = [
    ['nombre', 'apellido', 'email', 'nivel'],
    ['Juan', 'Pérez', 'juan@ejemplo.com', '1ro de Primaria'],
    ['María', 'García', 'maria@ejemplo.com', '2do de Primaria'],
    ['Pedro', 'Rodríguez', '', '1ro de Primaria'],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 15 }, // nombre
    { wch: 15 }, // apellido
    { wch: 25 }, // email
    { wch: 20 }, // nivel
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Estudiantes');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
};
