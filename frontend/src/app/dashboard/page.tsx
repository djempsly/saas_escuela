'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useInstitutionStore } from '@/store/institution.store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboardApi } from '@/lib/api';
import {
  Users,
  GraduationCap,
  BookOpen,
  TrendingUp,
  Calendar,
  ClipboardCheck,
  Loader2,
  Building2,
  Layers,
  FileText,
  UserCheck,
} from 'lucide-react';

interface DashboardStats {
  cicloActivo: { id: string; nombre: string } | null;
  estadisticas: {
    totalEstudiantes?: number;
    totalDocentes?: number;
    totalPersonal?: number;
    totalClases?: number;
    totalNiveles?: number;
    totalMaterias?: number;
    totalInscripciones?: number;
    promedioAsistencia?: number;
    tareasPendientes?: number;
    promedioGeneral?: number;
  };
  proximosEventos?: Array<{
    id: string;
    titulo: string;
    fechaInicio: string;
    tipo: string;
  }>;
  clases?: Array<{
    id: string;
    materia: string;
    nivel: string;
    estudiantes?: number;
    docente?: string;
  }>;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { branding } = useInstitutionStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const primaryColor = branding?.colorPrimario || '#1a365d';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await dashboardApi.getStats();
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Stats cards based on role
  const getStatsCards = () => {
    if (!stats || !stats.estadisticas) return [];

    const role = user?.role;
    const est = stats.estadisticas;

    // Admin/Director/Coordinador stats
    if (role === 'DIRECTOR' || role === 'COORDINADOR' || role === 'COORDINADOR_ACADEMICO' || role === 'SECRETARIA' || role === 'ADMIN') {
      return [
        {
          title: 'Total Estudiantes',
          value: est.totalEstudiantes?.toLocaleString() || '0',
          icon: Users,
          description: 'Activos en la institución',
        },
        {
          title: 'Total Docentes',
          value: est.totalDocentes?.toLocaleString() || '0',
          icon: UserCheck,
          description: 'Activos en la institución',
        },
        {
          title: 'Clases Activas',
          value: est.totalClases?.toLocaleString() || '0',
          icon: GraduationCap,
          description: stats.cicloActivo ? stats.cicloActivo.nombre : 'Sin ciclo activo',
        },
        {
          title: 'Asistencia Promedio',
          value: est.promedioAsistencia ? `${est.promedioAsistencia}%` : '0%',
          icon: ClipboardCheck,
          description: 'Últimos 30 días',
        },
      ];
    }

    // Docente stats
    if (role === 'DOCENTE') {
      return [
        {
          title: 'Mis Clases',
          value: est.totalClases?.toLocaleString() || '0',
          icon: GraduationCap,
          description: stats.cicloActivo ? stats.cicloActivo.nombre : 'Sin ciclo activo',
        },
        {
          title: 'Total Estudiantes',
          value: est.totalEstudiantes?.toLocaleString() || '0',
          icon: Users,
          description: 'En mis clases',
        },
        {
          title: 'Tareas Pendientes',
          value: est.tareasPendientes?.toLocaleString() || '0',
          icon: FileText,
          description: 'Por calificar',
        },
        {
          title: 'Clases Asignadas',
          value: stats.clases?.length?.toLocaleString() || '0',
          icon: Building2,
          description: 'Este ciclo',
        },
      ];
    }

    // Estudiante stats
    if (role === 'ESTUDIANTE') {
      return [
        {
          title: 'Mis Clases',
          value: est.totalClases?.toLocaleString() || '0',
          icon: GraduationCap,
          description: 'Inscrito actualmente',
        },
        {
          title: 'Tareas Pendientes',
          value: est.tareasPendientes?.toLocaleString() || '0',
          icon: FileText,
          description: 'Por entregar',
        },
        {
          title: 'Promedio General',
          value: est.promedioGeneral?.toFixed(1) || '0.0',
          icon: TrendingUp,
          description: 'Este ciclo',
        },
        {
          title: 'Materias',
          value: stats.clases?.length?.toLocaleString() || '0',
          icon: BookOpen,
          description: 'Activas',
        },
      ];
    }

    return [];
  };

  // Additional stats for directors
  const getAdditionalStats = () => {
    if (!stats || !stats.estadisticas || !['DIRECTOR', 'COORDINADOR', 'COORDINADOR_ACADEMICO', 'SECRETARIA'].includes(user?.role || '')) {
      return null;
    }

    const est = stats.estadisticas;
    return [
      { label: 'Personal', value: est.totalPersonal || 0, icon: UserCheck },
      { label: 'Niveles', value: est.totalNiveles || 0, icon: Layers },
      { label: 'Materias', value: est.totalMaterias || 0, icon: BookOpen },
      { label: 'Inscripciones', value: est.totalInscripciones || 0, icon: FileText },
    ];
  };

  const statsCards = getStatsCards();
  const additionalStats = getAdditionalStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Saludo */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Bienvenido, {user?.nombre}
        </h1>
        <p className="text-muted-foreground">
          {branding?.nombre ? `${branding.nombre} - ` : ''}
          {stats?.cicloActivo ? `Ciclo: ${stats.cicloActivo.nombre}` : 'Aquí tienes un resumen de tu actividad'}
        </p>
      </div>

      {/* Estadísticas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <Icon
                    className="w-4 h-4"
                    style={{ color: primaryColor }}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Estadísticas adicionales para directores */}
      {additionalStats && (
        <div className="grid gap-4 md:grid-cols-4">
          {additionalStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="bg-slate-50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-xl font-semibold">{stat.value}</p>
                    </div>
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Contenido adicional según rol */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Próximos eventos */}
        {stats?.proximosEventos && stats.proximosEventos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Próximos Eventos
              </CardTitle>
              <CardDescription>
                Eventos programados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.proximosEventos.map((evento) => (
                  <div
                    key={evento.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{evento.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(evento.fechaInicio).toLocaleDateString('es-ES', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                    </div>
                    <span
                      className="text-xs px-2 py-1 rounded-full"
                      style={{
                        backgroundColor: `${primaryColor}15`,
                        color: primaryColor,
                      }}
                    >
                      {evento.tipo}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mis clases (para docentes y estudiantes) */}
        {stats?.clases && stats.clases.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                {user?.role === 'DOCENTE' ? 'Mis Clases' : 'Mis Materias'}
              </CardTitle>
              <CardDescription>
                {user?.role === 'DOCENTE' ? 'Clases que imparto' : 'Materias inscritas'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.clases.slice(0, 5).map((clase) => (
                  <div
                    key={clase.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{clase.materia}</p>
                      <p className="text-xs text-muted-foreground">{clase.nivel}</p>
                    </div>
                    {clase.estudiantes !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        {clase.estudiantes} estudiantes
                      </span>
                    )}
                    {clase.docente && (
                      <span className="text-xs text-muted-foreground">
                        {clase.docente}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Placeholder si no hay eventos ni clases */}
        {(!stats?.proximosEventos || stats.proximosEventos.length === 0) && (!stats?.clases || stats.clases.length === 0) && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Próximas Actividades
                </CardTitle>
                <CardDescription>
                  Eventos y tareas pendientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay eventos próximos</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Actividad Reciente
                </CardTitle>
                <CardDescription>
                  Últimas acciones en el sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay actividad reciente</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
