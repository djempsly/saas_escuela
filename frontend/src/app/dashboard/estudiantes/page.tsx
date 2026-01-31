'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { estudiantesApi } from '@/lib/api';
import { Users, Search, Loader2, Eye, FileText } from 'lucide-react';
import Link from 'next/link';

interface Estudiante {
  id: string;
  nombre: string;
  apellido: string;
  email?: string;
  username: string;
}

export default function EstudiantesPage() {
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const response = await estudiantesApi.getAll();
        setEstudiantes(response.data.data || response.data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  const filtered = estudiantes.filter(
    (e) =>
      e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.apellido.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Estudiantes</h1>
        <p className="text-muted-foreground">Lista de estudiantes de la institución</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar estudiante..."
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
      ) : filtered.length > 0 ? (
        <div className="grid gap-3">
          {filtered.map((est) => (
            <Card key={est.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-medium">
                    {est.nombre[0]}{est.apellido[0]}
                  </div>
                  <div>
                    <p className="font-medium">{est.nombre} {est.apellido}</p>
                    <p className="text-sm text-muted-foreground">@{est.username}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/dashboard/estudiantes/${est.id}`}>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4 mr-1" /> Ver
                    </Button>
                  </Link>
                  <Link href={`/dashboard/estudiantes/${est.id}/boletin`}>
                    <Button variant="outline" size="sm">
                      <FileText className="w-4 h-4 mr-1" /> Boletín
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay estudiantes registrados</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
