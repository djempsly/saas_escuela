'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { adminApi } from '@/lib/api';
import {
  Settings,
  Shield,
  Database,
  Users,
  Building2,
  Activity,
  Loader2,
  Save,
  RefreshCw,
} from 'lucide-react';

interface SystemStats {
  totalUsuarios: number;
  totalInstituciones: number;
  usuariosActivos: number;
  institucionesActivas: number;
  usuariosPorRol: Record<string, number>;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

export default function AdminConfiguracionPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // System settings (these would be stored in a settings table)
  const [settings, setSettings] = useState({
    allowPublicRegistration: false,
    maintenanceMode: false,
    maxInstitutionsPerPlan: 10,
    defaultSessionTimeout: 24,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const response = await adminApi.getUserStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error cargando estadisticas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      // TODO: Implement settings API endpoint
      // await api.put('/admin/settings', settings);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulated save
      setMessage({ type: 'success', text: 'Configuracion guardada correctamente' });
    } catch (error) {
      const apiError = error as ApiError;
      setMessage({
        type: 'error',
        text: apiError.response?.data?.message || 'Error al guardar la configuracion',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administradores',
    DIRECTOR: 'Directores',
    COORDINADOR: 'Coordinadores',
    COORDINADOR_ACADEMICO: 'Coord. Academicos',
    DOCENTE: 'Docentes',
    ESTUDIANTE: 'Estudiantes',
    SECRETARIA: 'Secretarias',
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configuracion del Sistema</h1>
          <p className="text-muted-foreground">
            Ajustes globales y estadisticas del sistema
          </p>
        </div>
        <Button variant="outline" onClick={fetchStats} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-md text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* System Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Estadisticas del Sistema
          </CardTitle>
          <CardDescription>
            Resumen de datos en la plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : stats ? (
            <div className="space-y-6">
              {/* Main Stats */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <Users className="w-5 h-5" />
                    <span className="font-medium">Usuarios Totales</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-700">{stats.totalUsuarios}</p>
                  <p className="text-sm text-blue-600">{stats.usuariosActivos} activos</p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 text-green-600 mb-2">
                    <Building2 className="w-5 h-5" />
                    <span className="font-medium">Instituciones</span>
                  </div>
                  <p className="text-3xl font-bold text-green-700">{stats.totalInstituciones}</p>
                  <p className="text-sm text-green-600">{stats.institucionesActivas} activas</p>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2 text-purple-600 mb-2">
                    <Activity className="w-5 h-5" />
                    <span className="font-medium">Tasa de Actividad</span>
                  </div>
                  <p className="text-3xl font-bold text-purple-700">
                    {stats.totalUsuarios > 0
                      ? Math.round((stats.usuariosActivos / stats.totalUsuarios) * 100)
                      : 0}%
                  </p>
                  <p className="text-sm text-purple-600">Usuarios activos</p>
                </div>

                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-600 mb-2">
                    <Shield className="w-5 h-5" />
                    <span className="font-medium">Administradores</span>
                  </div>
                  <p className="text-3xl font-bold text-orange-700">
                    {stats.usuariosPorRol?.ADMIN || 0}
                  </p>
                  <p className="text-sm text-orange-600">Super Admins</p>
                </div>
              </div>

              {/* Users by Role */}
              <div>
                <h3 className="font-medium mb-3">Usuarios por Rol</h3>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                  {Object.entries(stats.usuariosPorRol || {}).map(([role, count]) => (
                    <div
                      key={role}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <span className="text-sm text-muted-foreground">
                        {roleLabels[role] || role}
                      </span>
                      <span className="font-bold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No se pudieron cargar las estadisticas
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuracion General
          </CardTitle>
          <CardDescription>
            Ajustes globales del sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Maintenance Mode */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <Label className="text-base font-medium">Modo Mantenimiento</Label>
              <p className="text-sm text-muted-foreground">
                Desactiva el acceso al sistema para todos excepto administradores
              </p>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, maintenanceMode: checked })
              }
            />
          </div>

          {/* Public Registration */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <Label className="text-base font-medium">Registro Publico</Label>
              <p className="text-sm text-muted-foreground">
                Permite que nuevos usuarios se registren sin invitacion
              </p>
            </div>
            <Switch
              checked={settings.allowPublicRegistration}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, allowPublicRegistration: checked })
              }
            />
          </div>

          {/* Session Timeout */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Duracion de Sesion (horas)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                min="1"
                max="168"
                value={settings.defaultSessionTimeout}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultSessionTimeout: parseInt(e.target.value) || 24,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Tiempo antes de que la sesion expire automaticamente
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxInstitutions">Max Instituciones por Plan</Label>
              <Input
                id="maxInstitutions"
                type="number"
                min="1"
                value={settings.maxInstitutionsPerPlan}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxInstitutionsPerPlan: parseInt(e.target.value) || 10,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Limite de instituciones que puede gestionar un plan
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Configuracion
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Seguridad
          </CardTitle>
          <CardDescription>
            Configuracion de seguridad del sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h4 className="font-medium text-amber-800 mb-2">Informacion Importante</h4>
            <p className="text-sm text-amber-700">
              Las configuraciones de seguridad avanzadas como rotacion de claves JWT,
              politicas de contraseñas y logs de auditoria se gestionan a nivel de
              infraestructura. Contacte al equipo de desarrollo para realizar cambios.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium">Algoritmo de Hash</p>
              <p className="text-sm text-muted-foreground">bcrypt (12 rounds)</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium">Tokens JWT</p>
              <p className="text-sm text-muted-foreground">HS256, 24h expiracion</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium">Rate Limiting</p>
              <p className="text-sm text-muted-foreground">100 req/min por IP</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium">CORS</p>
              <p className="text-sm text-muted-foreground">Dominios autorizados</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
