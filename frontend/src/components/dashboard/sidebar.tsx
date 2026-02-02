'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { InstitutionBranding } from '@/store/institution.store';
import { User } from '@/store/auth.store';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  ClipboardList,
  BarChart3,
  Settings,
  Building2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  DollarSign,
  PieChart,
  UserCog,
  Layers,
  BookMarked,
  UserPlus,
  Briefcase,
} from 'lucide-react';
import Image from 'next/image';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  branding: InstitutionBranding | null;
  user: User | null;
}

const menuItems = {
  ADMIN: [
    { href: '/dashboard/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/admin/usuarios', label: 'Usuarios', icon: Users },
    { href: '/dashboard/admin/directores', label: 'Directores', icon: UserCog },
    { href: '/dashboard/admin/instituciones', label: 'Instituciones', icon: Building2 },
    { href: '/dashboard/admin/actividades', label: 'Actividades', icon: BookOpen },
    { href: '/dashboard/admin/configuracion', label: 'Configuración', icon: Settings },
  ],
  DIRECTOR: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/usuarios', label: 'Usuarios', icon: Users },
    { href: '/dashboard/personal', label: 'Personal', icon: Briefcase },
    { href: '/dashboard/estudiantes', label: 'Estudiantes', icon: GraduationCap },
    { href: '/dashboard/clases', label: 'Clases', icon: BookOpen },
    { href: '/dashboard/calificaciones', label: 'Calificaciones', icon: ClipboardList },
    { href: '/dashboard/materias', label: 'Materias', icon: BookMarked },
    { href: '/dashboard/niveles', label: 'Niveles', icon: Layers },
    { href: '/dashboard/inscripciones', label: 'Inscripciones', icon: UserPlus },
    { href: '/dashboard/ciclos', label: 'Ciclos Lectivos', icon: Calendar },
    { href: '/dashboard/calendario', label: 'Calendario', icon: Calendar },
    { href: '/dashboard/mensajes', label: 'Mensajes', icon: MessageSquare },
    { href: '/dashboard/cobros', label: 'Cobros', icon: DollarSign },
    { href: '/dashboard/estadisticas', label: 'Estadísticas', icon: PieChart },
    { href: '/dashboard/actividades', label: 'Actividades', icon: BookOpen },
    { href: '/dashboard/reportes', label: 'Reportes', icon: BarChart3 },
  ],
  COORDINADOR: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/clases', label: 'Clases', icon: GraduationCap },
    { href: '/dashboard/calificaciones', label: 'Calificaciones', icon: ClipboardList },
    { href: '/dashboard/calendario', label: 'Calendario', icon: Calendar },
    { href: '/dashboard/mensajes', label: 'Mensajes', icon: MessageSquare },
    { href: '/dashboard/estudiantes', label: 'Estudiantes', icon: Users },
    { href: '/dashboard/reportes', label: 'Reportes', icon: BarChart3 },
  ],
  COORDINADOR_ACADEMICO: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/clases', label: 'Clases', icon: GraduationCap },
    { href: '/dashboard/calificaciones', label: 'Calificaciones', icon: BookOpen },
    { href: '/dashboard/asistencia', label: 'Asistencia', icon: ClipboardList },
    { href: '/dashboard/calendario', label: 'Calendario', icon: Calendar },
    { href: '/dashboard/mensajes', label: 'Mensajes', icon: MessageSquare },
    { href: '/dashboard/estudiantes', label: 'Estudiantes', icon: Users },
    { href: '/dashboard/reportes', label: 'Reportes', icon: BarChart3 },
  ],
  DOCENTE: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/mis-clases', label: 'Mis Clases', icon: GraduationCap },
    { href: '/dashboard/tareas', label: 'Tareas', icon: ClipboardList },
    { href: '/dashboard/asistencia', label: 'Asistencia', icon: ClipboardList },
    { href: '/dashboard/calificaciones', label: 'Calificaciones', icon: BookOpen },
    { href: '/dashboard/calendario', label: 'Calendario', icon: Calendar },
    { href: '/dashboard/mensajes', label: 'Mensajes', icon: MessageSquare },
  ],
  ESTUDIANTE: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/mis-clases', label: 'Mis Clases', icon: GraduationCap },
    { href: '/dashboard/mis-tareas', label: 'Mis Tareas', icon: ClipboardList },
    { href: '/dashboard/calificaciones', label: 'Calificaciones', icon: BookOpen },
    { href: '/dashboard/asistencia', label: 'Mi Asistencia', icon: ClipboardList },
    { href: '/dashboard/calendario', label: 'Calendario', icon: Calendar },
    { href: '/dashboard/mensajes', label: 'Mensajes', icon: MessageSquare },
  ],
  SECRETARIA: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/inscripciones', label: 'Inscripciones', icon: Users },
    { href: '/dashboard/estudiantes', label: 'Estudiantes', icon: GraduationCap },
    { href: '/dashboard/cobros', label: 'Cobros', icon: DollarSign },
    { href: '/dashboard/mensajes', label: 'Mensajes', icon: MessageSquare },
  ],
};

export function Sidebar({ isOpen, onToggle, branding, user }: SidebarProps) {
  const pathname = usePathname();
  const role = (user?.role || 'ESTUDIANTE') as keyof typeof menuItems;
  const baseItems = menuItems[role] || menuItems.ESTUDIANTE;

  // Filtrar items según configuración de la institución
  const items = baseItems.filter((item) => {
    // Para DIRECTOR: ocultar Actividades si autogestionActividades está deshabilitado
    if (role === 'DIRECTOR' && item.label === 'Actividades') {
      return branding?.autogestionActividades === true;
    }
    return true;
  });

  const primaryColor = branding?.colorPrimario || '#1a365d';

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen transition-all duration-300 border-r bg-white',
        isOpen ? 'w-64' : 'w-20'
      )}
    >
      {/* Logo y nombre */}
      <div
        className="flex items-center h-16 px-4 border-b"
        style={{ backgroundColor: primaryColor }}
      >
        {branding?.logoUrl ? (
          <Image
            src={branding.logoUrl}
            alt={branding.nombre}
            width={40}
            height={40}
            className="rounded"
          />
        ) : (
          <div className="w-10 h-10 rounded bg-white/20 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
        )}
        {isOpen && (
          <span className="ml-3 font-semibold text-white truncate">
            {branding?.nombre || 'Plataforma Escolar'}
          </span>
        )}
      </div>

      {/* Menú de navegación */}
      <nav className="p-4 space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2 rounded-lg transition-colors',
                isActive
                  ? 'text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
              style={isActive ? { backgroundColor: primaryColor } : {}}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {isOpen && <span className="ml-3">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Botón de toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 p-1 bg-white border rounded-full shadow-md hover:bg-slate-50"
      >
        {isOpen ? (
          <ChevronLeft className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>
    </aside>
  );
}
