'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Define all available roles
export type Role =
  | 'ADMIN'
  | 'DIRECTOR'
  | 'COORDINADOR'
  | 'COORDINADOR_ACADEMICO'
  | 'DOCENTE'
  | 'ESTUDIANTE'
  | 'SECRETARIA';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: Role[];
  fallbackUrl?: string;
  showAccessDenied?: boolean;
}

/**
 * RoleGuard component protects routes based on user roles.
 *
 * @param allowedRoles - Array of roles that can access this content
 * @param fallbackUrl - URL to redirect to if access is denied (default: /dashboard)
 * @param showAccessDenied - If true, shows an access denied message instead of redirecting
 *
 * @example
 * // Only admins can access
 * <RoleGuard allowedRoles={['ADMIN']}>
 *   <AdminContent />
 * </RoleGuard>
 *
 * @example
 * // Directors and coordinators can access
 * <RoleGuard allowedRoles={['DIRECTOR', 'COORDINADOR', 'COORDINADOR_ACADEMICO']}>
 *   <ManagementContent />
 * </RoleGuard>
 */
export function RoleGuard({
  children,
  allowedRoles,
  fallbackUrl = '/dashboard',
  showAccessDenied = false,
}: RoleGuardProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const hasAccess = isAuthenticated && user && allowedRoles.includes(user.role as Role);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (!hasAccess && !showAccessDenied) {
      router.replace(fallbackUrl);
    }
  }, [isAuthenticated, hasAccess, showAccessDenied, fallbackUrl, router]);

  // Loading state while checking
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show access denied message if configured
  if (!hasAccess) {
    if (showAccessDenied) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <ShieldAlert className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle>Acceso Denegado</CardTitle>
              <CardDescription>
                No tienes permiso para acceder a esta sección.
                Tu rol actual es: <strong>{user.role}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link href="/dashboard">
                <Button>Volver al Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Redirecting state
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

// Pre-configured guards for common use cases
export function AdminOnly({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['ADMIN']} showAccessDenied>
      {children}
    </RoleGuard>
  );
}

export function DirectorOnly({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['DIRECTOR']} showAccessDenied>
      {children}
    </RoleGuard>
  );
}

export function StaffOnly({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard
      allowedRoles={['ADMIN', 'DIRECTOR', 'COORDINADOR', 'COORDINADOR_ACADEMICO', 'DOCENTE', 'SECRETARIA']}
      showAccessDenied
    >
      {children}
    </RoleGuard>
  );
}

export function ManagementOnly({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard
      allowedRoles={['ADMIN', 'DIRECTOR', 'COORDINADOR', 'COORDINADOR_ACADEMICO']}
      showAccessDenied
    >
      {children}
    </RoleGuard>
  );
}
