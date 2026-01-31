'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth.store';
import { useInstitutionStore } from '@/store/institution.store';
import { authApi, institucionesApi } from '@/lib/api';
import { Loader2, School } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const { setBranding } = useInstitutionStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    identificador: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await authApi.login(formData.identificador, formData.password);
      const { token, user, debeCambiarPassword } = response.data;

      // Guardar usuario y token (incluyendo debeCambiarPassword)
      login({ ...user, debeCambiarPassword }, token);

      // Si el usuario tiene institución, cargar branding
      if (user.institucionId) {
        try {
          const brandingResponse = await institucionesApi.getBranding(user.institucionId);
          setBranding(brandingResponse.data);
        } catch (err) {
          console.error('Error cargando branding:', err);
        }
      }

      // Redirigir según estado y rol
      if (debeCambiarPassword) {
        router.push('/dashboard/cambiar-password');
      } else if (user.role === 'ADMIN') {
        router.push('/dashboard/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <School className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription>
            Ingresa tus credenciales para acceder al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="identificador">Email o Usuario</Label>
              <Input
                id="identificador"
                type="text"
                placeholder="tu@correo.com o tu.usuario"
                value={formData.identificador}
                onChange={(e) => setFormData({ ...formData, identificador: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ingresando...
                </>
              ) : (
                'Ingresar'
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <Link href="/forgot-password" className="hover:text-primary underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
