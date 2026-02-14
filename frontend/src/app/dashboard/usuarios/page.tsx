'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usersApi, ROLES, nivelesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  KeyRound,
  UserCheck,
  UserX,
  Eye,
  EyeOff,
  Copy,
  GraduationCap,
  Printer,
} from 'lucide-react';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

interface Usuario {
  id: string;
  nombre: string;
  segundoNombre?: string;
  apellido: string;
  segundoApellido?: string;
  email?: string;
  username: string;
  role: string;
  activo: boolean;
  debeCambiarPassword?: boolean;
  passwordTemporal?: string | null;
  createdAt: string;
  inscripciones?: Array<{
    clase: {
      nivel: {
        id: string;
        nombre: string;
      }
    }
  }>;
}

const ROLES_DISPLAY: Record<string, string> = {
  DIRECTOR: 'Director',
  COORDINADOR: 'Coordinador',
  COORDINADOR_ACADEMICO: 'Coord. Académico',
  DOCENTE: 'Docente',
  ESTUDIANTE: 'Estudiante',
  SECRETARIA: 'Secretaria',
  BIBLIOTECARIO: 'Bibliotecario',
  DIGITADOR: 'Digitador',
  PSICOLOGO: 'Psicólogo',
};

const ROLES_CREABLES = [
  { value: 'DOCENTE', label: 'Docente' },
  { value: 'ESTUDIANTE', label: 'Estudiante' },
  { value: 'SECRETARIA', label: 'Secretaria' },
  { value: 'COORDINADOR', label: 'Coordinador' },
  { value: 'COORDINADOR_ACADEMICO', label: 'Coordinador Académico' },
  { value: 'BIBLIOTECARIO', label: 'Bibliotecario' },
  { value: 'DIGITADOR', label: 'Digitador' },
  { value: 'PSICOLOGO', label: 'Psicólogo' },
];

const getDefaultPasswordByRole = (role: string): string => {
  const passwordMap: Record<string, string> = {
    ESTUDIANTE: 'estudiante123',
    DOCENTE: 'docente123',
    COORDINADOR: 'coordinador123',
    COORDINADOR_ACADEMICO: 'academico123',
    SECRETARIA: 'secretaria123',
    BIBLIOTECARIO: 'bibliotecario123',
    DIGITADOR: 'digitador123',
    PSICOLOGO: 'psicologo123',
    DIRECTOR: 'director123',
    ADMIN: 'admin123',
  };
  return passwordMap[role] || 'usuario123';
};

