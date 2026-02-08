import { Request, Response } from 'express';
import { parseExcelFile, importStudents, generateExcelTemplate } from '../services/import.service';
import { sanitizeErrorMessage } from '../utils/security';
import { registrarAuditLog } from '../services/audit.service';

export const importEstudiantesHandler = async (req: Request, res: Response) => {
  try {
    if (!req.resolvedInstitucionId) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No se proporcionó archivo Excel' });
    }

    // Parse Excel file
    const rows = parseExcelFile(req.file.buffer);

    if (rows.length === 0) {
      return res.status(400).json({ message: 'El archivo Excel está vacío' });
    }

    // Get optional parameters
    const { nivelId, autoEnroll } = req.body;

    // Import students
    const result = await importStudents(
      rows,
      req.resolvedInstitucionId,
      nivelId,
      autoEnroll === 'true' || autoEnroll === true
    );

    if (req.user && req.resolvedInstitucionId) {
      registrarAuditLog({
        accion: 'IMPORTAR',
        entidad: 'Estudiante',
        descripcion: `Importación masiva de estudiantes: ${rows.length} filas procesadas`,
        datos: { totalFilas: rows.length, nivelId },
        usuarioId: req.user.usuarioId.toString(),
        institucionId: req.resolvedInstitucionId,
      });
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Error importing students:', error);
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};

export const downloadPlantillaHandler = async (req: Request, res: Response) => {
  try {
    const buffer = generateExcelTemplate();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename=plantilla_estudiantes.xlsx');
    res.setHeader('Content-Length', buffer.length);

    return res.send(buffer);
  } catch (error: any) {
    console.error('Error generating template:', error);
    return res.status(500).json({ message: sanitizeErrorMessage(error) });
  }
};
