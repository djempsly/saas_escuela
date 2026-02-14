'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cobrosApi, ciclosApi, estudiantesApi, sabanaApi } from '@/lib/api';
import {
  DollarSign,
  Loader2,
  Plus,
  Search,
  FileText,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  Eye,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface Ciclo {
  id: string;
  nombre: string;
}

interface Nivel {
  id: string;
  nombre: string;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
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

export default function CobrosPage() {
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [conceptos, setConceptos] = useState<string[]>([]);
  const [metodosPago, setMetodosPago] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('all');
  const [conceptoFilter, setConceptoFilter] = useState<string>('all');
  const [nivelFilter, setNivelFilter] = useState<string>('all');

  const [selectedCobro, setSelectedCobro] = useState<Cobro | null>(null);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [pagoData, setPagoData] = useState({
    monto: '',
    metodoPago: 'EFECTIVO',
    referencia: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchCobros = async () => {
    try {
      const response = await cobrosApi.getAll({
        estado: estadoFilter !== 'all' ? estadoFilter : undefined,
        concepto: conceptoFilter !== 'all' ? conceptoFilter : undefined,
        nivelId: nivelFilter !== 'all' ? nivelFilter : undefined,
      });
      setCobros(response.data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cobrosRes, ciclosRes, conceptosRes, metodosRes, nivelesRes] = await Promise.all([
          cobrosApi.getAll(),
          ciclosApi.getAll(),
          cobrosApi.getConceptos(),
          cobrosApi.getMetodosPago(),
          sabanaApi.getNiveles(),
        ]);
        setCobros(cobrosRes.data || []);
        setCiclos(ciclosRes.data || []);
        setConceptos(conceptosRes.data || []);
        setMetodosPago(metodosRes.data || []);
        setNiveles(nivelesRes.data?.data || nivelesRes.data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      fetchCobros();
    }
  }, [estadoFilter, conceptoFilter, nivelFilter]);

  const filteredCobros = cobros.filter((cobro) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      cobro.estudiante.nombre.toLowerCase().includes(searchLower) ||
      cobro.estudiante.apellido.toLowerCase().includes(searchLower)
    );
  });

  const openPagoModal = (cobro: Cobro) => {
    const montoPagado = cobro.pagos.reduce((sum, p) => sum + Number(p.monto), 0);
    const saldoPendiente = Number(cobro.monto) - montoPagado;

    setSelectedCobro(cobro);
    setPagoData({
      monto: saldoPendiente.toString(),
      metodoPago: 'EFECTIVO',
      referencia: '',
    });
    setError('');
    setShowPagoModal(true);
  };

  const handleRegistrarPago = async () => {
    if (!selectedCobro || !pagoData.monto) return;

    setIsSubmitting(true);
    setError('');

    try {
      await cobrosApi.registrarPago(selectedCobro.id, {
        monto: parseFloat(pagoData.monto),
        metodoPago: pagoData.metodoPago,
        referencia: pagoData.referencia || undefined,
      });
      setShowPagoModal(false);
      await fetchCobros();
    } catch (error) {
      const apiError = error as ApiError;
      setError(apiError.response?.data?.message || 'Error al registrar pago');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = {
    total: cobros.length,
    pendientes: cobros.filter((c) => c.estado === 'PENDIENTE' || c.estado === 'VENCIDO').length,
    parciales: cobros.filter((c) => c.estado === 'PARCIAL').length,
    pagados: cobros.filter((c) => c.estado === 'PAGADO').length,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cobros y Pagos</h1>
          <p className="text-muted-foreground">
            Gestión de cobros y registro de pagos
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/cobros/historial">
            <Button variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Historial
            </Button>
          </Link>
          <Link href="/dashboard/cobros/nuevo">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Cobro
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendientes}</p>
                <p className="text-sm text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.parciales}</p>
                <p className="text-sm text-muted-foreground">Parciales</p>
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
                <p className="text-2xl font-bold">{stats.pagados}</p>
                <p className="text-sm text-muted-foreground">Pagados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  ${stats.totalRecaudado.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Recaudado</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por estudiante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="PENDIENTE">Pendiente</SelectItem>
            <SelectItem value="PARCIAL">Parcial</SelectItem>
            <SelectItem value="PAGADO">Pagado</SelectItem>
            <SelectItem value="VENCIDO">Vencido</SelectItem>
          </SelectContent>
        </Select>
        <Select value={conceptoFilter} onValueChange={setConceptoFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Concepto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {conceptos.map((c) => (
              <SelectItem key={c} value={c}>
                {conceptoLabels[c] || c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={nivelFilter} onValueChange={setNivelFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Nivel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los niveles</SelectItem>
            {niveles.map((n) => (
              <SelectItem key={n.id} value={n.id}>
                {n.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estudiante</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Pagado</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCobros.map((cobro) => {
                const montoPagado = cobro.pagos.reduce(
                  (sum, p) => sum + Number(p.monto),
                  0
                );

                return (
                  <TableRow key={cobro.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/cobros/estudiante/${cobro.estudiante.id}`}
                        className="text-primary hover:underline font-medium"
                      >
                        {cobro.estudiante.nombre} {cobro.estudiante.apellido}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {conceptoLabels[cobro.concepto] || cobro.concepto}
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
                            Registrar pago
                          </Button>
                        )}
                        <Link href={`/dashboard/cobros/estudiante/${cobro.estudiante.id}`}>
                          <Button variant="outline" size="sm" title="Ver historial del estudiante">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link href={`/dashboard/cobros/${cobro.id}`}>
                          <Button variant="outline" size="sm">
                            Ver
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredCobros.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-muted-foreground">
                      No se encontraron cobros
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pago Modal */}
      <Dialog open={showPagoModal} onOpenChange={setShowPagoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>

          {selectedCobro && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">
                  {selectedCobro.estudiante.nombre}{' '}
                  {selectedCobro.estudiante.apellido}
                </p>
                <p className="text-sm text-muted-foreground">
                  {conceptoLabels[selectedCobro.concepto]} - $
                  {Number(selectedCobro.monto).toLocaleString()}
                </p>
              </div>

              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="monto">Monto a pagar</Label>
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
                  placeholder="Ej: Número de transferencia"
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
                  Registrando...
                </>
              ) : (
                'Registrar Pago'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
