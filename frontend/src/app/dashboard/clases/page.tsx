'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { clasesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import {
  GraduationCap,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  Users,
  BookOpen,
} from 'lucide-react';
import Link from 'next/link';

interface Clase {
  id: string;
  codigo: string;
  materia: { nombre: string };
  nivel: { nombre: string };
  docente: { nombre: string; apellido: string };
  cicloLectivo: { nombre: string };
  _count?: { inscripciones: number };
}

export default function ClasesPage() {
  const { user } = useAuthStore();
  const [clases, setClases] = useState<Clase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const canManage = ['DIRECTOR', 'COORDINADOR', 'COORDINADOR_ACADEMICO'].includes(user?.role || '');

  useEffect(() => {
    const fetchClases = async () => {
      try {
        const response = await clasesApi.getAll();
        setClases(response.data.data || response.data || []);
      } catch (error) {
        console.error('Error cargando clases:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClases();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta clase?')) return;
    try {
      await clasesApi.delete(id);
      setClases(clases.filter((c) => c.id !== id));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const filteredClases = clases.filter(
    (c) =>
      c.materia?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.nivel?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.docente?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clases</h1>
          <p className="text-muted-foreground">Gestiona las clases de tu institución</p>
        </div>
        {canManage && (
          <Link href="/dashboard/clases/nueva">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Clase
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por materia, nivel o docente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredClases.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClases.map((clase) => (
            <Card key={clase.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">
                    {clase.codigo}
                  </span>
                </div>
                <h3 className="font-semibold text-lg mb-1">{clase.materia?.nombre}</h3>
                <p className="text-sm text-muted-foreground mb-3">{clase.nivel?.nombre}</p>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Docente:</span>{' '}
                    {clase.docente?.nombre} {clase.docente?.apellido}
                  </p>
                  <p className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {clase._count?.inscripciones || 0} estudiantes
                  </p>
                </div>
                {canManage && (
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Link href={`/dashboard/clases/${clase.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        Ver
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500"
                      onClick={() => handleDelete(clase.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay clases</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'No se encontraron resultados' : 'Comienza creando tu primera clase'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
