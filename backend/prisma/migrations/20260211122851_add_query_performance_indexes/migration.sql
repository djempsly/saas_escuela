-- CreateIndex
CREATE INDEX "Calificacion_claseId_cicloLectivoId_idx" ON "Calificacion"("claseId", "cicloLectivoId");

-- CreateIndex
CREATE INDEX "CalificacionCompetencia_claseId_cicloLectivoId_idx" ON "CalificacionCompetencia"("claseId", "cicloLectivoId");

-- CreateIndex
CREATE INDEX "CalificacionCompetencia_estudianteId_cicloLectivoId_idx" ON "CalificacionCompetencia"("estudianteId", "cicloLectivoId");

-- CreateIndex
CREATE INDEX "CalificacionTecnica_claseId_idx" ON "CalificacionTecnica"("claseId");

-- CreateIndex
CREATE INDEX "CalificacionTecnica_estudianteId_idx" ON "CalificacionTecnica"("estudianteId");

-- CreateIndex
CREATE INDEX "Inscripcion_claseId_idx" ON "Inscripcion"("claseId");

-- CreateIndex
CREATE INDEX "Inscripcion_estudianteId_idx" ON "Inscripcion"("estudianteId");
