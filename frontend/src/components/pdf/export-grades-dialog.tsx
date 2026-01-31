'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  downloadReportCard,
  printReportCard,
  createDefaultConfig,
  defaultGradeColors,
  ReportCardData,
  PDFConfig,
  GradeColors,
} from '@/lib/pdf';
import { useI18nStore, localeNames, Locale } from '@/lib/i18n';
import { useInstitutionStore } from '@/store/institution.store';
import {
  FileDown,
  Printer,
  Loader2,
  Settings2,
  Palette,
  Globe,
  FileText,
} from 'lucide-react';

interface ExportGradesDialogProps {
  data: ReportCardData;
  trigger?: React.ReactNode;
}

export function ExportGradesDialog({ data, trigger }: ExportGradesDialogProps) {
  const { locale, setLocale } = useI18nStore();
  const { branding } = useInstitutionStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [config, setConfig] = useState<PDFConfig>(() =>
    createDefaultConfig(
      branding?.sistemaEducativo || 'RD_GENERAL',
      data.estudiante.nivel,
      locale
    )
  );

  const [gradeColors, setGradeColors] = useState<GradeColors>(defaultGradeColors);

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      await downloadReportCard(data, { ...config, gradeColors });
    } catch (error) {
      console.error('Error generando PDF:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = async () => {
    setIsLoading(true);
    try {
      await printReportCard(data, { ...config, gradeColors });
    } catch (error) {
      console.error('Error imprimiendo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const availableLocales: Locale[] =
    branding?.sistemaEducativo?.includes('HT') || branding?.sistemaEducativo === 'HAITI'
      ? ['fr', 'ht', 'en']
      : ['es', 'en'];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Exportar Boletín
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="w-5 h-5" />
            Exportar Calificaciones
          </DialogTitle>
          <DialogDescription>
            Genera el boletín de {data.estudiante.nombre} {data.estudiante.apellido}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Idioma */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Idioma del Documento
            </Label>
            <div className="flex flex-wrap gap-2">
              {availableLocales.map((lang) => (
                <Button
                  key={lang}
                  size="sm"
                  variant={config.locale === lang ? 'default' : 'outline'}
                  onClick={() => setConfig({ ...config, locale: lang })}
                >
                  {localeNames[lang]}
                </Button>
              ))}
            </div>
          </div>

          {/* Tamaño de papel (informativo) */}
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-sm">
              <strong>Tamaño de papel:</strong>{' '}
              {config.paperSize === 'A4' ? 'A4 (210 x 297 mm)' : 'Legal (8.5 x 14 in)'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Determinado automáticamente según el sistema educativo
            </p>
          </div>

          {/* Opciones */}
          <div className="space-y-2">
            <Label>Incluir en el documento:</Label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.showAttendance}
                  onChange={(e) => setConfig({ ...config, showAttendance: e.target.checked })}
                  className="rounded"
                />
                Asistencia
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.showObservations}
                  onChange={(e) => setConfig({ ...config, showObservations: e.target.checked })}
                  className="rounded"
                />
                Observaciones
              </label>
              {branding?.sistemaEducativo?.includes('POLITECNICO') && (
                <label className="flex items-center gap-2 text-sm col-span-2">
                  <input
                    type="checkbox"
                    checked={config.showTechnicalModules}
                    onChange={(e) =>
                      setConfig({ ...config, showTechnicalModules: e.target.checked })
                    }
                    className="rounded"
                  />
                  Módulos Técnicos (RA)
                </label>
              )}
            </div>
          </div>

          {/* Configuración avanzada */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full"
          >
            <Settings2 className="w-4 h-4 mr-2" />
            {showAdvanced ? 'Ocultar' : 'Mostrar'} configuración de colores
          </Button>

          {showAdvanced && (
            <div className="space-y-3 p-4 border rounded-lg">
              <Label className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Colores según Calificación
              </Label>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Excelente (90-100)</Label>
                  <div className="flex gap-1">
                    <input
                      type="color"
                      value={gradeColors.excelente}
                      onChange={(e) =>
                        setGradeColors({ ...gradeColors, excelente: e.target.value })
                      }
                      className="w-8 h-8 rounded border cursor-pointer"
                    />
                    <Input
                      value={gradeColors.excelente}
                      onChange={(e) =>
                        setGradeColors({ ...gradeColors, excelente: e.target.value })
                      }
                      className="flex-1 h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Bueno (80-89)</Label>
                  <div className="flex gap-1">
                    <input
                      type="color"
                      value={gradeColors.bueno}
                      onChange={(e) =>
                        setGradeColors({ ...gradeColors, bueno: e.target.value })
                      }
                      className="w-8 h-8 rounded border cursor-pointer"
                    />
                    <Input
                      value={gradeColors.bueno}
                      onChange={(e) =>
                        setGradeColors({ ...gradeColors, bueno: e.target.value })
                      }
                      className="flex-1 h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Regular (70-79)</Label>
                  <div className="flex gap-1">
                    <input
                      type="color"
                      value={gradeColors.regular}
                      onChange={(e) =>
                        setGradeColors({ ...gradeColors, regular: e.target.value })
                      }
                      className="w-8 h-8 rounded border cursor-pointer"
                    />
                    <Input
                      value={gradeColors.regular}
                      onChange={(e) =>
                        setGradeColors({ ...gradeColors, regular: e.target.value })
                      }
                      className="flex-1 h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Deficiente (&lt;70)</Label>
                  <div className="flex gap-1">
                    <input
                      type="color"
                      value={gradeColors.deficiente}
                      onChange={(e) =>
                        setGradeColors({ ...gradeColors, deficiente: e.target.value })
                      }
                      className="w-8 h-8 rounded border cursor-pointer"
                    />
                    <Input
                      value={gradeColors.deficiente}
                      onChange={(e) =>
                        setGradeColors({ ...gradeColors, deficiente: e.target.value })
                      }
                      className="flex-1 h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handlePrint} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Printer className="w-4 h-4 mr-2" />
            )}
            Imprimir
          </Button>
          <Button onClick={handleDownload} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4 mr-2" />
            )}
            Descargar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ExportGradesDialog;
