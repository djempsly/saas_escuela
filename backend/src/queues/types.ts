export interface GenerarBoletinJobData {
  claseId: string;
  cicloLectivoId: string;
  institucionId: string;
  userId: string;
}
export interface GenerarBoletinJobResult {
  url: string;
  totalBoletines: number;
}

export interface ExportarExcelJobData {
  nivelId: string;
  cicloLectivoId: string;
  institucionId: string;
  userId: string;
}
export interface ExportarExcelJobResult {
  url: string;
}

export interface ExportarTodoJobData {
  cicloLectivoId: string;
  institucionId: string;
  userId: string;
}
export interface ExportarTodoJobResult {
  url: string;
  totalNiveles: number;
}

export interface NotificacionesMasivasJobData {
  usuarioIds: string[];
  titulo: string;
  mensaje: string;
  institucionId: string;
}
export interface NotificacionesMasivasJobResult {
  totalEnviadas: number;
}

export interface VerificarSuscripcionesJobData {
  triggeredAt: string;
}
export interface VerificarSuscripcionesJobResult {
  suspendidas: number;
  vencidas: number;
}

export interface RecordatorioMantenimientoJobData {
  avisoId: string;
  horasAntes: number;
}
export interface RecordatorioMantenimientoJobResult {
  totalNotificados: number;
}
