'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { clasesApi, materiasApi, nivelesApi, docentesApi, ciclosApi } from '@/lib/api';
import { ArrowLeft, GraduationCap, Loader2, Save } from 'lucide-react';
import Link from 'next/link';

interface Materia {
  id: string;
  nombre: string;
}

interface Nivel {
  id: string;
  nombre: string;
}

interface Docente {
  id: string;
  nombre: string;
  apellido: string;
}

interface CicloLectivo {
  id: string;
  nombre: string;
  activo: boolean;
}

export default function NuevaClasePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState('');

  // Data para los selects
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [ciclos, setCiclos] = useState<CicloLectivo[]>([]);

  // Form data
  const [formData, setFormData] = useState({
    codigo: '',
    materiaId: '',
    nivelId: '',
    docenteId: '',
    cicloLectivoId: '',
  });

  // Cargar datos para los selects
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [materiasRes, nivelesRes, docentesRes, ciclosRes] = await Promise.all([
          materiasApi.getAll(),
          nivelesApi.getAll(),
          docentesApi.getAll(),
          ciclosApi.getAll(),
        ]);

        setMaterias(materiasRes.data.data || materiasRes.data || []);
        setNiveles(nivelesRes.data.data || nivelesRes.data || []);
        setDocentes(docentesRes.data.data || docentesRes.data || []);

        const ciclosData = ciclosRes.data.data || ciclosRes.data || [];
        setCiclos(ciclosData);

        // Pre-seleccionar el ciclo activo si existe
        const cicloActivo = ciclosData.find((c: CicloLectivo) => c.activo);
        if (cicloActivo) {
          setFormData(prev => ({ ...prev, cicloLectivoId: cicloActivo.id }));
        }
      } catch (err) {
        console.error('Error cargando datos:', err);
        setError('Error al cargar los datos necesarios');
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validar campos
    if (!formData.materiaId || !formData.nivelId || !formData.docenteId || !formData.cicloLectivoId) {
      setError('Todos los campos son requeridos');
      setIsLoading(false);
      return;
    }

    try {
      const dataToSend = {
        ...formData,
        codigo: formData.codigo || undefined, // Si esta vacio, el backend genera uno
      };
      await clasesApi.create(dataToSend);
      router.push('/dashboard/clases');
    } catch (err: any) {
      console.error('Error creando clase:', err);
      setError(err.response?.data?.message || 'Error al crear la clase');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/clases">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nueva Clase</h1>
          <p className="text-muted-foreground">Crea una nueva clase para tu institución</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Información de la Clase
            </CardTitle>
            <CardDescription>
              Selecciona la materia, nivel, docente y ciclo lectivo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Codigo */}
            <div className="space-y-2">
              <Label htmlFor="codigo">Codigo de la Clase (opcional)</Label>
              <Input
                id="codigo"
                placeholder="Ej: MAT-101, 7mo-A, etc. (se genera automaticamente si se deja vacio)"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Este codigo se usara para que los estudiantes se inscriban a la clase
              </p>
            </div>

            {/* Materia */}
            <div className="space-y-2">
              <Label htmlFor="materia">Materia *</Label>
              <Select
                value={formData.materiaId}
                onValueChange={(value) => setFormData({ ...formData, materiaId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una materia" />
                </SelectTrigger>
                <SelectContent>
                  {materias.length === 0 ? (
                    <SelectItem value="none" disabled>No hay materias disponibles</SelectItem>
                  ) : (
                    materias.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nombre}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {materias.length === 0 && (
                <p className="text-xs text-amber-600">
                  Primero debes crear materias en el sistema
                </p>
              )}
            </div>

            {/* Nivel */}
            <div className="space-y-2">
              <Label htmlFor="nivel">Nivel *</Label>
              <Select
                value={formData.nivelId}
                onValueChange={(value) => setFormData({ ...formData, nivelId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un nivel" />
                </SelectTrigger>
                <SelectContent>
                  {niveles.length === 0 ? (
                    <SelectItem value="none" disabled>No hay niveles disponibles</SelectItem>
                  ) : (
                    niveles.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.nombre}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {niveles.length === 0 && (
                <p className="text-xs text-amber-600">
                  Primero debes crear niveles en el sistema
                </p>
              )}
            </div>

            {/* Docente */}
            <div className="space-y-2">
              <Label htmlFor="docente">Docente *</Label>
              <Select
                value={formData.docenteId}
                onValueChange={(value) => setFormData({ ...formData, docenteId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un docente" />
                </SelectTrigger>
                <SelectContent>
                  {docentes.length === 0 ? (
                    <SelectItem value="none" disabled>No hay docentes disponibles</SelectItem>
                  ) : (
                    docentes.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.nombre} {d.apellido}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {docentes.length === 0 && (
                <p className="text-xs text-amber-600">
                  Primero debes crear usuarios con rol DOCENTE
                </p>
              )}
            </div>

            {/* Ciclo Lectivo */}
            <div className="space-y-2">
              <Label htmlFor="ciclo">Ciclo Lectivo *</Label>
              <Select
                value={formData.cicloLectivoId}
                onValueChange={(value) => setFormData({ ...formData, cicloLectivoId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un ciclo lectivo" />
                </SelectTrigger>
                <SelectContent>
                  {ciclos.length === 0 ? (
                    <SelectItem value="none" disabled>No hay ciclos disponibles</SelectItem>
                  ) : (
                    ciclos.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre} {c.activo && '(Activo)'}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {ciclos.length === 0 && (
                <p className="text-xs text-amber-600">
                  Primero debes crear un ciclo lectivo
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-4 pt-4">
              <Link href="/dashboard/clases" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Cancelar
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isLoading || !formData.materiaId || !formData.nivelId || !formData.docenteId || !formData.cicloLectivoId}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Crear Clase
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
