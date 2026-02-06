import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface InstitutionBranding {
  id: string;
  nombre: string;
  lema?: string;
  logoUrl?: string;
  logoPosicion?: string;
  fondoLoginUrl?: string;
  colorPrimario: string;
  colorSecundario: string;
  pais?: string;
  sistema?: string;
  sistemaEducativo?: string;
  idiomaPrincipal?: string;
  slug?: string;
  dominioPersonalizado?: string;
  autogestionActividades?: boolean;
}

interface InstitutionState {
  branding: InstitutionBranding | null;
  isLoading: boolean;
  setBranding: (branding: InstitutionBranding | null) => void;
  setLoading: (loading: boolean) => void;
  clearBranding: () => void;
}

// Colores por defecto
const defaultBranding: Partial<InstitutionBranding> = {
  colorPrimario: '#1a365d', // Azul oscuro
  colorSecundario: '#f7fafc', // Gris claro
};

export const useInstitutionStore = create<InstitutionState>()(
  persist(
    (set) => ({
      branding: null,
      isLoading: false,

      setBranding: (branding) => {
        set({ branding });
        // Aplicar variables CSS cuando se actualiza el branding
        if (typeof window !== 'undefined' && branding) {
          const primary = branding.colorPrimario || defaultBranding.colorPrimario!;
          const secondary = branding.colorSecundario || defaultBranding.colorSecundario!;
          // Setear --primary para que Tailwind (bg-primary, text-primary, etc.) lo use
          document.documentElement.style.setProperty('--primary', primary);
          document.documentElement.style.setProperty('--secondary', secondary);
        }
      },

      setLoading: (isLoading) => set({ isLoading }),

      clearBranding: () => {
        set({ branding: null });
        if (typeof window !== 'undefined') {
          document.documentElement.style.setProperty('--primary', defaultBranding.colorPrimario!);
          document.documentElement.style.setProperty('--secondary', defaultBranding.colorSecundario!);
        }
      },
    }),
    {
      name: 'institution-storage',
      partialize: (state) => ({ branding: state.branding }),
    }
  )
);
