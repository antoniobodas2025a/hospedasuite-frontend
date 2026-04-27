'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BedDouble, Users, DollarSign, Plus, Edit, Link2, RefreshCw, Search, Filter } from 'lucide-react';
import { useInventory, Room } from '@/hooks/useInventory';
import { syncChannelManagerAction } from '@/app/actions/channel-manager';
import EmptyState from '@/components/ui/EmptyState'; 
import RoomEditorModal from './RoomEditorModal';
import { cn } from '@/lib/utils';

// ==========================================
// BLOQUE 1: CONTRATOS REPARADOS (Zero-Trust)
// ==========================================

// 🛡️ REPARACIÓN: El panel ahora exige initialRooms para evitar el Waterfall Fetch
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
}

// ==========================================
// BLOQUE 2: MICRO-COMPONENTES (Estilo Mac 2026)
// ==========================================

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
      return { label: 'Inactiva', badge: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', dot: 'bg-zinc-500' };
  }
};

const InventorySkeleton = () => (
  <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} className='bg-zinc-900/20 backdrop-blur-3xl rounded-[2.5rem] p-6 border border-white/5 shadow-2xl animate-pulse'>
        <div className='w-14 h-14 bg-zinc-800/50 rounded-2xl mb-6'></div>
        <div className='h-6 bg-zinc-800/50 rounded-full w-2/3 mb-4'></div>
        <div className='h-4 bg-zinc-800/50 rounded-full w-1/2 mb-8'></div>
        <div className='flex gap-3'>
          <div className='h-10 bg-zinc-800/50 rounded-xl w-1/2'></div>
          <div className='h-10 bg-zinc-800/50 rounded-xl w-1/2'></div>
        </div>
      </div>
    ))}
  </div>
);

// ==========================================
// BLOQUE 3: CAPA DE PRESENTACIÓN
// ==========================================

