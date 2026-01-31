'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mensajesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import {
  Loader2,
  ArrowLeft,
  Send,
  RefreshCw,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
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
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

const POLL_INTERVAL = 10000; // 10 seconds

export default function ChatPage() {
  const params = useParams();
  const conversacionId = params.id as string;
  const { user } = useAuthStore();

  const [conversacion, setConversacion] = useState<Conversacion | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageDate = useRef<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMensajes = useCallback(async () => {
    try {
      const response = await mensajesApi.getMensajes(conversacionId);
      setConversacion(response.data.conversacion);
      setMensajes(response.data.mensajes || []);

      // Mark as read
      await mensajesApi.marcarComoLeida(conversacionId);
    } catch (error) {
      console.error('Error:', error);
    }
  }, [conversacionId]);

  const fetchNewMensajes = useCallback(async () => {
    if (mensajes.length === 0) return;

    const lastMessage = mensajes[mensajes.length - 1];
    try {
      const response = await mensajesApi.getMensajesNuevos(
        conversacionId,
        lastMessage.createdAt
      );

      if (response.data && response.data.length > 0) {
        setMensajes((prev) => [...prev, ...response.data]);
        scrollToBottom();
        await mensajesApi.marcarComoLeida(conversacionId);
      }
    } catch (error) {
      console.error('Error fetching new messages:', error);
    }
  }, [conversacionId, mensajes]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await fetchMensajes();
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [fetchMensajes]);

  useEffect(() => {
    scrollToBottom();
  }, [mensajes]);

  // Polling for new messages
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNewMensajes();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchNewMensajes]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchMensajes();
    setIsRefreshing(false);
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    setIsSending(true);
    try {
      const response = await mensajesApi.enviarMensaje(conversacionId, {
        contenido: newMessage.trim(),
      });
      setMensajes((prev) => [...prev, response.data]);
      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      const apiError = error as ApiError;
      console.error('Error:', apiError.response?.data?.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getConversationName = () => {
    if (!conversacion) return '';
    if (conversacion.titulo) return conversacion.titulo;
    if (conversacion.esGrupal) return 'Grupo';
    const otherParticipant = conversacion.participantes.find(
      (p) => p.usuario.id !== user?.id
    );
    if (otherParticipant) {
      return `${otherParticipant.usuario.nombre} ${otherParticipant.usuario.apellido}`;
    }
    return 'Conversación';
  };

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    }
    if (isYesterday(date)) {
      return `Ayer ${format(date, 'HH:mm')}`;
    }
    return format(date, 'dd/MM/yyyy HH:mm');
  };

  const shouldShowDateSeparator = (currentMsg: Mensaje, prevMsg?: Mensaje) => {
    if (!prevMsg) return true;
    const currentDate = new Date(currentMsg.createdAt).toDateString();
    const prevDate = new Date(prevMsg.createdAt).toDateString();
    return currentDate !== prevDate;
  };

  const getDateSeparatorText = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Hoy';
    if (isYesterday(date)) return 'Ayer';
    return format(date, 'EEEE, d MMMM yyyy', { locale: es });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b">
        <Link href="/dashboard/mensajes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-3 flex-1">
          {conversacion?.esGrupal ? (
            <Avatar>
              <AvatarFallback>
                <Users className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
          ) : (
            (() => {
              const other = conversacion?.participantes.find(
                (p) => p.usuario.id !== user?.id
              );
              return (
                <Avatar>
                  <AvatarImage src={other?.usuario.fotoUrl} />
                  <AvatarFallback>
                    {other?.usuario.nombre[0]}
                    {other?.usuario.apellido[0]}
                  </AvatarFallback>
                </Avatar>
              );
            })()
          )}
          <div>
            <h1 className="text-lg font-semibold">{getConversationName()}</h1>
            {conversacion?.esGrupal && (
              <p className="text-sm text-muted-foreground">
                {conversacion.participantes.length} participantes
              </p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={cn('w-4 h-4', isRefreshing && 'animate-spin')}
          />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {mensajes.map((mensaje, index) => {
          const isOwn = mensaje.remitente.id === user?.id;
          const showDateSeparator = shouldShowDateSeparator(
            mensaje,
            mensajes[index - 1]
          );

          return (
            <div key={mensaje.id}>
              {showDateSeparator && (
                <div className="flex justify-center my-4">
                  <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {getDateSeparatorText(mensaje.createdAt)}
                  </span>
                </div>
              )}
              <div
                className={cn(
                  'flex gap-3',
                  isOwn ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                {!isOwn && (
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={mensaje.remitente.fotoUrl} />
                    <AvatarFallback className="text-xs">
                      {mensaje.remitente.nombre[0]}
                      {mensaje.remitente.apellido[0]}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    'max-w-[70%] rounded-2xl px-4 py-2',
                    isOwn
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-muted rounded-tl-sm'
                  )}
                >
                  {conversacion?.esGrupal && !isOwn && (
                    <p className="text-xs font-medium mb-1 opacity-70">
                      {mensaje.remitente.nombre}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">
                    {mensaje.contenido}
                  </p>
                  <p
                    className={cn(
                      'text-xs mt-1',
                      isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}
                  >
                    {formatMessageDate(mensaje.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="pt-4 border-t">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe un mensaje..."
            disabled={isSending}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
