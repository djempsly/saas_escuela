'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api';
import { Loader2, Lock, ShieldAlert, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export default function CambiarPasswordPage() {
  const router = useRouter();
  const { user, updateUser, token } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  // Validaciones de contraseña
  const validations = {
    minLength: formData.newPassword.length >= 8,
    hasUppercase: /[A-Z]/.test(formData.newPassword),
    hasLowercase: /[a-z]/.test(formData.newPassword),
    hasNumber: /[0-9]/.test(formData.newPassword),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword),
    passwordsMatch:
      formData.newPassword === formData.confirmPassword && formData.confirmPassword !== '',
  };

  const isValid = Object.values(validations).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) {
      setError('Por favor, cumple con todos los requisitos de la contraseña');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Usar el token para cambiar contraseña (sin token de reset)
      await authApi.changePassword(formData.newPassword);

      // Actualizar el estado del usuario
      updateUser({ debeCambiarPassword: false });

      // Redirigir al dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cambiar la contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-amber-100 rounded-full">
              <ShieldAlert className="w-8 h-8 text-amber-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Cambio de Contraseña Requerido</CardTitle>
          <CardDescription>
            Por seguridad, debes cambiar tu contraseña temporal antes de continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            {/* Nueva Contraseña */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  className="pl-10 pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirmar Contraseña */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="pl-10 pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Requisitos de contraseña */}
            <div className="p-4 bg-slate-50 rounded-lg space-y-2">
              <p className="text-sm font-medium text-slate-700 mb-2">
                Requisitos de la contraseña:
              </p>
              <ValidationItem valid={validations.minLength} text="Mínimo 8 caracteres" />
              <ValidationItem valid={validations.hasUppercase} text="Al menos una mayúscula" />
              <ValidationItem valid={validations.hasLowercase} text="Al menos una minúscula" />
              <ValidationItem valid={validations.hasNumber} text="Al menos un número" />
              <ValidationItem valid={validations.hasSpecial} text="Al menos un carácter especial" />
              <ValidationItem valid={validations.passwordsMatch} text="Las contraseñas coinciden" />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || !isValid}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cambiando...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Cambiar Contraseña
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ValidationItem({ valid, text }: { valid: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${valid ? 'text-green-600' : 'text-slate-500'}`}>
      <CheckCircle2 className={`w-4 h-4 ${valid ? 'text-green-500' : 'text-slate-300'}`} />
      {text}
    </div>
  );
}
