'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Evento {
  id: string;
  titulo: string;
  fechaInicio: string;
  fechaFin: string;
  tipo: string;
  color?: string;
  todoElDia?: boolean;
}

interface CalendarViewProps {
  eventos: Evento[];
  onSelectDate?: (date: Date) => void;
  onSelectEvent?: (evento: Evento) => void;
}

const tipoColors: Record<string, string> = {
  ACADEMICO: 'bg-blue-500',
  CULTURAL: 'bg-purple-500',
  DEPORTIVO: 'bg-green-500',
  REUNION_PADRES: 'bg-amber-500',
  FERIADO: 'bg-red-500',
  EVALUACION: 'bg-orange-500',
  OTRO: 'bg-gray-500',
};

export function CalendarView({
  eventos,
  onSelectDate,
  onSelectEvent,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventosForDay = (date: Date) => {
    return eventos.filter((evento) => {
      const inicio = new Date(evento.fechaInicio);
      const fin = new Date(evento.fechaFin);
      return date >= new Date(inicio.toDateString()) && date <= new Date(fin.toDateString());
    });
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="bg-white rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </h2>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Hoy
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {/* Week day headers */}
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-sm font-medium text-muted-foreground border-b"
          >
            {day}
          </div>
        ))}

        {/* Days */}
        {days.map((day, index) => {
          const dayEventos = getEventosForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={index}
              className={cn(
                'min-h-[100px] p-1 border-b border-r cursor-pointer hover:bg-muted/50 transition-colors',
                !isCurrentMonth && 'bg-muted/20',
                index % 7 === 0 && 'border-l'
              )}
              onClick={() => onSelectDate?.(day)}
            >
              <div
                className={cn(
                  'text-sm font-medium p-1 w-7 h-7 flex items-center justify-center rounded-full',
                  isCurrentDay && 'bg-primary text-primary-foreground',
                  !isCurrentMonth && 'text-muted-foreground'
                )}
              >
                {format(day, 'd')}
              </div>
              <div className="space-y-1 mt-1">
                {dayEventos.slice(0, 3).map((evento) => (
                  <div
                    key={evento.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent?.(evento);
                    }}
                    className={cn(
                      'text-xs p-1 rounded truncate text-white cursor-pointer hover:opacity-80',
                      evento.color || tipoColors[evento.tipo] || 'bg-gray-500'
                    )}
                  >
                    {evento.titulo}
                  </div>
                ))}
                {dayEventos.length > 3 && (
                  <div className="text-xs text-muted-foreground p-1">
                    +{dayEventos.length - 3} más
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 p-4 border-t">
        {Object.entries(tipoColors).map(([tipo, color]) => (
          <div key={tipo} className="flex items-center gap-2">
            <div className={cn('w-3 h-3 rounded', color)} />
            <span className="text-xs text-muted-foreground capitalize">
              {tipo.replace('_', ' ').toLowerCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
