'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { InstitutionBranding } from '@/store/institution.store';
import { User } from '@/store/auth.store';
import { getMediaUrl } from '@/lib/api';
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
  CheckSquare,
  FileText,
  Clock,
  Table2,
  Upload,
  ScrollText,
  Activity,
  ArrowUpCircle,
  UserMinus,
  FileSpreadsheet,
} from 'lucide-react';
import Image from 'next/image';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  branding: InstitutionBranding | null;
  user: User | null;
}

const menuItems = {
  // Super Administrador - Gestiona todo el sistema multi-tenant
  ADMIN: [
    { href: '/dashboard/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/admin/usuarios', label: 'Usuarios', icon: Users },
    { href: '/dashboard/admin/directores', label: 'Directores', icon: UserCog },
    { href: '/dashboard/admin/instituciones', label: 'Instituciones', icon: Building2 },
    { href: '/dashboard/admin/actividades', label: 'Actividades', icon: BookOpen },
    { href: '/dashboard/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
    { href: '/dashboard/admin/jobs', label: 'Monitor de Jobs', icon: Activity },
    { href: '/dashboard/admin/configuracion', label: 'Configuración', icon: Settings },
  ],

  // Director - Gestiona una institución completa
  DIRECTOR: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/usuarios', label: 'Usuarios', icon: Users },
    { href: '/dashboard/personal', label: 'Personal', icon: Briefcase },
    { href: '/dashboard/estudiantes', label: 'Estudiantes', icon: GraduationCap },
    { href: '/dashboard/estudiantes/importar', label: 'Importar Estudiantes', icon: Upload },
    { href: '/dashboard/clases', label: 'Clases', icon: BookOpen },
    { href: '/dashboard/calificaciones', label: 'Calificaciones', icon: ClipboardList },
    { href: '/dashboard/sabana-notas', label: 'Sábana de Notas', icon: Table2 },
    { href: '/dashboard/materias', label: 'Materias', icon: BookMarked },
    { href: '/dashboard/niveles', label: 'Niveles', icon: Layers },
    { href: '/dashboard/ciclos-educativos', label: 'Ciclos Educativos', icon: Clock },
    { href: '/dashboard/inscripciones', label: 'Inscripciones', icon: UserPlus },
    { href: '/dashboard/ciclos', label: 'Ciclos Lectivos', icon: Calendar },
    { href: '/dashboard/calendario', label: 'Calendario', icon: Calendar },
    { href: '/dashboard/mensajes', label: 'Mensajes', icon: MessageSquare },
    { href: '/dashboard/cobros', label: 'Cobros', icon: DollarSign },
    { href: '/dashboard/estadisticas', label: 'Estadísticas', icon: PieChart },
    { href: '/dashboard/promocion', label: 'Promoción', icon: ArrowUpCircle },
    { href: '/dashboard/desinscripcion', label: 'Desinscripción', icon: UserMinus },
    { href: '/dashboard/sabana-notas/exportar', label: 'Exportar Sábana', icon: FileSpreadsheet },
    { href: '/dashboard/actividades', label: 'Actividades', icon: FileText, conditional: 'autogestionActividades' },
    { href: '/dashboard/historial', label: 'Audit Logs', icon: ScrollText },
    { href: '/dashboard/reportes', label: 'Reportes', icon: BarChart3 },
  ],

  // Coordinador - Supervisa pedagogía: clases, calificaciones, asistencia dentro de sus niveles
  COORDINADOR: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/clases', label: 'Clases', icon: BookOpen },
    { href: '/dashboard/calificaciones', label: 'Calificaciones', icon: ClipboardList },
    { href: '/dashboard/sabana-notas', label: 'Sábana de Notas', icon: Table2 },
    { href: '/dashboard/asistencia', label: 'Asistencia', icon: CheckSquare },
    { href: '/dashboard/tareas', label: 'Tareas', icon: FileText },
    { href: '/dashboard/calendario', label: 'Calendario', icon: Calendar },
    { href: '/dashboard/mensajes', label: 'Mensajes', icon: MessageSquare },
    { href: '/dashboard/reportes', label: 'Reportes', icon: BarChart3 },
  ],

  // Coordinador Académico - Admin académico: importar estudiantes, inscripciones, gestión amplia
  COORDINADOR_ACADEMICO: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/estudiantes', label: 'Estudiantes', icon: GraduationCap },
    { href: '/dashboard/estudiantes/importar', label: 'Importar Estudiantes', icon: Upload },
    { href: '/dashboard/clases', label: 'Clases', icon: BookOpen },
    { href: '/dashboard/calificaciones', label: 'Calificaciones', icon: ClipboardList },
    { href: '/dashboard/sabana-notas', label: 'Sábana de Notas', icon: Table2 },
    { href: '/dashboard/asistencia', label: 'Asistencia', icon: CheckSquare },
    { href: '/dashboard/materias', label: 'Materias', icon: BookMarked },
    { href: '/dashboard/niveles', label: 'Niveles', icon: Layers },
    { href: '/dashboard/inscripciones', label: 'Inscripciones', icon: UserPlus },
    { href: '/dashboard/cobros', label: 'Cobros', icon: DollarSign },
    { href: '/dashboard/calendario', label: 'Calendario', icon: Calendar },
    { href: '/dashboard/mensajes', label: 'Mensajes', icon: MessageSquare },
    { href: '/dashboard/reportes', label: 'Reportes', icon: BarChart3 },
  ],

  // Docente - Gestiona sus clases y estudiantes
  DOCENTE: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/mis-clases', label: 'Mis Clases', icon: BookOpen },
    { href: '/dashboard/tareas', label: 'Tareas', icon: FileText },
    { href: '/dashboard/asistencia', label: 'Asistencia', icon: CheckSquare },
    { href: '/dashboard/calificaciones', label: 'Calificaciones', icon: ClipboardList },
    { href: '/dashboard/sabana-notas', label: 'Sábana de Notas', icon: Table2 },
    { href: '/dashboard/calendario', label: 'Calendario', icon: Calendar },
    { href: '/dashboard/mensajes', label: 'Mensajes', icon: MessageSquare },
  ],

  // Estudiante - Ve sus datos académicos
  ESTUDIANTE: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/mis-clases', label: 'Mis Clases', icon: BookOpen },
    { href: '/dashboard/mis-tareas', label: 'Mis Tareas', icon: FileText },
    { href: '/dashboard/calificaciones', label: 'Calificaciones', icon: ClipboardList },
    { href: '/dashboard/asistencia', label: 'Mi Asistencia', icon: CheckSquare },
    { href: '/dashboard/calendario', label: 'Calendario', icon: Calendar },
    { href: '/dashboard/mensajes', label: 'Mensajes', icon: MessageSquare },
  ],

  // Secretaria - Gestión administrativa
  SECRETARIA: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/estudiantes', label: 'Estudiantes', icon: GraduationCap },
    { href: '/dashboard/estudiantes/importar', label: 'Importar Estudiantes', icon: Upload },
    { href: '/dashboard/inscripciones', label: 'Inscripciones', icon: UserPlus },
    { href: '/dashboard/cobros', label: 'Cobros', icon: DollarSign },
    { href: '/dashboard/calendario', label: 'Calendario', icon: Calendar },
    { href: '/dashboard/mensajes', label: 'Mensajes', icon: MessageSquare },
  ],
};

type MenuItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  conditional?: string;
};

export function Sidebar({ isOpen, onToggle, branding, user }: SidebarProps) {
  const pathname = usePathname();
  const role = (user?.role || 'ESTUDIANTE') as keyof typeof menuItems;
  const baseItems = (menuItems[role] || menuItems.ESTUDIANTE) as MenuItem[];

  // Filtrar items según configuración de la institución
  const items = baseItems.filter((item) => {
    // Filtrar items condicionales
    if (item.conditional === 'autogestionActividades') {
      return branding?.autogestionActividades === true;
    }
    return true;
  });

  const primaryColor = branding?.colorPrimario || '#1a365d';

  // Función para determinar si una ruta está activa
  const isRouteActive = (href: string) => {
    if (href === '/dashboard' || href === '/dashboard/admin') {
      return pathname === href;
    }
    // Para otras rutas, verificar si comienza con el href
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen transition-all duration-300 flex flex-col',
        isOpen ? 'w-64' : 'w-20'
      )}
      style={{ backgroundColor: primaryColor }}
    >
      {/* Logo y nombre */}
      <div
        className="flex items-center h-16 px-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}
      >
        {branding?.logoUrl ? (
          <Image
            src={getMediaUrl(branding.logoUrl)}
            alt={branding.nombre}
            width={40}
            height={40}
            className="rounded"
            unoptimized
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

      {/* Menú de navegación con scroll */}
      <nav className="p-4 space-y-1 overflow-y-auto flex-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = isRouteActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2 rounded-lg transition-colors',
                isActive
                  ? 'bg-white/20 text-white font-medium'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
              title={!isOpen ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {isOpen && <span className="ml-3">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Indicador de rol (solo cuando sidebar está expandido) */}
      {isOpen && (
        <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          <div className="text-xs text-white/50">
            Rol: <span className="font-medium text-white/80">{role.replace('_', ' ')}</span>
          </div>
        </div>
      )}

      {/* Botón de toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 p-1 rounded-full shadow-md border text-white"
        style={{ backgroundColor: primaryColor }}
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
