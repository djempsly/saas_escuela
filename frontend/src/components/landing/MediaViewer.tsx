'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getMediaUrl } from '@/lib/api';

interface MediaViewerProps {
  isOpen: boolean;
  onClose: () => void;
  media: {
    type: 'photo' | 'video';
    url: string;
    title?: string;
    description?: string;
  };
  branding: {
    logoUrl: string | null;
    nombre: string;
    colorPrimario: string;
  };
  translations: {
    close: string;
    previous: string;
    next: string;
  };
  allMedia?: Array<{ type: 'photo' | 'video'; url: string }>;
  currentIndex?: number;
  onNavigate?: (index: number) => void;
}

export function MediaViewer({
  isOpen,
  onClose,
  media,
  branding,
  translations,
  allMedia = [],
  currentIndex = 0,
  onNavigate,
}: MediaViewerProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && onNavigate && currentIndex > 0) {
        onNavigate(currentIndex - 1);
      }
      if (e.key === 'ArrowRight' && onNavigate && currentIndex < allMedia.length - 1) {
        onNavigate(currentIndex + 1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNavigate, currentIndex, allMedia.length]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const showNavigation = allMedia.length > 1;

  // Video layout: 70% video, 30% logo/info
  if (media.type === 'video') {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 text-white hover:bg-white/20 z-50"
          onClick={onClose}
        >
          <X className="w-6 h-6" />
        </Button>

        <div className="w-full h-full flex items-center">
          {/* Video section - 70% */}
          <div className="w-[70%] h-full flex items-center justify-center p-8">
            <div className="relative w-full h-full max-h-[80vh] flex items-center justify-center">
              <video
                src={media.url}
                controls
                autoPlay={isPlaying}
                className="max-w-full max-h-full rounded-lg shadow-2xl"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            </div>
          </div>

          {/* Logo/Info section - 30% */}
          <div className="w-[30%] h-full flex flex-col items-center justify-center p-8 bg-black/50">
            {branding.logoUrl ? (
              <div className="relative w-48 h-48 mb-6">
                <Image
                  src={getMediaUrl(branding.logoUrl)}
                  alt={branding.nombre}
                  fill
                  className="object-contain rounded-lg"
                  unoptimized
                />
              </div>
            ) : (
              <div
                className="w-48 h-48 rounded-lg flex items-center justify-center mb-6"
                style={{ backgroundColor: branding.colorPrimario }}
              >
                <span className="text-white text-4xl font-bold">
                  {branding.nombre.charAt(0)}
                </span>
              </div>
            )}
            <h3 className="text-white text-2xl font-bold text-center">
              {branding.nombre}
            </h3>
            {media.title && (
              <p className="text-white/80 text-lg mt-4 text-center">
                {media.title}
              </p>
            )}
          </div>
        </div>

        {/* Navigation arrows */}
        {showNavigation && (
          <>
            {currentIndex > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 w-12 h-12"
                onClick={() => onNavigate?.(currentIndex - 1)}
              >
                <ChevronLeft className="w-8 h-8" />
              </Button>
            )}
            {currentIndex < allMedia.length - 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-[32%] top-1/2 -translate-y-1/2 text-white hover:bg-white/20 w-12 h-12"
                onClick={() => onNavigate?.(currentIndex + 1)}
              >
                <ChevronRight className="w-8 h-8" />
              </Button>
            )}
          </>
        )}
      </div>
    );
  }

  // Photo layout: 60% photo, 40% logo+name (logo top, name bottom)
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-white/20 z-50"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </Button>

      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-7xl flex items-center gap-8">
          {/* Photo section - 60% */}
          <div className="w-[60%] flex items-center justify-center">
            <div className="relative w-full aspect-[4/3] max-h-[60vh]">
              <Image
                src={media.url}
                alt={media.title || 'Photo'}
                fill
                className="object-contain rounded-lg"
                unoptimized
              />
            </div>
          </div>

          {/* Logo+Name section - 40% */}
          <div className="w-[40%] flex flex-col items-center justify-center">
            {branding.logoUrl ? (
              <div className="relative w-40 h-40 mb-4">
                <Image
                  src={getMediaUrl(branding.logoUrl)}
                  alt={branding.nombre}
                  fill
                  className="object-contain rounded-lg"
                  unoptimized
                />
              </div>
            ) : (
              <div
                className="w-40 h-40 rounded-lg flex items-center justify-center mb-4"
                style={{ backgroundColor: branding.colorPrimario }}
              >
                <span className="text-white text-3xl font-bold">
                  {branding.nombre.charAt(0)}
                </span>
              </div>
            )}
            <h3 className="text-white text-xl font-bold text-center">
              {branding.nombre}
            </h3>
          </div>
        </div>
      </div>

      {/* Activity info - 80% width, centered */}
      {(media.title || media.description) && (
        <div className="w-[80%] mx-auto pb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center">
            {media.title && (
              <h4 className="text-white text-xl font-semibold mb-2">
                {media.title}
              </h4>
            )}
            {media.description && (
              <p className="text-white/80 text-base">
                {media.description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Navigation arrows */}
      {showNavigation && (
        <>
          {currentIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 w-12 h-12"
              onClick={() => onNavigate?.(currentIndex - 1)}
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>
          )}
          {currentIndex < allMedia.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 w-12 h-12"
              onClick={() => onNavigate?.(currentIndex + 1)}
            >
              <ChevronRight className="w-8 h-8" />
            </Button>
          )}
        </>
      )}

      {/* Navigation dots */}
      {showNavigation && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {allMedia.map((_, idx) => (
            <button
              key={idx}
              className={`w-3 h-3 rounded-full transition-colors ${
                idx === currentIndex ? 'bg-white' : 'bg-white/40'
              }`}
              onClick={() => onNavigate?.(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
