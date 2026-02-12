import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { translations, Locale } from './translations';

// Tipo más flexible para las traducciones
type Translations = typeof translations.es;

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
}

// Determinar idioma por defecto según sistema educativo
export const getDefaultLocale = (sistemaEducativo?: string): Locale => {
  if (!sistemaEducativo) return 'es';

  if (sistemaEducativo.includes('HT') || sistemaEducativo === 'HAITI') {
    return 'fr'; // Francés por defecto para Haití
  }
  return 'es'; // Español por defecto para RD
};

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      locale: 'es' as Locale,
      setLocale: (locale: Locale) => {
        set({ locale, t: translations[locale] as Translations });
      },
      t: translations.es as Translations,
    }),
    {
      name: 'i18n-storage',
      partialize: (state) => ({ locale: state.locale }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.t = translations[state.locale] as Translations;
        }
      },
    }
  )
);

// Hook helper para usar traducciones
export const useTranslation = () => {
  const { locale, setLocale, t } = useI18nStore();

  return {
    locale,
    setLocale,
    t,
    // Helper para obtener traducción anidada por path
    translate: (path: string): string => {
      const keys = path.split('.');
      let result: unknown = t;
      for (const key of keys) {
        result = (result as Record<string, unknown>)?.[key];
      }
      return (typeof result === 'string' ? result : path);
    },
  };
};

// Mapeo de sistemas educativos a idiomas disponibles
export const systemLanguages: Record<string, Locale[]> = {
  RD_POLITECNICO: ['es', 'en'],
  RD_GENERAL: ['es', 'en'],
  RD_PRIMARIA: ['es', 'en'],
  PRIMARIA_DO: ['es', 'en'],
  SECUNDARIA_GENERAL_DO: ['es', 'en'],
  POLITECNICO_DO: ['es', 'en'],
  HAITI: ['fr', 'ht', 'en'],
  PRIMARIA_HT: ['fr', 'ht', 'en'],
  SECUNDARIA_HT: ['fr', 'ht', 'en'],
};

export const localeNames: Record<Locale, string> = {
  es: 'Español',
  fr: 'Français',
  en: 'English',
  ht: 'Kreyòl',
};

export { translations, type Locale };
export type { Translations };
