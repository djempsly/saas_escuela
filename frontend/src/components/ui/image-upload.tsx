'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';

interface ImageUploadProps {
  value?: string;
  onChange: (file: File | null, previewUrl: string | null) => void;
  onUpload?: (file: File) => Promise<string>;
  placeholder?: string;
  className?: string;
  aspectRatio?: 'square' | 'video' | 'banner';
  maxSizeMB?: number;
  accept?: string;
  disabled?: boolean;
  shape?: 'square' | 'circle';
}

export function ImageUpload({
  value,
  onChange,
  onUpload,
  placeholder = 'Subir imagen',
  className,
  aspectRatio = 'square',
  maxSizeMB = 5,
  accept = 'image/*',
  disabled = false,
  shape = 'square',
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    banner: 'aspect-[3/1]',
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validar tamaño
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`El archivo excede el tamaño máximo de ${maxSizeMB}MB`);
      return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten archivos de imagen');
      return;
    }

    // Crear preview local
    const reader = new FileReader();
    reader.onload = (event) => {
      const previewUrl = event.target?.result as string;
      setPreview(previewUrl);

      // Si hay callback de upload, ejecutarlo
      if (onUpload) {
        setIsUploading(true);
        onUpload(file)
          .then((url) => {
            onChange(file, url);
          })
          .catch((err) => {
            setError('Error al subir la imagen');
            console.error(err);
          })
          .finally(() => {
            setIsUploading(false);
          });
      } else {
        onChange(file, previewUrl);
      }
    };
    reader.readAsDataURL(file);
  }, [maxSizeMB, onChange, onUpload]);

  const handleRemove = useCallback(() => {
    setPreview(null);
    setError(null);
    onChange(null, null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [onChange]);

  const handleClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div
        onClick={handleClick}
        className={cn(
          'relative border-2 border-dashed rounded-lg overflow-hidden cursor-pointer transition-colors',
          'hover:border-primary/50 hover:bg-slate-50',
          disabled && 'opacity-50 cursor-not-allowed',
          error && 'border-red-300',
          aspectClasses[aspectRatio],
          shape === 'circle' && 'rounded-full'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
          className="sr-only"
        />

        {preview ? (
          <>
            <Image
              src={preview}
              alt="Preview"
              fill
              className={cn(
                'object-cover',
                shape === 'circle' && 'rounded-full'
              )}
            />
            {!disabled && (
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                >
                  <X className="w-4 h-4 mr-1" />
                  Quitar
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            {isUploading ? (
              <>
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <span className="text-sm">Subiendo...</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-8 h-8 mb-2" />
                <span className="text-sm text-center px-4">{placeholder}</span>
                <span className="text-xs mt-1">
                  Máx. {maxSizeMB}MB
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
