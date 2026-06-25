'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { LeadDTO, LeadStatus, HotelOption } from '@/types/leads';
import { VALID_LEAD_STATUSES } from '@/types/leads';
import {
  Building2,
  Save,
  Loader2,
  MapPin,
  Globe,
  Star,
  Bot,
  Hash,
  Phone,
} from 'lucide-react';

// ============================================================================
// LeadEditModal — Edit notes, status, and hotel assignment for a single lead.
// Displays read-only lead details (address, website, rating, ai_pitch, etc.).
// ============================================================================

interface LeadEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: LeadDTO | null;
  hotels: HotelOption[];
  onSaveStatus: (leadId: number, status: LeadStatus) => Promise<boolean>;
  onSaveNotes: (leadId: number, notes: string) => Promise<boolean>;
  onAssignHotel: (leadId: number, hotelId: string | null) => Promise<boolean>;
}

export default function LeadEditModal({
  open,
  onOpenChange,
  lead,
  hotels,
  onSaveStatus,
  onSaveNotes,
  onAssignHotel,
}: LeadEditModalProps) {
  const [status, setStatus] = useState<LeadStatus>('new');
  const [notes, setNotes] = useState('');
  const [hotelSearch, setHotelSearch] = useState('');
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync local state when lead changes
  React.useEffect(() => {
    if (lead) {
      setStatus((lead.status as LeadStatus) ?? 'new');
      setNotes(lead.notes ?? '');
      setSelectedHotelId(lead.hotel_id ?? null);
      setHotelSearch('');
      setError(null);
    }
  }, [lead]);

  // Client-filter hotel list
  const filteredHotels = useMemo(() => {
    if (!hotelSearch.trim()) return hotels;
    const term = hotelSearch.toLowerCase();
    return hotels.filter((h) => h.name.toLowerCase().includes(term));
  }, [hotels, hotelSearch]);

  const currentHotelName = useMemo(() => {
    if (!selectedHotelId) return null;
    return hotels.find((h) => h.id === selectedHotelId)?.name ?? null;
  }, [selectedHotelId, hotels]);

  const handleSave = async () => {
    if (!lead) return;
    setSaving(true);
    setError(null);

    try {
      // Save all changes in parallel
      const results = await Promise.all([
        onSaveStatus(lead.id, status),
        onSaveNotes(lead.id, notes),
        onAssignHotel(lead.id, selectedHotelId),
      ]);

      if (results.some((r) => !r)) {
        setError('Algunos cambios no se guardaron. Revisá los datos.');
      } else {
        onOpenChange(false);
      }
    } catch {
      setError('Error al guardar cambios.');
    } finally {
      setSaving(false);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg bg-card border border-white/10 rounded-[var(--radius-squircle-2xl)]"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-bold flex items-center gap-2">
            <Building2 className="size-5 text-blue-400" />
            Editar Lead
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
          {/* Lead name (read-only) */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Negocio
            </label>
            <p className="text-white font-semibold text-sm mt-1">
              {lead.business_name}
            </p>
          </div>

          {/* Status editable */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Estado
            </label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as LeadStatus)}
            >
              <SelectTrigger className="mt-1 w-full bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/10">
                {VALID_LEAD_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-white">
                    <span
                      className={`inline-block w-2 h-2 rounded-full mr-2 ${
                        s === 'new'
                          ? 'bg-blue-400'
                          : s === 'contacted'
                            ? 'bg-indigo-400'
                            : s === 'converted'
                              ? 'bg-emerald-400'
                              : 'bg-zinc-500'
                      }`}
                    />
                    {s === 'new'
                      ? 'Nuevo'
                      : s === 'contacted'
                        ? 'Contactado'
                        : s === 'converted'
                          ? 'Convertido'
                          : 'Perdido'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes editable */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Notas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="mt-1 w-full p-3 bg-white/5 border border-white/10 rounded-[var(--radius-squircle-lg)] text-white text-sm resize-none outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder:text-zinc-600"
              placeholder="Notas del lead..."
            />
          </div>

          {/* Hotel assignment */}
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Hotel Asignado
            </label>
            {currentHotelName && (
              <p className="text-zinc-400 text-xs mt-1 mb-1">
                Actual: {currentHotelName}
              </p>
            )}
            <Input
              placeholder="Buscar hotel..."
              value={hotelSearch}
              onChange={(e) => setHotelSearch(e.target.value)}
              className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
            />
            {hotelSearch && filteredHotels.length > 0 && (
              <div className="mt-1 max-h-32 overflow-y-auto bg-white/5 border border-white/10 rounded-[var(--radius-squircle-md)]">
                {filteredHotels.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => {
                      setSelectedHotelId(h.id);
                      setHotelSearch('');
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    {h.name}
                  </button>
                ))}
              </div>
            )}
            {selectedHotelId && (
              <button
                type="button"
                onClick={() => setSelectedHotelId(null)}
                className="mt-1 text-xs text-zinc-500 hover:text-rose-400 transition-colors"
              >
                Quitar asignación
              </button>
            )}
          </div>

          {/* Read-only details */}
          <div className="border-t border-white/10 pt-4">
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
              Detalles del Lead
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {lead.phone && (
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Phone className="size-3 text-zinc-600" />
                  <span>{lead.phone}</span>
                </div>
              )}
              {lead.city_search && (
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <MapPin className="size-3 text-zinc-600" />
                  <span>{lead.city_search}</span>
                </div>
              )}
              {lead.address && (
                <div className="flex items-center gap-1.5 text-zinc-400 col-span-2">
                  <MapPin className="size-3 text-zinc-600" />
                  <span>{lead.address}</span>
                </div>
              )}
              {lead.website && (
                <div className="flex items-center gap-1.5 text-zinc-400 col-span-2">
                  <Globe className="size-3 text-zinc-600" />
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline truncate"
                  >
                    {lead.website}
                  </a>
                </div>
              )}
              {lead.rating != null && (
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Star className="size-3 text-amber-500" />
                  <span>{lead.rating} / 5</span>
                </div>
              )}
              {lead.ai_pitch && (
                <div className="flex items-start gap-1.5 text-zinc-400 col-span-2">
                  <Bot className="size-3 text-indigo-400 mt-0.5 shrink-0" />
                  <span className="text-xs italic">{lead.ai_pitch}</span>
                </div>
              )}
              {lead.google_place_id && (
                <div className="flex items-center gap-1.5 text-zinc-500 col-span-2">
                  <Hash className="size-3 text-zinc-600" />
                  <span className="text-xs font-mono truncate">
                    {lead.google_place_id}
                  </span>
                </div>
              )}
            </div>
            {lead.created_at && (
              <p className="text-[10px] text-zinc-600 mt-3">
                Creado:{' '}
                {new Date(lead.created_at).toLocaleDateString('es-CO', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
        </div>

        {error && (
          <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-[var(--radius-squircle-md)] px-3 py-2">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="border-white/10 text-zinc-400 hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
