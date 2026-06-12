'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BedDouble, Users, DollarSign, Plus, Edit, Link2, RefreshCw, Search, Filter, Image as ImageIcon, Copy, KeyRound, Check } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import type { Room } from '@/types';
import { syncChannelManagerAction } from '@/app/actions/channel-manager';
import { regenerateIcalTokenAction } from '@/app/actions/inventory';
import EmptyState from '@/components/ui/EmptyState'; 
import RoomEditorModal from './RoomEditorModal';
import { cn } from '@/lib/utils';

// ==========================================
// BLOQUE 1: CONTRATOS (Zero-Trust)
// ==========================================

interface InventoryPanelContainerProps {
  hotelId: string;
  initialRooms: Room[];
}

interface InventoryPanelViewProps {
  rooms: Room[];
  isLoading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  isSyncing: boolean;
  onSync: () => void;
  onOpenEditor: (room?: Room) => void;
  copiedId: string | null;
  regeneratingId: string | null;
  onCopyUrl: (roomId: string, url: string) => void;
  onRegenerateToken: (roomId: string) => void;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'active':
    case 'available':
      return { label: 'Disponible', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]', dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' };
    case 'maintenance':
      return { label: 'Mantenimiento', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]', dot: 'bg-amber-500' };
    case 'occupied':
      return { label: 'Ocupada', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.1)]', dot: 'bg-indigo-500' };
    case 'dirty':
      return { label: 'Sucia / Check-out', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]', dot: 'bg-rose-500 animate-pulse' };
    default:
      return { label: 'Inactiva', badge: 'bg-muted text-muted-foreground border-border', dot: 'bg-muted' };
  }
};

const InventorySkeleton = () => (
  <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} className='glass-card p-6 animate-pulse min-h-[320px]'>
        <div className='w-14 h-14 bg-muted rounded-[var(--radius-squircle-2xl)] mb-6'></div>
        <div className='h-6 bg-muted rounded-full w-2/3 mb-4'></div>
        <div className='h-4 bg-muted rounded-full w-1/2 mb-8'></div>
        <div className='flex gap-3'>
          <div className='h-10 bg-muted rounded-[var(--radius-squircle-lg)] w-1/2'></div>
          <div className='h-10 bg-muted rounded-[var(--radius-squircle-lg)] w-1/2'></div>
        </div>
      </div>
    ))}
  </div>
);

// ==========================================
// BLOQUE 2: CAPA DE PRESENTACIÓN
// ==========================================

