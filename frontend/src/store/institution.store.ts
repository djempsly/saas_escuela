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
          document.documentElement.style.setProperty(
            '--color-primary',
            branding.colorPrimario || defaultBranding.colorPrimario!
          );
          document.documentElement.style.setProperty(
            '--color-secondary',
            branding.colorSecundario || defaultBranding.colorSecundario!
          );
        }
      },

      setLoading: (isLoading) => set({ isLoading }),

      clearBranding: () => {
        set({ branding: null });
        if (typeof window !== 'undefined') {
          document.documentElement.style.setProperty(
            '--color-primary',
            defaultBranding.colorPrimario!
          );
          document.documentElement.style.setProperty(
            '--color-secondary',
            defaultBranding.colorSecundario!
          );
        }
      },
    }),
    {
      name: 'institution-storage',
      partialize: (state) => ({ branding: state.branding }),
    }
  )
);
