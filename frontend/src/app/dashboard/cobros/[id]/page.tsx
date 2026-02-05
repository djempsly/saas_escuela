'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cobrosApi } from '@/lib/api';
import {
  Loader2,
  ArrowLeft,
  DollarSign,
  Calendar,
  User,
  FileText,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Printer,
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
import { toast } from 'sonner';

interface Pago {
  id: string;
  monto: number;
  metodoPago: string;
  referencia?: string;
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
  estudiante: { id: string; nombre: string; apellido: string; email?: string };
  cicloLectivo: { nombre: string };
  pagos: Pago[];
  createdAt: string;
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

export default function CobroDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [cobro, setCobro] = useState<Cobro | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCobro = async () => {
      try {
        const response = await cobrosApi.getById(id);
        setCobro(response.data?.data || response.data);
      } catch (error) {
        console.error('Error:', error);
        toast.error('Error al cargar detalles del cobro');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCobro();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!cobro) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold">Cobro no encontrado</h2>
        <Button variant="link" onClick={() => router.back()}>
          Volver atrás
        </Button>
      </div>
    );
  }

  const montoPagado = cobro.pagos.reduce((sum, p) => sum + Number(p.monto), 0);
  const saldoPendiente = Number(cobro.monto) - montoPagado;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Detalle de Cobro</h1>
            <p className="text-muted-foreground">#{cobro.id.substring(0, 8).toUpperCase()}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Info Estudiante */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Información del Estudiante
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nombre Completo</p>
                <p className="font-medium">{cobro.estudiante.nombre} {cobro.estudiante.apellido}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{cobro.estudiante.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Año Escolar</p>
                <p className="font-medium">{cobro.cicloLectivo.nombre}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ID Estudiante</p>
                <p className="text-xs font-mono">{cobro.estudiante.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen de Estado */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estado de Cuenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Estado:</span>
              <Badge className={estadoColors[cobro.estado]}>
                {cobro.estado}
              </Badge>
            </div>
            <div className="pt-4 border-t space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monto Total:</span>
                <span className="font-bold">${Number(cobro.monto).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Total Pagado:</span>
                <span>-${montoPagado.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2 border-t text-lg font-bold">
                <span>Saldo:</span>
                <span className={saldoPendiente > 0 ? 'text-red-600' : 'text-green-600'}>
                  ${saldoPendiente.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detalles del Concepto */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Detalles del Cobro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Concepto</p>
                <p className="text-xl font-bold">{conceptoLabels[cobro.concepto] || cobro.concepto}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Fecha de Emisión</p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(cobro.createdAt), "PPP", { locale: es })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Fecha de Vencimiento</p>
                <p className="font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {format(new Date(cobro.fechaVencimiento), "PPP", { locale: es })}
                </p>
              </div>
              {cobro.descripcion && (
                <div className="md:col-span-3 pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Descripción</p>
                  <p>{cobro.descripcion}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Historial de Pagos */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Historial de Pagos (Abonos)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Registrado por</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cobro.pagos.length > 0 ? (
                  cobro.pagos.map((pago) => (
                    <TableRow key={pago.id}>
                      <TableCell>{format(new Date(pago.fechaPago), 'dd/MM/yyyy HH:mm')}</TableCell>
                      <TableCell>{metodoPagoLabels[pago.metodoPago] || pago.metodoPago}</TableCell>
                      <TableCell>{pago.referencia || '-'}</TableCell>
                      <TableCell>{pago.registradoPor.nombre} {pago.registradoPor.apellido}</TableCell>
                      <TableCell className="text-right font-bold">${Number(pago.monto).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No se han registrado pagos para este cobro aún.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            padding: 0;
            margin: 0;
          }
          .Card {
            border: 1px solid #eee !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
