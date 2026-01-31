'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PhotoSliderProps {
  photos: string[];
  autoPlay?: boolean;
  interval?: number;
  onPhotoClick?: (index: number) => void;
  className?: string;
}

export function PhotoSlider({
  photos,
  autoPlay = true,
  interval = 4000,
  onPhotoClick,
  className = '',
}: PhotoSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    if (!autoPlay || isHovered || photos.length <= 1) return;

    const timer = setInterval(goToNext, interval);
    return () => clearInterval(timer);
  }, [autoPlay, interval, isHovered, goToNext, photos.length]);

  if (photos.length === 0) return null;

  return (
    <div
      className={`relative overflow-hidden rounded-xl ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main image */}
      <div
        className="relative aspect-[16/9] cursor-pointer"
        onClick={() => onPhotoClick?.(currentIndex)}
      >
        <Image
          src={photos[currentIndex]}
          alt={`Slide ${currentIndex + 1}`}
          fill
          className="object-cover transition-opacity duration-500"
          priority={currentIndex === 0}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      {/* Navigation arrows */}
      {photos.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-900 w-10 h-10 rounded-full shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              goToPrev();
            }}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-900 w-10 h-10 rounded-full shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </>
      )}

      {/* Dots indicator */}
      {photos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {photos.map((_, idx) => (
            <button
              key={idx}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                idx === currentIndex
                  ? 'bg-white w-6'
                  : 'bg-white/50 hover:bg-white/70'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
            />
          ))}
        </div>
      )}

      {/* Counter */}
      {photos.length > 1 && (
        <div className="absolute top-4 right-4 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
          {currentIndex + 1} / {photos.length}
        </div>
      )}
    </div>
  );
}