const InventoryPanelView: React.FC<InventoryPanelViewProps> = ({
  rooms, isLoading, searchTerm, setSearchTerm, filterStatus, setFilterStatus, isSyncing, onSync, onOpenEditor
}) => {
  return (
    <div className='space-y-8 pb-20 font-poppins text-zinc-100'>
      
      {/* HEADER TIPO DYNAMIC ISLAND (Mac 2026 Style) */}
      <div className='flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-[#09090b]/80 backdrop-blur-3xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl sticky top-4 z-20'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight text-white flex items-center gap-3'>
            Matriz de Inventario
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-full border border-indigo-500/30 uppercase tracking-widest">{rooms.length} Unidades</span>
          </h2>
          <p className='text-zinc-400 font-medium text-sm mt-1'>Control topológico de la propiedad y sincronización OTA.</p>
        </div>
        
        <div className='flex flex-wrap items-center gap-3 w-full lg:w-auto bg-zinc-950 p-2 rounded-3xl border border-white/5 shadow-inner'>
          
          <div className='relative flex-1 lg:w-48'>
            <Search className='absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-500 stroke-[2]' />
            <input
              type='text'
              placeholder='Buscar unidad...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='w-full pl-11 pr-4 py-3 bg-zinc-900/50 hover:bg-zinc-900 border border-transparent hover:border-white/10 rounded-2xl text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all'
            />
          </div>

          <div className='relative'>
            <Filter className='absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-500 stroke-[2]' />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className='pl-11 pr-10 py-3 bg-zinc-900/50 hover:bg-zinc-900 border border-transparent hover:border-white/10 rounded-2xl text-sm text-zinc-200 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer transition-all font-medium'
            >
              <option value='all'>Todos los Estados</option>
              <option value='available'>Disponibles</option>
              <option value='occupied'>Ocupadas</option>
              <option value='dirty'>Sucias / Aseo</option>
              <option value='maintenance'>Mantenimiento</option>
            </select>
          </div>

          <div className="w-px h-8 bg-white/10 mx-1 hidden sm:block"></div>

          <button 
            onClick={onSync} 
            disabled={isSyncing}
            className='p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl transition-all disabled:opacity-50 active:scale-95'
            title="Sincronizar Channel Manager"
          >
            <RefreshCw className={cn("size-5 stroke-[2]", isSyncing && "animate-spin")} />
          </button>
          
          <button 
            onClick={() => onOpenEditor()}
            className='flex items-center gap-2 px-6 py-3 bg-white hover:bg-zinc-200 text-black rounded-2xl font-bold text-sm shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all active:scale-95'
          >
            <Plus className="size-5 stroke-[2]" /> Nueva
          </button>
        </div>
      </div>

      {/* RENDERIZADO REACTIVO DE GRID */}
      {isLoading && rooms.length === 0 ? (
        <InventorySkeleton />
      ) : rooms.length === 0 ? (
        <EmptyState 
          icon={BedDouble}
          title="Sin Coincidencias"
          description={searchTerm ? "Modifique los filtros de búsqueda superior." : "Inicie la configuración topológica de su hotel añadiendo una unidad."}
          actionLabel={searchTerm ? "Limpiar Filtros" : "Añadir Unidad"}
          actionOnClick={searchTerm ? () => { setSearchTerm(''); setFilterStatus('all'); } : () => onOpenEditor()}
          color="zinc"
        />
      ) : (
        <motion.div layout className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
          <AnimatePresence>
            {rooms.map((room) => {
              const statusConfig = getStatusConfig(room.status);
              
              return (
                <motion.div 
                  key={room.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -5 }}
                  className='bg-zinc-900/40 backdrop-blur-2xl rounded-[2.5rem] p-6 border border-white/5 shadow-2xl relative overflow-hidden group flex flex-col justify-between'
                >
                  <div className="absolute -right-20 -top-20 w-48 h-48 bg-white/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors duration-700 ease-out"></div>
                  
                  <div className="relative z-10">
                    <div className='flex justify-between items-start mb-6'>
                      <div className='size-14 rounded-[1.2rem] bg-zinc-950 border border-white/10 flex items-center justify-center text-zinc-400 group-hover:text-indigo-400 shadow-inner transition-colors'>
                        <BedDouble className="size-6 stroke-[1.5]" />
                      </div>
                      <div className='flex items-center gap-2'>
                        <span className={cn("size-2 rounded-full", statusConfig.dot)}></span>
                        <span className={cn(`px-3 py-1 rounded-xl text-[9px] font-bold uppercase tracking-[0.2em] border`, statusConfig.badge)}>
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>

                    <h3 className='text-2xl font-bold text-white tracking-tighter mb-1'>{room.name}</h3>
                    <p className='text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-6'>{(room.type || 'ESTÁNDAR')}</p>

                    <div className='space-y-2 mb-8'>
                      <div className='flex justify-between items-center text-zinc-300 text-sm bg-zinc-950/40 px-4 py-3 rounded-2xl border border-white/5'>
                        <span className='flex items-center font-medium text-zinc-500 text-xs uppercase tracking-wider'>
                          <Users className='size-4 mr-2' /> Capacidad
                        </span>
                        <span className='font-bold'>{room.capacity} Pax</span>
                      </div>
                      <div className='flex justify-between items-center text-zinc-300 text-sm bg-zinc-950/40 px-4 py-3 rounded-2xl border border-white/5'>
                        <span className='flex items-center font-medium text-zinc-500 text-xs uppercase tracking-wider'>
                          <DollarSign className='size-4 mr-2 text-emerald-500/50' /> Tarifa Base
                        </span>
                        <span className='font-mono font-bold text-emerald-400'>${(room.base_price || room.price || 0).toLocaleString()}</span>
                      </div>
                      
                      {room.ical_import_url && (
                        <div className='mt-4 flex items-center justify-center text-[10px] font-bold text-sky-400 uppercase tracking-widest bg-sky-500/10 py-2 rounded-xl border border-sky-500/20'>
                          <Link2 className='size-3 mr-2' /> OTA Sync Activa
                        </div>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={() => onOpenEditor(room)}
                    className='relative z-10 w-full py-4 bg-zinc-950 hover:bg-white border border-white/10 hover:border-white text-zinc-400 hover:text-black rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                  >
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
// BLOQUE 4: COMPONENTE CONTENEDOR (Data Logic)
// ==========================================

export default function InventoryPanel({ initialRooms, hotelId }: InventoryPanelContainerProps) {
  // 🛡️ REPARACIÓN: Inicializamos el estado local con los datos del servidor para hidratación instantánea
  const [localRooms, setLocalRooms] = useState<Room[]>(initialRooms);
  
  // Asumimos que useInventory ahora se usa solo para operaciones subsecuentes o ignoramos isLoading si hay datos.
  const { rooms, isLoading, syncRooms } = useInventory(hotelId);
  
  // Sincronización de memoria si el hook trae datos frescos
  useEffect(() => {
    if (rooms && rooms.length > 0) {
      setLocalRooms(rooms);
    }
  }, [rooms]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | undefined>(undefined);

  // Filtrado Seguro
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
    try {
      await syncChannelManagerAction(hotelId);
      await syncRooms(); 
    } catch (error) {
      console.error('Fallo en sincronización OTA:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenEditor = (room?: Room) => {
    setSelectedRoom(room);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = async (needsRefresh?: boolean) => {
    setIsEditorOpen(false);
    setSelectedRoom(undefined);
    if (needsRefresh) {
      await syncRooms();
    }
  };

  // Se oculta el skeleton si ya tenemos initialRooms
  const showLoading = isLoading && localRooms.length === 0;

  return (
    <>
      <InventoryPanelView 
        rooms={filteredRooms}
        isLoading={showLoading}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        isSyncing={isSyncing}
        onSync={handleManualSync}
        onOpenEditor={handleOpenEditor}
      />

      {isEditorOpen && (
        <RoomEditorModal 
          hotelId={hotelId} 
          initialData={selectedRoom} 
          onClose={handleCloseEditor} 
        />
      )}
    </>
  );
}