'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { mensajesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import {
  MessageSquare,
  Loader2,
  Plus,
  Search,
  RefreshCw,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  role: string;
  fotoUrl?: string;
}

interface Mensaje {
  id: string;
  contenido: string;
  createdAt: string;
  remitente: Usuario;
}

interface Conversacion {
  id: string;
  titulo?: string;
  esGrupal: boolean;
  participantes: {
    usuario: Usuario;
  }[];
  mensajes: Mensaje[];
  noLeidos: number;
  updatedAt: string;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

const POLL_INTERVAL = 15000; // 15 seconds

export default function MensajesPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [usuariosDisponibles, setUsuariosDisponibles] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const fetchConversaciones = useCallback(async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true);
    try {
      const response = await mensajesApi.getConversaciones();
      setConversaciones(response.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      if (showLoading) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [convRes, usersRes] = await Promise.all([
          mensajesApi.getConversaciones(),
          mensajesApi.getUsuariosDisponibles(),
        ]);
        setConversaciones(convRes.data || []);
        setUsuariosDisponibles(usersRes.data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Polling for new messages
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversaciones();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchConversaciones]);

  const handleRefresh = () => {
    fetchConversaciones(true);
  };

  const getConversationName = (conv: Conversacion) => {
    if (conv.titulo) return conv.titulo;
    if (conv.esGrupal) return 'Grupo';
    const otherParticipant = conv.participantes.find(
      (p) => p.usuario.id !== user?.id
    );
    if (otherParticipant) {
      return `${otherParticipant.usuario.nombre} ${otherParticipant.usuario.apellido}`;
    }
    return 'Conversación';
  };

  const getConversationAvatar = (conv: Conversacion) => {
    if (conv.esGrupal) {
      return (
        <Avatar>
          <AvatarFallback>
            <Users className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      );
    }
    const otherParticipant = conv.participantes.find(
      (p) => p.usuario.id !== user?.id
    );
    if (otherParticipant) {
      return (
        <Avatar>
          <AvatarImage src={otherParticipant.usuario.fotoUrl} />
          <AvatarFallback>
            {otherParticipant.usuario.nombre[0]}
            {otherParticipant.usuario.apellido[0]}
          </AvatarFallback>
        </Avatar>
      );
    }
    return (
      <Avatar>
        <AvatarFallback>?</AvatarFallback>
      </Avatar>
    );
  };

  const handleCreateConversation = async () => {
    if (selectedUsers.length === 0) return;

    setIsCreating(true);
    try {
      const response = await mensajesApi.crearConversacion({
        participanteIds: selectedUsers,
        esGrupal: selectedUsers.length > 1,
      });
      setShowNewConversation(false);
      setSelectedUsers([]);
      router.push(`/dashboard/mensajes/${response.data.id}`);
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Error:', apiError.response?.data?.message);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredUsers = usuariosDisponibles.filter(
    (u) =>
      u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.apellido.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleLabels: Record<string, string> = {
    DIRECTOR: 'Director',
    COORDINADOR: 'Coordinador',
    COORDINADOR_ACADEMICO: 'Coord. Académico',
    DOCENTE: 'Docente',
    ESTUDIANTE: 'Estudiante',
    SECRETARIA: 'Secretaria',
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mensajes</h1>
          <p className="text-muted-foreground">
            Comunicación con docentes, estudiantes y padres
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn('w-4 h-4', isRefreshing && 'animate-spin')}
            />
          </Button>
          <Button onClick={() => setShowNewConversation(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva conversación
          </Button>
        </div>
      </div>

      {conversaciones.length > 0 ? (
        <div className="space-y-2">
          {conversaciones.map((conv) => (
            <Link key={conv.id} href={`/dashboard/mensajes/${conv.id}`}>
              <Card
                className={cn(
                  'hover:shadow-md transition-shadow cursor-pointer',
                  conv.noLeidos > 0 && 'border-primary'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {getConversationAvatar(conv)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3
                          className={cn(
                            'font-medium truncate',
                            conv.noLeidos > 0 && 'font-bold'
                          )}
                        >
                          {getConversationName(conv)}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(conv.updatedAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </span>
                      </div>
                      {conv.mensajes[0] && (
                        <p
                          className={cn(
                            'text-sm truncate mt-1',
                            conv.noLeidos > 0
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                          )}
                        >
                          {conv.mensajes[0].remitente.id === user?.id
                            ? 'Tú: '
                            : ''}
                          {conv.mensajes[0].contenido}
                        </p>
                      )}
                    </div>
                    {conv.noLeidos > 0 && (
                      <Badge className="bg-primary">{conv.noLeidos}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Sin conversaciones</h3>
            <p className="text-muted-foreground mb-4">
              Inicia una nueva conversación para comunicarte
            </p>
            <Button onClick={() => setShowNewConversation(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva conversación
            </Button>
          </CardContent>
        </Card>
      )}

      {/* New Conversation Modal */}
      <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva conversación</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredUsers.map((usuario) => (
                <div
                  key={usuario.id}
                  onClick={() => toggleUserSelection(usuario.id)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                    selectedUsers.includes(usuario.id)
                      ? 'bg-primary/10 border border-primary'
                      : 'hover:bg-muted'
                  )}
                >
                  <Avatar>
                    <AvatarImage src={usuario.fotoUrl} />
                    <AvatarFallback>
                      {usuario.nombre[0]}
                      {usuario.apellido[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">
                      {usuario.nombre} {usuario.apellido}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {roleLabels[usuario.role] || usuario.role}
                    </p>
                  </div>
                </div>
              ))}

              {filteredUsers.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No se encontraron usuarios
                </p>
              )}
            </div>

            {selectedUsers.length > 0 && (
              <div className="pt-2 border-t">
                <Label className="text-sm text-muted-foreground">
                  Seleccionados: {selectedUsers.length}
                </Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewConversation(false);
                setSelectedUsers([]);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateConversation}
              disabled={selectedUsers.length === 0 || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                'Iniciar conversación'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
