'use client';

import { useAuthStore } from '@/store/auth.store';
import { useInstitutionStore } from '@/store/institution.store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  GraduationCap,
  BookOpen,
  TrendingUp,
  Calendar,
  ClipboardCheck,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { branding } = useInstitutionStore();

  const primaryColor = branding?.colorPrimario || '#1a365d';

  // Estadísticas de ejemplo (en producción vendrían del API)
  const stats = [
    {
      title: 'Total Estudiantes',
      value: '1,234',
      change: '+12%',
      icon: Users,
      description: 'Este ciclo lectivo',
    },
    {
      title: 'Clases Activas',
      value: '48',
      change: '+3',
      icon: GraduationCap,
      description: 'En curso',
    },
    {
      title: 'Asistencia Promedio',
      value: '94.5%',
      change: '+2.3%',
      icon: ClipboardCheck,
      description: 'Últimos 30 días',
    },
    {
      title: 'Promedio General',
      value: '78.2',
      change: '+5.1',
      icon: TrendingUp,
      description: 'Sobre 100 puntos',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Saludo */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Bienvenido, {user?.nombre}
        </h1>
        <p className="text-muted-foreground">
          {branding?.nombre ? `${branding.nombre} - ` : ''}
          Aquí tienes un resumen de tu actividad
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
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
                  <span className="text-green-600">{stat.change}</span>{' '}
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Contenido adicional según rol */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Próximas actividades */}
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
            <div className="space-y-4">
              {[
                { title: 'Entrega de calificaciones P1', date: '15 Feb 2024', type: 'deadline' },
                { title: 'Reunión de padres', date: '20 Feb 2024', type: 'meeting' },
                { title: 'Inicio de evaluaciones P2', date: '1 Mar 2024', type: 'exam' },
              ].map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.date}</p>
                  </div>
                  <span
                    className="text-xs px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: `${primaryColor}15`,
                      color: primaryColor,
                    }}
                  >
                    {activity.type === 'deadline' ? 'Fecha límite' :
                     activity.type === 'meeting' ? 'Reunión' : 'Evaluación'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actividad reciente */}
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
            <div className="space-y-4">
              {[
                { action: 'Calificación registrada', detail: 'Matemáticas - 3ro Secundaria', time: 'Hace 2 horas' },
                { action: 'Asistencia tomada', detail: 'Física - 4to Secundaria', time: 'Hace 4 horas' },
                { action: 'Nuevo estudiante inscrito', detail: 'Juan Pérez - 1ro Secundaria', time: 'Ayer' },
              ].map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"
                >
                  <div
                    className="w-2 h-2 mt-2 rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.detail}</p>
                    <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
