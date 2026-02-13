'use client';

import { useEffect, useState } from 'react';
import { getMediaUrl, resolveFileUrl } from '@/lib/api';

/**
 * Hook que resuelve URLs de archivos privados a URLs firmadas temporales.
 * Para URLs publicas o no-privadas, retorna la URL resuelta directamente.
 */
export function useSignedUrl(url: string | null | undefined): string {
  const [signedUrl, setSignedUrl] = useState('');

  useEffect(() => {
    if (!url) {
      setSignedUrl('');
      return;
    }

    // Si no es URL privada (proxy), resolver directamente
    if (!url.includes('/api/v1/files/')) {
      setSignedUrl(getMediaUrl(url));
      return;
    }

    // Fetch signed URL via API con auth
    let cancelled = false;
    resolveFileUrl(url)
      .then((resolved) => {
        if (!cancelled) setSignedUrl(resolved);
      })
      .catch(() => {
        if (!cancelled) setSignedUrl('');
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return signedUrl;
}
