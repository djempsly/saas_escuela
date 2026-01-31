'use client';

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useInstitutionStore } from '@/store/institution.store';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Loader2 } from 'lucide-react';

// Usar useSyncExternalStore para detectar hidratación sin cascading renders
const emptySubscribe = () => () => {};
const useHydrated = () => useSyncExternalStore(
  emptySubscribe,
  () => true,
  () => false
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const { isAuthenticated, user } = useAuthStore();
  const { branding } = useInstitutionStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const hasRedirected = useRef(false);

  // Redirigir si no está autenticado (solo una vez)
  useEffect(() => {
    if (hydrated && !isAuthenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push('/login');
    }
  }, [hydrated, isAuthenticated, router]);

  // GUARD: Forzar cambio de contraseña si es requerido
  useEffect(() => {
    if (
      hydrated &&
      isAuthenticated &&
      user?.debeCambiarPassword &&
      pathname !== '/dashboard/cambiar-password'
    ) {
      router.replace('/dashboard/cambiar-password');
    }
  }, [hydrated, isAuthenticated, user?.debeCambiarPassword, pathname, router]);

  // Aplicar colores de branding
  useLayoutEffect(() => {
    if (branding) {
      document.documentElement.style.setProperty('--color-primary', branding.colorPrimario);
      document.documentElement.style.setProperty('--color-secondary', branding.colorSecundario);
    }
  }, [branding]);

  // Mostrar loading mientras se hidrata o no está autenticado
  if (!hydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si debe cambiar contraseña, mostrar solo el contenido sin sidebar/header
  if (user?.debeCambiarPassword && pathname === '/dashboard/cambiar-password') {
    return (
      <div className="min-h-screen bg-slate-50">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        branding={branding}
        user={user}
      />

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <Header
          branding={branding}
          user={user}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
