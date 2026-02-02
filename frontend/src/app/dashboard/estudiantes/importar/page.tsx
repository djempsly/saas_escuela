'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { importApi, nivelesApi } from '@/lib/api';
import {
  Upload,
  Download,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  XCircle,
  Printer,
  Users,
  AlertCircle,
} from 'lucide-react';

interface Nivel {
  id: string;
  nombre: string;
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

interface ApiError {
  response?: { data?: { message?: string } };
  message?: string;
}

export default function ImportarEstudiantesPage() {
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [selectedNivel, setSelectedNivel] = useState('');
  const [autoEnroll, setAutoEnroll] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchNiveles = async () => {
      try {
        const response = await nivelesApi.getAll();
        setNiveles(response.data || []);
      } catch (error) {
        console.error('Error loading niveles:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchNiveles();
  }, []);

  const handleDownloadTemplate = async () => {
    try {
      const response = await importApi.downloadPlantilla();
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_estudiantes.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      const apiError = error as ApiError;
      alert(apiError.response?.data?.message || 'Error al descargar plantilla');
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile);
      setResult(null);
    } else {
      alert('Por favor selecciona un archivo Excel (.xlsx o .xls)');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      alert('Selecciona un archivo Excel');
      return;
    }

    setIsUploading(true);
    try {
      const response = await importApi.importEstudiantes(
        file,
        selectedNivel || undefined,
        autoEnroll
      );
      setResult(response.data);
    } catch (error) {
      const apiError = error as ApiError;
      alert(apiError.response?.data?.message || 'Error al importar estudiantes');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePrintCredentials = () => {
    if (!result) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Credenciales de Estudiantes</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; margin-bottom: 30px; }
          h2 { margin-top: 30px; border-bottom: 2px solid #333; padding-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; }
          .credential-card {
            display: inline-block;
            border: 1px solid #ddd;
            padding: 15px;
            margin: 10px;
            width: 250px;
            border-radius: 8px;
          }
          .credential-card h4 { margin: 0 0 10px 0; }
          .credential-card p { margin: 5px 0; font-size: 14px; }
          .credential-card .username, .credential-card .password {
            font-family: monospace;
            background: #f5f5f5;
            padding: 2px 6px;
            border-radius: 4px;
          }
          @media print {
            .no-print { display: none; }
            .credential-card { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>Credenciales de Acceso - Estudiantes Importados</h1>
        <p>Fecha: ${new Date().toLocaleDateString()}</p>
        <p>Total importados: ${result.exitosos} estudiantes</p>

        ${result.credenciales.map(grupo => `
          <h2>${grupo.nivel}</h2>
          <div>
            ${grupo.estudiantes.map(est => `
              <div class="credential-card">
                <h4>${est.nombre} ${est.apellido}</h4>
                <p><strong>Usuario:</strong> <span class="username">${est.username}</span></p>
                <p><strong>Contrasena:</strong> <span class="password">${est.password}</span></p>
              </div>
            `).join('')}
          </div>
        `).join('')}

        <script>window.print();</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const resetForm = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Importar Estudiantes</h1>
          <p className="text-muted-foreground">
            Carga masiva de estudiantes desde un archivo Excel
          </p>
        </div>
        <Button variant="outline" onClick={handleDownloadTemplate}>
          <Download className="w-4 h-4 mr-2" />
          Descargar Plantilla
        </Button>
      </div>

      {!result ? (
        <>
          {/* Upload Area */}
          <Card>
            <CardContent className="pt-6">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-colors
                  ${isDragging ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-primary'}
                  ${file ? 'bg-green-50 border-green-400' : ''}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className="w-12 h-12 text-green-600" />
                    <p className="font-medium text-green-700">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); resetForm(); }}>
                      Cambiar archivo
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-12 h-12 text-muted-foreground" />
                    <p className="font-medium">Arrastra un archivo Excel aqui</p>
                    <p className="text-sm text-muted-foreground">
                      o haz clic para seleccionar (.xlsx, .xls)
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Opciones de Importacion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Cargando niveles...</span>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="nivel">Nivel por defecto (opcional)</Label>
                    <select
                      id="nivel"
                      value={selectedNivel}
                      onChange={(e) => setSelectedNivel(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">-- Sin nivel por defecto --</option>
                      {niveles.map((nivel) => (
                        <option key={nivel.id} value={nivel.id}>
                          {nivel.nombre}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Se usara si el estudiante no tiene nivel en el Excel
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="autoEnroll"
                      checked={autoEnroll}
                      onChange={(e) => setAutoEnroll(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="autoEnroll" className="cursor-pointer">
                      Inscribir automaticamente en las clases del nivel
                    </Label>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Import Button */}
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleImport}
              disabled={!file || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar Estudiantes
                </>
              )}
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Results */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-green-700">{result.exitosos}</p>
                    <p className="text-sm text-green-600">Importados exitosamente</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {result.fallidos > 0 && (
              <Card className="bg-red-50 border-red-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-8 h-8 text-red-600" />
                    <div>
                      <p className="text-2xl font-bold text-red-700">{result.fallidos}</p>
                      <p className="text-sm text-red-600">Con errores</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{result.credenciales.length}</p>
                    <p className="text-sm text-muted-foreground">Niveles con estudiantes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Credentials */}
          {result.credenciales.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Credenciales Generadas</CardTitle>
                <Button variant="outline" size="sm" onClick={handlePrintCredentials}>
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir Credenciales
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {result.credenciales.map((grupo, idx) => (
                    <div key={idx}>
                      <h3 className="font-medium mb-2 text-primary">{grupo.nivel}</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-2">Nombre</th>
                              <th className="text-left py-2 px-2">Apellido</th>
                              <th className="text-left py-2 px-2">Usuario</th>
                              <th className="text-left py-2 px-2">Contrasena</th>
                            </tr>
                          </thead>
                          <tbody>
                            {grupo.estudiantes.map((est, i) => (
                              <tr key={i} className="border-b hover:bg-slate-50">
                                <td className="py-2 px-2">{est.nombre}</td>
                                <td className="py-2 px-2">{est.apellido}</td>
                                <td className="py-2 px-2 font-mono text-xs bg-slate-100 rounded">
                                  {est.username}
                                </td>
                                <td className="py-2 px-2 font-mono text-xs bg-slate-100 rounded">
                                  {est.password}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Errors */}
          {result.errores.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-base text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Errores de Importacion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-auto">
                  {result.errores.map((err, idx) => (
                    <div key={idx} className="text-sm p-2 bg-red-50 rounded flex gap-2">
                      <span className="font-medium text-red-700">Fila {err.fila}:</span>
                      <span className="text-red-600">{err.error}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={resetForm}>
              Importar Mas Estudiantes
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
