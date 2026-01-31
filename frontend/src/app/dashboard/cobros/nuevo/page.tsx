'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { cobrosApi, ciclosApi, estudiantesApi } from '@/lib/api';
import { Loader2, ArrowLeft, Search, Users } from 'lucide-react';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface Estudiante {
  id: string;
  nombre: string;
  apellido: string;
}

interface Ciclo {
  id: string;
  nombre: string;
  activo: boolean;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

const conceptoLabels: Record<string, string> = {
  MATRICULA: 'Matrícula',
  MENSUALIDAD: 'Mensualidad',
  MATERIAL: 'Material',
  UNIFORME: 'Uniforme',
  ACTIVIDAD: 'Actividad',
  OTRO: 'Otro',
};

export default function NuevoCobroPage() {
  const router = useRouter();
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [conceptos, setConceptos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [esMasivo, setEsMasivo] = useState(false);

  const [formData, setFormData] = useState({
    concepto: 'MENSUALIDAD',
    descripcion: '',
    monto: '',
    fechaVencimiento: '',
    estudianteId: '',
    cicloLectivoId: '',
  });

  const [selectedEstudiantes, setSelectedEstudiantes] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [estRes, ciclosRes, conceptosRes] = await Promise.all([
          estudiantesApi.getAll(),
          ciclosApi.getAll(),
          cobrosApi.getConceptos(),
        ]);
        setEstudiantes(estRes.data || []);
        setCiclos(ciclosRes.data || []);
        setConceptos(conceptosRes.data || []);

        // Set default ciclo to activo
        const cicloActivo = (ciclosRes.data || []).find((c: Ciclo) => c.activo);
        if (cicloActivo) {
          setFormData((prev) => ({ ...prev, cicloLectivoId: cicloActivo.id }));
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredEstudiantes = estudiantes.filter(
    (e) =>
      e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.apellido.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleEstudiante = (id: string) => {
    setSelectedEstudiantes((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedEstudiantes.length === filteredEstudiantes.length) {
      setSelectedEstudiantes([]);
    } else {
      setSelectedEstudiantes(filteredEstudiantes.map((e) => e.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.monto || !formData.fechaVencimiento || !formData.cicloLectivoId) {
      setError('Completa todos los campos requeridos');
      return;
    }

    if (esMasivo && selectedEstudiantes.length === 0) {
      setError('Selecciona al menos un estudiante');
      return;
    }

    if (!esMasivo && !formData.estudianteId) {
      setError('Selecciona un estudiante');
      return;
    }

    setIsSubmitting(true);
    try {
      if (esMasivo) {
        await cobrosApi.createMasivo({
          concepto: formData.concepto,
          descripcion: formData.descripcion || undefined,
          monto: parseFloat(formData.monto),
          fechaVencimiento: new Date(formData.fechaVencimiento).toISOString(),
          estudianteIds: selectedEstudiantes,
          cicloLectivoId: formData.cicloLectivoId,
        });
      } else {
        await cobrosApi.create({
          concepto: formData.concepto,
          descripcion: formData.descripcion || undefined,
          monto: parseFloat(formData.monto),
          fechaVencimiento: new Date(formData.fechaVencimiento).toISOString(),
          estudianteId: formData.estudianteId,
          cicloLectivoId: formData.cicloLectivoId,
        });
      }
      router.push('/dashboard/cobros');
    } catch (error) {
      const apiError = error as ApiError;
      setError(apiError.response?.data?.message || 'Error al crear cobro');
    } finally {
      setIsSubmitting(false);
    }
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
        <Link href="/dashboard/cobros">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Nuevo Cobro</h1>
          <p className="text-muted-foreground">
            Crear cobro individual o masivo
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch
                id="esMasivo"
                checked={esMasivo}
                onCheckedChange={setEsMasivo}
              />
              <Label htmlFor="esMasivo">Cobro masivo (varios estudiantes)</Label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="concepto">Concepto *</Label>
                <Select
                  value={formData.concepto}
                  onValueChange={(value) =>
                    setFormData({ ...formData, concepto: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {conceptos.map((c) => (
                      <SelectItem key={c} value={c}>
                        {conceptoLabels[c] || c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cicloLectivoId">Ciclo Lectivo *</Label>
                <Select
                  value={formData.cicloLectivoId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, cicloLectivoId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar ciclo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ciclos.map((ciclo) => (
                      <SelectItem key={ciclo.id} value={ciclo.id}>
                        {ciclo.nombre} {ciclo.activo && '(Activo)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción (opcional)</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
                placeholder="Ej: Mensualidad de Enero 2024"
                rows={2}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="monto">Monto *</Label>
                <Input
                  id="monto"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.monto}
                  onChange={(e) =>
                    setFormData({ ...formData, monto: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fechaVencimiento">Fecha de vencimiento *</Label>
                <Input
                  id="fechaVencimiento"
                  type="date"
                  value={formData.fechaVencimiento}
                  onChange={(e) =>
                    setFormData({ ...formData, fechaVencimiento: e.target.value })
                  }
                />
              </div>
            </div>

            {!esMasivo ? (
              <div className="space-y-2">
                <Label htmlFor="estudianteId">Estudiante *</Label>
                <Select
                  value={formData.estudianteId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, estudianteId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estudiante" />
                  </SelectTrigger>
                  <SelectContent>
                    {estudiantes.map((est) => (
                      <SelectItem key={est.id} value={est.id}>
                        {est.nombre} {est.apellido}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Estudiantes *</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {selectedEstudiantes.length} seleccionados
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={selectAll}
                    >
                      {selectedEstudiantes.length === filteredEstudiantes.length
                        ? 'Deseleccionar todos'
                        : 'Seleccionar todos'}
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar estudiante..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  {filteredEstudiantes.map((est) => (
                    <div
                      key={est.id}
                      className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleEstudiante(est.id)}
                    >
                      <Checkbox
                        checked={selectedEstudiantes.includes(est.id)}
                        onCheckedChange={() => toggleEstudiante(est.id)}
                      />
                      <span>
                        {est.nombre} {est.apellido}
                      </span>
                    </div>
                  ))}
                  {filteredEstudiantes.length === 0 && (
                    <p className="p-4 text-center text-muted-foreground">
                      No se encontraron estudiantes
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-4 justify-end pt-4 border-t">
              <Link href="/dashboard/cobros">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : esMasivo ? (
                  `Crear ${selectedEstudiantes.length} cobros`
                ) : (
                  'Crear Cobro'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
