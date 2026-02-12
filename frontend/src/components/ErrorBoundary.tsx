'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Generic Error Boundary — catches rendering errors in children.
 * Shows a friendly fallback UI with a retry button.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Error capturado:', error, errorInfo);
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetErrorBoundary);
      }
      return <ErrorFallback error={this.state.error} reset={this.resetErrorBoundary} />;
    }
    return this.props.children;
  }
}

/**
 * Fallback UI shown when an error is caught.
 * Reusable in both the class-based ErrorBoundary and Next.js error.tsx files.
 */
export function ErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('[ErrorFallback]', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <div className="bg-white border border-red-200 rounded-lg shadow-sm p-8 max-w-lg w-full text-center">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Algo salió mal
        </h2>
        <p className="text-gray-600 mb-4">
          Ocurrió un error inesperado. Puedes intentar recargar esta sección.
        </p>
        <div className="bg-red-50 border border-red-100 rounded p-3 mb-6 text-left">
          <p className="text-sm text-red-700 font-mono break-all">
            {error.message || 'Error desconocido'}
          </p>
        </div>
        <Button onClick={reset} variant="default" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </Button>
      </div>
    </div>
  );
}