const InventoryPanelView: React.FC<InventoryPanelViewProps> = ({
  rooms, isLoading, searchTerm, setSearchTerm, filterStatus, setFilterStatus, isSyncing, onSync, onOpenEditor,
  copiedId, regeneratingId, onCopyUrl, onRegenerateToken
}) => {
  return (
    <div className='space-y-8 pb-20 font-poppins text-foreground'>
      
      {/* HEADER TIPO DYNAMIC ISLAND */}
      <div className='flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 glass-panel p-6 sticky top-4 z-20'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight text-white flex items-center gap-3'>
            Matriz de Inventario
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-full border border-indigo-500/30 uppercase tracking-widest">{rooms.length} Unidades</span>
          </h2>
          <p className='text-muted-foreground font-medium text-sm mt-1'>Control topológico de la propiedad y sincronización de canales.</p>
        </div>
        
        <div className='flex flex-wrap items-center gap-3 w-full lg:w-auto bg-muted p-2 rounded-[var(--radius-squircle-3xl)] border border-border shadow-inner'>
          <div className='relative flex-1 lg:w-48'>
            <Search className='absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground stroke-[2]' />
            <input
              type='text'
              placeholder='Buscar unidad...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='w-full pl-11 pr-4 py-3 bg-card hover:bg-card border border-transparent hover:border-border rounded-[var(--radius-squircle-2xl)] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all'
            />
          </div>
          <div className='relative'>
            <Filter className='absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground stroke-[2]' />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className='pl-11 pr-10 py-3 bg-card hover:bg-card border border-transparent hover:border-border rounded-[var(--radius-squircle-2xl)] text-sm text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer transition-all font-medium'
            >
              <option value='all'>Todos los Estados</option>
              <option value='available'>Disponibles</option>
              <option value='occupied'>Ocupadas</option>
              <option value='dirty'>Sucias / Aseo</option>
              <option value='maintenance'>Mantenimiento</option>
            </select>
          </div>
          <div className="w-px h-8 bg-muted mx-1 hidden sm:block"></div>
          <button onClick={onSync} disabled={isSyncing} className='p-3 bg-muted hover:bg-accent text-foreground rounded-[var(--radius-squircle-2xl)] transition-all disabled:opacity-50 active:scale-95' title="Sincronizar Channel Manager">
            <RefreshCw className={cn("size-5 stroke-[2]", isSyncing && "animate-spin")} />
          </button>
          <button onClick={() => onOpenEditor()} className='flex items-center gap-2 px-6 py-3 bg-foreground hover:bg-accent text-black rounded-[var(--radius-squircle-2xl)] font-bold text-sm shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all active:scale-95'>
            <Plus className="size-5 stroke-[2]" /> Nueva
          </button>
        </div>
      </div>

      {/* RENDERIZADO REACTIVO DE GRID CON DEEP GLASS */}
      {isLoading && rooms.length === 0 ? (
        <InventorySkeleton />
      ) : rooms.length === 0 ? (
        <EmptyState icon={BedDouble} title="Sin Coincidencias" description={searchTerm ? "Modifique los filtros de búsqueda superior." : "Inicie la configuración topológica de su hotel añadiendo una unidad."} actionLabel={searchTerm ? "Limpiar Filtros" : "Añadir Unidad"} actionOnClick={searchTerm ? () => { setSearchTerm(''); setFilterStatus('all'); } : () => onOpenEditor()} color="muted" />
      ) : (
        <motion.div layout className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
          <AnimatePresence>
            {rooms.map((room) => {
              const statusConfig = getStatusConfig(room.status);
              
              // 🚨 FIX FORENSE: Extracción robusta de la imagen de portada (String o JSON Object)
              let coverImage = null;
              if (Array.isArray(room.gallery) && room.gallery.length > 0) {
                coverImage = typeof room.gallery[0] === 'string' ? room.gallery[0] : room.gallery[0]?.url;
              }
              
              return (
                <motion.div 
                  key={room.id} layout initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} whileHover={{ y: -5 }}
                  className='glass-card rounded-[var(--radius-squircle-3xl)] p-6 border border-border shadow-2xl relative overflow-hidden group flex flex-col justify-between min-h-[340px]'
                >
                  {/* BACKGROUND LAYER (Deep Glass) */}
                  {coverImage ? (
                    <>
                      <div className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:opacity-50 transition-opacity duration-700 blur-[2px] group-hover:blur-0" style={{ backgroundImage: `url(${coverImage})` }} />
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/40" />
                    </>
                  ) : (
                    <div className="absolute -right-20 -top-20 w-48 h-48 bg-muted rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors duration-700 ease-out"></div>
                  )}
                  
                  <div className="relative z-10 flex-1 flex flex-col">
                    <div className='flex justify-between items-start mb-auto'>
                      <div className='size-14 glass-card flex items-center justify-center text-muted-foreground group-hover:text-indigo-400 shadow-inner transition-colors'>
                        {coverImage ? <ImageIcon className="size-6 stroke-[1.5] opacity-50" /> : <BedDouble className="size-6 stroke-[1.5]" />}
                      </div>
                      <div className='flex items-center gap-2'>
                        <span className={cn("size-2 rounded-full", statusConfig.dot)}></span>
                        <span className={cn(`px-3 py-1 rounded-[var(--radius-squircle-lg)] text-[9px] font-bold uppercase tracking-ultra border backdrop-blur-sm`, statusConfig.badge)}>
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>

                    <div className="mt-8">
                      <h3 className='text-2xl font-bold text-white tracking-tighter mb-1 drop-shadow-md'>{room.name}</h3>
                      <p className='text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-4 drop-shadow-md'>{(room.type || 'ESTÁNDAR')}</p>

                      <div className='space-y-2 mb-6'>
                        <div className='flex justify-between items-center text-foreground text-sm glass-card px-4 py-3 shadow-inner'>
                          <span className='flex items-center font-medium text-muted-foreground text-xs uppercase tracking-wider'><Users className='size-4 mr-2' /> Aforo</span>
                          <span className='font-bold'>{room.capacity} Pax</span>
                        </div>
                        <div className='flex justify-between items-center text-foreground text-sm glass-card px-4 py-3 shadow-inner'>
                          <span className='flex items-center font-medium text-muted-foreground text-xs uppercase tracking-wider'><DollarSign className='size-4 mr-2 text-emerald-500/70' /> Tarifa Base</span>
                          <span className='font-mono font-bold text-emerald-400'>${(room.price || 0).toLocaleString()}</span>
                        </div>
                        {room.ical_import_url && (
                          <div className='mt-3 flex items-center justify-center text-[9px] font-bold text-sky-400 uppercase tracking-widest glass-card py-2 border-sky-500/20 bg-sky-500/10'>
                            <Link2 className='size-3 mr-2' /> Sincronización Activa
                          </div>
                        )}
                        
                        {/* ─── iCal Export URL ────────────────────────── */}
                        {room.ical_export_token ? (
                          <div className='mt-3 flex items-center gap-2 text-[9px] font-bold text-emerald-400 uppercase tracking-widest glass-card py-2 px-3 border-emerald-500/20 bg-emerald-500/10'>
                            <Link2 className='size-3 flex-shrink-0' />
                            <span className='truncate flex-1 text-[8px] tracking-normal font-mono lowercase'>
                              iCal: .../{room.ical_export_token.substring(0, 8)}...
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const url = `${window.location.origin}/api/webhooks/tenant/ical/${room.ical_export_token}`;
                                onCopyUrl(room.id, url);
                              }}
                              className='flex items-center gap-1 px-2 py-1 rounded-[var(--radius-squircle-md)] bg-muted hover:bg-accent text-foreground hover:text-white transition-all text-[8px] font-sans uppercase tracking-widest'
                              title='Copiar URL iCal'
                            >
                              {copiedId === room.id ? (
                                <><Check className='size-3' /> Copiado!</>
                              ) : (
                                <><Copy className='size-3' /> Copiar</>
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className='mt-3 flex items-center justify-center'>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRegenerateToken(room.id);
                              }}
                              disabled={regeneratingId === room.id}
                              className='flex items-center gap-2 text-[9px] font-bold text-amber-400 uppercase tracking-widest glass-card px-4 py-2 border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                              {regeneratingId === room.id ? (
                                <><RefreshCw className='size-3 animate-spin' /> Generando...</>
                              ) : (
                                <><KeyRound className='size-3' /> Generar Token iCal</>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button onClick={() => onOpenEditor(room)} className='relative z-10 w-full py-4 glass-card hover:bg-foreground hover:text-black text-foreground font-bold text-sm transition-all flex items-center justify-center gap-2 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]'>
                    <Edit className='size-4 stroke-[2]' /> Editar Unidad
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};

// ==========================================
// BLOQUE 3: COMPONENTE CONTENEDOR (Data Logic)
// ==========================================

export default function InventoryPanel({ initialRooms, hotelId }: InventoryPanelContainerProps) {
  const [localRooms, setLocalRooms] = useState<Room[]>(initialRooms || []);
  const { rooms, isLoading, syncRooms } = useInventory(hotelId);
  
  // 🚨 FIX FORENSE: Sincronización Absoluta (Zero-Trust)
  // Se elimina la restricción `rooms.length > 0` que causaba el "Estado Fantasma".
  // El componente ahora confía ciegamente en el hook: Si la BD reporta 0, renderiza 0.
  useEffect(() => {
    if (rooms) { 
      setLocalRooms(rooms); 
    }
  }, [rooms]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | undefined>(undefined);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const filteredRooms = useMemo(() => {
    const safeRooms = Array.isArray(localRooms) ? localRooms : [];
    return safeRooms.filter((room) => {
      const matchesSearch = room?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
      const matchesStatus = filterStatus === 'all' || room?.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [localRooms, searchTerm, filterStatus]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try { await syncChannelManagerAction(hotelId); await syncRooms(); } 
    catch (error) { console.error('Fallo de sincronización:', error); } 
    finally { setIsSyncing(false); }
  };

  const handleOpenEditor = (room?: Room) => { setSelectedRoom(room); setIsEditorOpen(true); };
  
  const handleCopyUrl = async (roomId: string, url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(roomId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRegenerateToken = async (roomId: string) => {
    setRegeneratingId(roomId);
    const result = await regenerateIcalTokenAction(roomId);
    if (result.success) {
      await syncRooms();
    }
    setRegeneratingId(null);
  };
  
  const handleCloseEditor = async (needsRefresh?: boolean) => {
    setIsEditorOpen(false); 
    setSelectedRoom(undefined);
    if (needsRefresh) { await syncRooms(); }
  };

  const showLoading = isLoading && localRooms.length === 0;

  return (
    <>
      <InventoryPanelView 
        rooms={filteredRooms} isLoading={showLoading} searchTerm={searchTerm} setSearchTerm={setSearchTerm}
        filterStatus={filterStatus} setFilterStatus={setFilterStatus} isSyncing={isSyncing} onSync={handleManualSync} onOpenEditor={handleOpenEditor}
        copiedId={copiedId} regeneratingId={regeneratingId} onCopyUrl={handleCopyUrl} onRegenerateToken={handleRegenerateToken}
      />
      {isEditorOpen && <RoomEditorModal hotelId={hotelId} initialData={selectedRoom} onClose={handleCloseEditor} />}
    </>
  );
}