export default function UsuariosPage() {
  const { user } = useAuthStore();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [niveles, setNiveles] = useState<{ id: string; nombre: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterNivel, setFilterNivel] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({
    nombre: '',
    segundoNombre: '',
    apellido: '',
    segundoApellido: '',
    email: '',
    rol: 'ESTUDIANTE',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [createdUsername, setCreatedUsername] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  const canSeePasswords = user?.role === 'ADMIN' || user?.role === 'DIRECTOR';

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado al portapapeles');
  };

  const handlePrint = () => {
    const usersToPrint = filteredUsuarios;
    if (usersToPrint.length === 0) {
      alert('No hay usuarios para imprimir');
      return;
    }

    const rolLabel = filterRole ? (ROLES_DISPLAY[filterRole] || filterRole) : 'Todos los roles';
    const nivelLabel = filterNivel ? niveles.find(n => n.id === filterNivel)?.nombre || '' : '';

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Lista de Usuarios</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
            h1 { font-size: 18px; margin-bottom: 4px; }
            .subtitle { color: #666; margin-bottom: 16px; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
            th { background: #f0f0f0; font-weight: bold; }
            tr:nth-child(even) { background: #fafafa; }
            .footer { margin-top: 16px; font-size: 10px; color: #999; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Lista de Usuarios</h1>
          <div class="subtitle">
            Rol: ${rolLabel}${nivelLabel ? ' | Nivel: ' + nivelLabel : ''} | Total: ${usersToPrint.length}
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre Completo</th>
                <th>Usuario</th>
                <th>Contraseña</th>
                <th>Rol</th>
                ${filterRole === 'ESTUDIANTE' ? '<th>Nivel</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${usersToPrint.map((u, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${u.nombre} ${u.apellido}</td>
                  <td>${u.username}</td>
                  <td>${u.debeCambiarPassword ? getDefaultPasswordByRole(u.role) : '(personalizada)'}</td>
                  <td>${ROLES_DISPLAY[u.role] || u.role}</td>
                  ${filterRole === 'ESTUDIANTE' ? `<td>${u.inscripciones?.[0]?.clase?.nivel?.nombre || 'Sin asignar'}</td>` : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">Impreso el ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  useEffect(() => {
    fetchUsuarios();
    fetchNiveles();
  }, [filterRole, filterNivel]);

  const fetchNiveles = async () => {
    try {
      const response = await nivelesApi.getAll();
      setNiveles(response.data.data || []);
    } catch (error) {
      console.error('Error cargando niveles:', error);
    }
  };

  const fetchUsuarios = async () => {
    setIsLoading(true);
    try {
      const response = await usersApi.getAll({ 
        role: filterRole || undefined, 
        nivelId: filterNivel || undefined 
      });
      setUsuarios(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await usersApi.create(newUser);
      const createdUser = response.data.data?.user;
      setTempPassword(response.data.data?.tempPassword || '');
      setCreatedUsername(createdUser?.username || '');
      setUsuarios([createdUser, ...usuarios]);
      setNewUser({ nombre: '', segundoNombre: '', apellido: '', segundoApellido: '', email: '', rol: 'ESTUDIANTE' });
      setShowModal(false);
    } catch (error) {
      const apiError = error as ApiError;
      alert(apiError.response?.data?.message || 'Error al crear usuario');
    } finally {
      setIsCreating(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!confirm('¿Generar nueva contraseña temporal para este usuario?')) return;

    try {
      const response = await usersApi.resetPasswordManual(userId);
      alert(`Nueva contraseña temporal: ${response.data.tempPassword}`);
    } catch (error) {
      const apiError = error as ApiError;
      alert(apiError.response?.data?.message || 'Error al resetear contraseña');
    }
  };

  const filteredUsuarios = usuarios.filter((u) => {
    const matchSearch =
      u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchRole = !filterRole || u.role === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>
          <p className="text-muted-foreground">
            Gestiona los usuarios de tu institución
          </p>
        </div>
        <div className="flex gap-2">
          {canSeePasswords && (
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          )}
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Usuario
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, usuario o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => {
                setFilterRole(e.target.value);
                if (e.target.value !== 'ESTUDIANTE') setFilterNivel('');
              }}
              className="px-3 py-2 border rounded-md w-full md:w-48"
            >
              <option value="">Todos los roles</option>
              {Object.entries(ROLES_DISPLAY).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            {filterRole === 'ESTUDIANTE' && (
              <select
                value={filterNivel}
                onChange={(e) => setFilterNivel(e.target.value)}
                className="px-3 py-2 border rounded-md w-full md:w-48"
              >
                <option value="">Todos los niveles</option>
                {niveles.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.nombre}
                  </option>
                ))}
              </select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Credenciales del usuario creado */}
      {tempPassword && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="font-medium text-green-800">Usuario creado exitosamente</p>
                <div className="text-sm text-green-700 space-y-1">
                  <p>
                    Usuario: <strong className="font-mono bg-green-100 px-2 py-0.5 rounded">{createdUsername}</strong>
                  </p>
                  <p>
                    Contraseña temporal: <strong className="font-mono bg-green-100 px-2 py-0.5 rounded">{tempPassword}</strong>
                  </p>
                </div>
                <p className="text-xs text-green-600 mt-2">
                  Guarda estas credenciales. El usuario deberá cambiar su contraseña en el primer inicio de sesión.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setTempPassword(''); setCreatedUsername(''); }}>
                Cerrar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Usuarios */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredUsuarios.length > 0 ? (
            filteredUsuarios.map((u) => (
              <Card key={u.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                        u.activo ? 'bg-primary' : 'bg-slate-400'
                      }`}
                    >
                      {u.nombre[0]}{u.apellido[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {u.nombre} {u.apellido}
                        </p>
                        {!u.activo && (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                            Inactivo
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                        <span>@{u.username}</span>
                        {u.email && <span>• {u.email}</span>}
                        {u.role === 'ESTUDIANTE' && u.inscripciones && u.inscripciones[0] && (
                          <span className="flex items-center gap-1 text-primary font-medium">
                            • <GraduationCap className="w-3 h-3" />
                            {u.inscripciones[0].clase.nivel.nombre}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 bg-slate-100 rounded-full">
                      {ROLES_DISPLAY[u.role] || u.role}
                    </span>
                    {/* Contraseña por defecto - solo visible para ADMIN/DIRECTOR */}
                    {canSeePasswords && u.debeCambiarPassword && (
                      <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                        <span className="text-xs text-yellow-700">
                          {visiblePasswords.has(u.id) ? getDefaultPasswordByRole(u.role) : '******'}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => togglePasswordVisibility(u.id)}
                          title={visiblePasswords.has(u.id) ? 'Ocultar' : 'Ver contraseña'}
                        >
                          {visiblePasswords.has(u.id) ? (
                            <EyeOff className="w-3 h-3 text-yellow-600" />
                          ) : (
                            <Eye className="w-3 h-3 text-yellow-600" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(getDefaultPasswordByRole(u.role))}
                          title="Copiar"
                        >
                          <Copy className="w-3 h-3 text-yellow-600" />
                        </Button>
                      </div>
                    )}
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleResetPassword(u.id)}
                        title="Resetear contraseña"
                      >
                        <KeyRound className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay usuarios</h3>
                <p className="text-muted-foreground">
                  {searchTerm || filterRole
                    ? 'No se encontraron resultados'
                    : 'Comienza creando tu primer usuario'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Modal de Crear Usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-4">Crear Nuevo Usuario</h2>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Primer Nombre *</Label>
                    <Input
                      id="nombre"
                      value={newUser.nombre}
                      onChange={(e) => setNewUser({ ...newUser, nombre: e.target.value })}
                      placeholder="Juan"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="segundoNombre">Segundo Nombre</Label>
                    <Input
                      id="segundoNombre"
                      value={newUser.segundoNombre}
                      onChange={(e) => setNewUser({ ...newUser, segundoNombre: e.target.value })}
                      placeholder="Carlos (opcional)"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="apellido">Primer Apellido *</Label>
                    <Input
                      id="apellido"
                      value={newUser.apellido}
                      onChange={(e) => setNewUser({ ...newUser, apellido: e.target.value })}
                      placeholder="Pérez"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="segundoApellido">Segundo Apellido</Label>
                    <Input
                      id="segundoApellido"
                      value={newUser.segundoApellido}
                      onChange={(e) => setNewUser({ ...newUser, segundoApellido: e.target.value })}
                      placeholder="García (opcional)"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (opcional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="usuario@ejemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rol">Rol *</Label>
                  <select
                    id="rol"
                    value={newUser.rol}
                    onChange={(e) => setNewUser({ ...newUser, rol: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  >
                    {ROLES_CREABLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-700">
                  <p className="font-medium">Credenciales generadas:</p>
                  <p className="text-xs mt-1">
                    Usuario: primer_nombre.primer_apellido + 4 dígitos
                  </p>
                  <p className="text-xs mt-1 font-mono bg-blue-100 px-2 py-1 rounded">
                    {(newUser.nombre.toLowerCase().replace(/\s+/g, '') || 'juan')}.{(newUser.apellido.toLowerCase().replace(/\s+/g, '') || 'perez')}1234
                  </p>
                  <p className="text-xs mt-2">
                    Contraseña por defecto: <strong className="font-mono bg-blue-100 px-2 py-0.5 rounded">{getDefaultPasswordByRole(newUser.rol)}</strong>
                  </p>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isCreating}>
                    {isCreating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Crear Usuario'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
