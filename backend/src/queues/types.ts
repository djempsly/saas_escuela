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

export interface NotificacionesMasivasJobData {
  usuarioIds: string[];
  titulo: string;
  mensaje: string;
  institucionId: string;
}
export interface NotificacionesMasivasJobResult {
  totalEnviadas: number;
}
