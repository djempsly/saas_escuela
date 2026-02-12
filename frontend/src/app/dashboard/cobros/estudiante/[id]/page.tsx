'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cobrosApi, estudiantesApi } from '@/lib/api';
import {
  DollarSign,
  Loader2,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface Pago {
  id: string;
  monto: number;
  metodoPago: string;
  fechaPago: string;
  registradoPor: { nombre: string; apellido: string };
}

interface Cobro {
  id: string;
  concepto: string;
  descripcion?: string;
  monto: number;
  fechaVencimiento: string;
  estado: 'PENDIENTE' | 'PARCIAL' | 'PAGADO' | 'VENCIDO';
  estudiante: { id: string; nombre: string; apellido: string };
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

export default function StudentCobrosPage() {
  const params = useParams();
  const id = params.id as string;

  const [estudiante, setEstudiante] = useState<{ nombre: string; apellido: string } | null>(null);
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [metodosPago, setMetodosPago] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedCobro, setSelectedCobro] = useState<Cobro | null>(null);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [pagoData, setPagoData] = useState({
    monto: '',
    metodoPago: 'EFECTIVO',
    referencia: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [estRes, cobrosRes, metodosRes] = await Promise.all([
        estudiantesApi.getById(id),
        cobrosApi.getByEstudiante(id),
        cobrosApi.getMetodosPago(),
      ]);
      setEstudiante(estRes.data?.data || estRes.data);
      const cobrosData = cobrosRes.data?.data || cobrosRes.data;
      setCobros(cobrosData?.cobros || []);
      setMetodosPago(metodosRes.data?.data || metodosRes.data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar datos de cobros');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const openPagoModal = (cobro: Cobro) => {
    const montoPagado = cobro.pagos.reduce((sum, p) => sum + Number(p.monto), 0);
    const saldoPendiente = Number(cobro.monto) - montoPagado;

    setSelectedCobro(cobro);
    setPagoData({
      monto: saldoPendiente.toString(),
      metodoPago: 'EFECTIVO',
      referencia: '',
    });
    setShowPagoModal(true);
  };

  const handleRegistrarPago = async () => {
    if (!selectedCobro || !pagoData.monto) return;

    setIsSubmitting(true);
    try {
      await cobrosApi.registrarPago(selectedCobro.id, {
        monto: parseFloat(pagoData.monto),
        metodoPago: pagoData.metodoPago,
        referencia: pagoData.referencia || undefined,
      });
      toast.success('Pago registrado correctamente');
      setShowPagoModal(false);
      await fetchData();
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string } } };
      toast.error(axiosErr.response?.data?.message || (error instanceof Error ? error.message : 'Error al registrar pago'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = {
    total: cobros.length,
    pendientes: cobros.filter((c) => c.estado === 'PENDIENTE' || c.estado === 'VENCIDO').length,
    totalMonto: cobros.reduce((sum, c) => sum + Number(c.monto), 0),
    totalRecaudado: cobros.reduce(
      (sum, c) => sum + c.pagos.reduce((s, p) => s + Number(p.monto), 0),
      0
    ),
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
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/estudiantes/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            Cobros: {estudiante?.nombre} {estudiante?.apellido}
          </h1>
          <p className="text-muted-foreground">
            Estado de cuenta y pagos realizados
          </p>
        </div>
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
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  ${stats.totalRecaudado.toLocaleString()}
                </p>
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
                <p className="text-2xl font-bold">
                  ${(stats.totalMonto - stats.totalRecaudado).toLocaleString()}
                </p>
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
            Historial de Cobros
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Concepto</TableHead>
                <TableHead>Monto Total</TableHead>
                <TableHead>Pagado</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cobros.map((cobro) => {
                const montoPagado = cobro.pagos.reduce(
                  (sum, p) => sum + Number(p.monto),
                  0
                );

                return (
                  <TableRow key={cobro.id}>
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
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {cobro.estado !== 'PAGADO' && (
                          <Button
                            size="sm"
                            onClick={() => openPagoModal(cobro)}
                          >
                            Pagar
                          </Button>
                        )}
                        <Link href={`/dashboard/cobros/${cobro.id}`}>
                          <Button variant="outline" size="sm">
                            Detalles
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {cobros.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">
                      No hay cobros registrados para este estudiante
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Pago */}
      <Dialog open={showPagoModal} onOpenChange={setShowPagoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>

          {selectedCobro && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Concepto</p>
                <p className="font-medium">
                  {conceptoLabels[selectedCobro.concepto]}
                </p>
                <div className="flex justify-between mt-2">
                  <span>Monto Total:</span>
                  <span className="font-bold">
                    ${Number(selectedCobro.monto).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="monto">Monto a abonar</Label>
                <Input
                  id="monto"
                  type="number"
                  min="0"
                  step="0.01"
                  value={pagoData.monto}
                  onChange={(e) =>
                    setPagoData({ ...pagoData, monto: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="metodoPago">Método de pago</Label>
                <Select
                  value={pagoData.metodoPago}
                  onValueChange={(value) =>
                    setPagoData({ ...pagoData, metodoPago: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {metodosPago.map((m) => (
                      <SelectItem key={m} value={m}>
                        {metodoPagoLabels[m] || m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="referencia">Referencia (opcional)</Label>
                <Input
                  id="referencia"
                  value={pagoData.referencia}
                  onChange={(e) =>
                    setPagoData({ ...pagoData, referencia: e.target.value })
                  }
                  placeholder="Ej: Número de comprobante"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPagoModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleRegistrarPago}
              disabled={isSubmitting || !pagoData.monto}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Confirmar Pago'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
