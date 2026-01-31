'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, FileDown, Users, GraduationCap, ClipboardCheck, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function ReportesPage() {
  const reportes = [
    {
      title: 'Boletines de Calificaciones',
      description: 'Genera boletines individuales o masivos',
      icon: GraduationCap,
      href: '/dashboard/reportes/boletines',
      color: 'bg-blue-500',
    },
    {
      title: 'Reporte de Asistencia',
      description: 'Estadísticas de asistencia por clase o estudiante',
      icon: ClipboardCheck,
      href: '/dashboard/reportes/asistencia',
      color: 'bg-green-500',
    },
    {
      title: 'Listado de Estudiantes',
      description: 'Exporta listados por nivel o clase',
      icon: Users,
      href: '/dashboard/reportes/estudiantes',
      color: 'bg-purple-500',
    },
    {
      title: 'Rendimiento Académico',
      description: 'Análisis de promedios y tendencias',
      icon: TrendingUp,
      href: '/dashboard/reportes/rendimiento',
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
        <p className="text-muted-foreground">
          Genera y exporta reportes de tu institución
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {reportes.map((reporte) => {
          const Icon = reporte.icon;
          return (
            <Card key={reporte.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className={`p-3 rounded-lg ${reporte.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">{reporte.title}</CardTitle>
                  <CardDescription>{reporte.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Link href={reporte.href}>
                  <Button variant="outline" className="w-full">
                    <FileDown className="w-4 h-4 mr-2" />
                    Generar Reporte
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
