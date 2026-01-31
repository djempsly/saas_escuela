'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cobrosApi } from '@/lib/api';
import { Loader2, ArrowLeft, Download, DollarSign, FileText } from 'lucide-react';
import Link from 'next/link';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Pago {
  id: string;
  monto: number;
  metodoPago: string;
  referencia?: string;
  fechaPago: string;
  cobro: {
    concepto: string;
    estudiante: { nombre: string; apellido: string };
  };
  registradoPor: { nombre: string; apellido: string };
}

interface ReporteTotales {
  totalRecaudado: number;
  porMetodo: Record<string, number>;
  porConcepto: Record<string, number>;
  cantidadPagos: number;
}

interface Reporte {
  pagos: Pago[];
  totales: ReporteTotales;
  periodo: { inicio: string; fin: string };
}

const metodoPagoLabels: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
  CHEQUE: 'Cheque',
};

const conceptoLabels: Record<string, string> = {
  MATRICULA: 'Matrícula',
  MENSUALIDAD: 'Mensualidad',
  MATERIAL: 'Material',
  UNIFORME: 'Uniforme',
  ACTIVIDAD: 'Actividad',
  OTRO: 'Otro',
};

export default function HistorialPagosPage() {
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fechaInicio, setFechaInicio] = useState(
    format(startOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [fechaFin, setFechaFin] = useState(
    format(endOfMonth(new Date()), 'yyyy-MM-dd')
  );

  const fetchReporte = async () => {
    setIsLoading(true);
    try {
      const response = await cobrosApi.getReporte(fechaInicio, fechaFin);
      setReporte(response.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReporte();
  }, []);

  const handleGenerarReporte = () => {
    fetchReporte();
  };

  const downloadCSV = () => {
    if (!reporte) return;

    const headers = ['Fecha', 'Estudiante', 'Concepto', 'Monto', 'Método', 'Referencia', 'Registrado por'];
    const rows = reporte.pagos.map((p) => [
      format(new Date(p.fechaPago), 'dd/MM/yyyy HH:mm'),
      `${p.cobro.estudiante.nombre} ${p.cobro.estudiante.apellido}`,
      conceptoLabels[p.cobro.concepto] || p.cobro.concepto,
      Number(p.monto).toFixed(2),
      metodoPagoLabels[p.metodoPago] || p.metodoPago,
      p.referencia || '',
      `${p.registradoPor.nombre} ${p.registradoPor.apellido}`,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-pagos-${fechaInicio}-${fechaFin}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/cobros">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Historial de Pagos</h1>
          <p className="text-muted-foreground">
            Reporte de pagos recibidos
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtrar por fecha</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="fechaInicio">Desde</Label>
              <Input
                id="fechaInicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fechaFin">Hasta</Label>
              <Input
                id="fechaFin"
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
            <Button onClick={handleGenerarReporte} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                'Generar Reporte'
              )}
            </Button>
            {reporte && (
              <Button variant="outline" onClick={downloadCSV}>
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {reporte && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      ${reporte.totales.totalRecaudado.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total recaudado
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {reporte.totales.cantidadPagos}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Pagos registrados
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardContent className="pt-6">
                <h4 className="font-medium mb-3">Por método de pago</h4>
                <div className="space-y-2">
                  {Object.entries(reporte.totales.porMetodo).map(([metodo, monto]) => (
                    <div key={metodo} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {metodoPagoLabels[metodo] || metodo}
                      </span>
                      <span className="font-medium">
                        ${monto.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detalle de pagos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estudiante</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Registrado por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reporte.pagos.map((pago) => (
                    <TableRow key={pago.id}>
                      <TableCell>
                        {format(new Date(pago.fechaPago), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        {pago.cobro.estudiante.nombre}{' '}
                        {pago.cobro.estudiante.apellido}
                      </TableCell>
                      <TableCell>
                        {conceptoLabels[pago.cobro.concepto] || pago.cobro.concepto}
                      </TableCell>
                      <TableCell>
                        ${Number(pago.monto).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {metodoPagoLabels[pago.metodoPago] || pago.metodoPago}
                      </TableCell>
                      <TableCell>{pago.referencia || '-'}</TableCell>
                      <TableCell>
                        {pago.registradoPor.nombre} {pago.registradoPor.apellido}
                      </TableCell>
                    </TableRow>
                  ))}
                  {reporte.pagos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <p className="text-muted-foreground">
                          No hay pagos en el período seleccionado
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
