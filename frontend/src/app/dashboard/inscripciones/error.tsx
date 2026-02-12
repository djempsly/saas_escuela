'use client';

import { useEffect } from 'react';
import { ErrorFallback } from '@/components/ErrorBoundary';

export default function InscripcionesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Inscripciones]', error);
  }, [error]);

  return <ErrorFallback error={error} reset={reset} />;
}
