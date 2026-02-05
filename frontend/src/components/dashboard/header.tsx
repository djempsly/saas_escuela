'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore, User } from '@/store/auth.store';
import { useInstitutionStore, InstitutionBranding } from '@/store/institution.store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Menu, LogOut, User as UserIcon, Settings, Bell } from 'lucide-react';

interface HeaderProps {
  branding: InstitutionBranding | null;
  user: User | null;
  onMenuClick: () => void;
}

export function Header({ branding, user, onMenuClick }: HeaderProps) {
  const router = useRouter();
  const { logout } = useAuthStore();
  const { clearBranding } = useInstitutionStore();

  const handleLogout = () => {
    const slug = branding?.slug;
    const customDomain = branding?.dominioPersonalizado;
    const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
    
    // Si estamos en un dominio personalizado, la redirección a /login
    // nos mantendrá en ese dominio y el backend resolverá el tenant.
    // Si estamos en el dominio principal (localhost, etc), usamos el slug.
    const isCustomDomain = customDomain && currentHost === customDomain;

    logout();
    clearBranding();

    if (isCustomDomain) {
      router.push('/login');
    } else if (slug) {
      router.push(`/${slug}/login`);
    } else {
      router.push('/login');
    }
  };

  const getInitials = (nombre?: string, apellido?: string) => {
    return `${nombre?.charAt(0) || ''}${apellido?.charAt(0) || ''}`.toUpperCase();
  };

  const getRoleName = (role?: string) => {
    const roles: Record<string, string> = {
      ADMIN: 'Administrador',
      DIRECTOR: 'Director',
      COORDINADOR: 'Coordinador',
      COORDINADOR_ACADEMICO: 'Coordinador Académico',
      DOCENTE: 'Docente',
      ESTUDIANTE: 'Estudiante',
      SECRETARIA: 'Secretaria',
    };
    return roles[role || ''] || role;
  };

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-white border-b"
    >
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </Button>
        {branding?.lema && (
          <span className="hidden md:block text-sm text-muted-foreground italic">
            &ldquo;{branding.lema}&rdquo;
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Notificaciones */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </Button>

        {/* Menú de usuario */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback
                  style={{ backgroundColor: branding?.colorPrimario || '#1a365d' }}
                  className="text-white text-xs"
                >
                  {getInitials(user?.nombre, user?.apellido)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start text-sm">
                <span className="font-medium">
                  {user?.nombre} {user?.apellido}
                </span>
                <span className="text-xs text-muted-foreground">
                  {getRoleName(user?.role)}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/dashboard/perfil')}>
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/dashboard/configuracion')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configuración</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
