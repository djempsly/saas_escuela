'use client';

import { useState } from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/lib/i18n/translations';

interface LanguageSelectorProps {
  currentLocale: Locale;
  availableLocales: Locale[];
  onLocaleChange: (locale: Locale) => void;
  buttonStyle?: React.CSSProperties;
}

const LOCALE_NAMES: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
  fr: 'Français',
  ht: 'Kreyòl',
};

const LOCALE_FLAGS: Record<Locale, string> = {
  es: '🇪🇸',
  en: '🇺🇸',
  fr: '🇫🇷',
  ht: '🇭🇹',
};

export function LanguageSelector({
  currentLocale,
  availableLocales,
  onLocaleChange,
  buttonStyle,
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="text-white hover:bg-white/20 gap-2"
        style={buttonStyle}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{LOCALE_NAMES[currentLocale]}</span>
        <span className="sm:hidden">{LOCALE_FLAGS[currentLocale]}</span>
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border py-1 z-50 min-w-[150px]">
            {availableLocales.map((locale) => (
              <button
                key={locale}
                className={`w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-slate-100 transition-colors ${
                  locale === currentLocale ? 'bg-slate-50 font-medium' : ''
                }`}
                onClick={() => {
                  onLocaleChange(locale);
                  setIsOpen(false);
                }}
              >
                <span>{LOCALE_FLAGS[locale]}</span>
                <span className="text-slate-900">{LOCALE_NAMES[locale]}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
