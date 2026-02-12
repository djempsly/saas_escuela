'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { institucionesApi } from '@/lib/api';
import {
  Building2,
  Users,
  GraduationCap,
  Activity,
  Plus,
  TrendingUp,
  School,
  Globe,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalInstituciones: number;
  totalUsuarios: number;
  totalEstudiantes: number;
  actividadesRecientes: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalInstituciones: 0,
    totalUsuarios: 0,
    totalEstudiantes: 0,
    actividadesRecientes: 0,
  });
  interface Institucion {
    id: string;
    nombre: string;
    pais: string;
    sistemaEducativo: string;
    activo: boolean;
    _count?: { users?: number; estudiantes?: number };
  }
  const [instituciones, setInstituciones] = useState<Institucion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await institucionesApi.getAll();
        const data = response.data.data || response.data || [];
        setInstituciones(data);
        setStats({
          totalInstituciones: data.length,
          totalUsuarios: data.reduce((acc: number, inst: Institucion) => acc + (inst._count?.users || 0), 0),
          totalEstudiantes: data.reduce((acc: number, inst: Institucion) => acc + (inst._count?.estudiantes || 0), 0),
          actividadesRecientes: 0,
        });
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const statCards = [
    {
      title: 'Instituciones',
      value: stats.totalInstituciones,
      icon: Building2,
      color: 'bg-blue-500',
      href: '/dashboard/admin/instituciones',
    },
    {
      title: 'Usuarios Totales',
      value: stats.totalUsuarios,
      icon: Users,
      color: 'bg-green-500',
      href: '/dashboard/admin/usuarios',
    },
    {
      title: 'Estudiantes',
      value: stats.totalEstudiantes,
      icon: GraduationCap,
      color: 'bg-purple-500',
      href: '/dashboard/admin/estudiantes',
    },
    {
      title: 'Actividades',
      value: stats.actividadesRecientes,
      icon: Activity,
      color: 'bg-orange-500',
      href: '/dashboard/admin/actividades',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Panel de Administrador
          </h1>
          <p className="text-muted-foreground">
            Gestiona todas las instituciones y configuraciones del sistema
          </p>
        </div>
        <Link href="/dashboard/admin/instituciones/nueva">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Institución
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoading ? '...' : stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <TrendingUp className="w-3 h-3 inline mr-1" />
                    Ver detalles
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Instituciones Recientes */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="w-5 h-5" />
              Instituciones Recientes
            </CardTitle>
            <CardDescription>
              Últimas instituciones registradas en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4 text-muted-foreground">
                Cargando...
              </div>
            ) : instituciones.length > 0 ? (
              <div className="space-y-3">
                {instituciones.slice(0, 5).map((inst) => (
                  <div
                    key={inst.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{inst.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {inst.pais} - {inst.sistemaEducativo}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      inst.activo
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {inst.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No hay instituciones registradas
                </p>
                <Link href="/dashboard/admin/instituciones/nueva">
                  <Button variant="outline" className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Crear primera institución
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acciones Rápidas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Acciones Rápidas
            </CardTitle>
            <CardDescription>
              Tareas comunes de administración
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/dashboard/admin/instituciones/nueva">
                <Button variant="outline" className="w-full h-20 flex-col">
                  <Building2 className="w-6 h-6 mb-2" />
                  <span className="text-xs">Nueva Institución</span>
                </Button>
              </Link>
              <Link href="/dashboard/admin/actividades/nueva">
                <Button variant="outline" className="w-full h-20 flex-col">
                  <Activity className="w-6 h-6 mb-2" />
                  <span className="text-xs">Nueva Actividad</span>
                </Button>
              </Link>
              <Link href="/dashboard/admin/configuracion">
                <Button variant="outline" className="w-full h-20 flex-col">
                  <Users className="w-6 h-6 mb-2" />
                  <span className="text-xs">Gestión Usuarios</span>
                </Button>
              </Link>
              <Link href="/dashboard/reportes">
                <Button variant="outline" className="w-full h-20 flex-col">
                  <TrendingUp className="w-6 h-6 mb-2" />
                  <span className="text-xs">Ver Reportes</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
