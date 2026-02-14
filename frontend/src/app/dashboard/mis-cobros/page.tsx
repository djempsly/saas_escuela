'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cobrosApi } from '@/lib/api';
import {
  DollarSign,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
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
  fechaPago: string;
}

interface Cobro {
  id: string;
  concepto: string;
  descripcion?: string;
  monto: number;
  fechaVencimiento: string;
  estado: 'PENDIENTE' | 'PARCIAL' | 'PAGADO' | 'VENCIDO';
  cicloLectivo: { nombre: string };
  pagos: Pago[];
}

const estadoColors = {
  PENDIENTE: 'bg-amber-100 text-amber-800',
  PARCIAL: 'bg-blue-100 text-blue-800',
  PAGADO: 'bg-green-100 text-green-800',
  VENCIDO: 'bg-red-100 text-red-800',
};

const conceptoLabels: Record<string, string> = {
  MATRICULA: 'Matrícula',
  MENSUALIDAD: 'Mensualidad',
  MATERIAL: 'Material',
  UNIFORME: 'Uniforme',
  ACTIVIDAD: 'Actividad',
  OTRO: 'Otro',
};

const metodoPagoLabels: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
  CHEQUE: 'Cheque',
};

export default function MisCobrosPage() {
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await cobrosApi.getMisCobros();
        const data = response.data?.data || response.data;
        setCobros(data?.cobros || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const stats = {
    pendientes: cobros.filter((c) => c.estado === 'PENDIENTE' || c.estado === 'VENCIDO').length,
    totalPagado: cobros.reduce(
      (sum, c) => sum + c.pagos.reduce((s, p) => s + Number(p.monto), 0),
      0
    ),
    saldoDeudor: cobros.reduce((sum, c) => {
      const pagado = c.pagos.reduce((s, p) => s + Number(p.monto), 0);
      return sum + (Number(c.monto) - pagado);
    }, 0),
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mis Cobros</h1>
        <p className="text-muted-foreground">Estado de cuenta y pagos realizados</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendientes}</p>
                <p className="text-sm text-muted-foreground">Cobros Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">${stats.totalPagado.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Pagado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">${stats.saldoDeudor.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Saldo Deudor</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Mis Cobros
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Pagado</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cobros.map((cobro) => {
                const montoPagado = cobro.pagos.reduce(
                  (sum, p) => sum + Number(p.monto),
                  0
                );
                const isExpanded = expandedRows.has(cobro.id);

                return (
                  <>
                    <TableRow
                      key={cobro.id}
                      className={cobro.pagos.length > 0 ? 'cursor-pointer' : ''}
                      onClick={() => cobro.pagos.length > 0 && toggleRow(cobro.id)}
                    >
                      <TableCell>
                        {cobro.pagos.length > 0 && (
                          isExpanded
                            ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {conceptoLabels[cobro.concepto] || cobro.concepto}
                        </span>
                        {cobro.descripcion && (
                          <p className="text-xs text-muted-foreground">
                            {cobro.descripcion}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>${Number(cobro.monto).toLocaleString()}</TableCell>
                      <TableCell>${montoPagado.toLocaleString()}</TableCell>
                      <TableCell>
                        {format(new Date(cobro.fechaVencimiento), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge className={estadoColors[cobro.estado]}>
                          {cobro.estado}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    {isExpanded && cobro.pagos.map((pago) => (
                      <TableRow key={pago.id} className="bg-muted/50">
                        <TableCell></TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          Pago - {metodoPagoLabels[pago.metodoPago] || pago.metodoPago}
                        </TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-sm">
                          ${Number(pago.monto).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(pago.fechaPago), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    ))}
                  </>
                );
              })}
              {cobros.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No tienes cobros registrados
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
