'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BedDouble, Users, DollarSign, Plus, Edit, Trash2, Link2, RefreshCw, Search, Filter } from 'lucide-react';
import { useInventory, Room } from '@/hooks/useInventory';
import { syncChannelManagerAction } from '@/app/actions/channel-manager';
import EmptyState from '@/components/ui/EmptyState'; 
import RoomEditorModal from './RoomEditorModal';
import { cn } from '@/lib/utils';

// ==========================================
// BLOQUE 1: INTERFACES ESTRICTAS
// ==========================================

interface InventoryPanelContainerProps {
  hotelId: string;
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
// BLOQUE 2: COMPONENTES AUXILIARES (Skeleton & Badges)
// ==========================================

const InventorySkeleton = () => (
  <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} className='bg-zinc-900/40 backdrop-blur-sm rounded-[2rem] p-6 border border-white/5 shadow-xl animate-pulse'>
        <div className='w-12 h-12 bg-zinc-800/50 rounded-2xl mb-4'></div>
        <div className='h-5 bg-zinc-800/50 rounded-full w-3/4 mb-3'></div>
        <div className='h-3 bg-zinc-800/50 rounded-full w-1/2 mb-6'></div>
        <div className='flex gap-2'>
          <div className='h-8 bg-zinc-800/50 rounded-xl w-1/3'></div>
          <div className='h-8 bg-zinc-800/50 rounded-xl w-1/3'></div>
        </div>
      </div>
    ))}
  </div>
);

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'active':
    case 'available':
      return { label: 'Disponible', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    case 'maintenance':
      return { label: 'Mantenimiento', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    case 'occupied':
      return { label: 'Ocupada', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' };
    default:
      return { label: 'Inactiva', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' };
  }
};

// ==========================================
// BLOQUE 3: COMPONENTE PRESENTACIONAL (UI Claude 2026)
// ==========================================

const InventoryPanelView: React.FC<InventoryPanelViewProps> = ({
  rooms, isLoading, searchTerm, setSearchTerm, filterStatus, setFilterStatus, isSyncing, onSync, onOpenEditor
}) => {
  return (
    <div className='space-y-6 pb-20 font-poppins text-zinc-100'>
      
      {/* HEADER: Controles de Misión */}
      <div className='flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-zinc-900/40 backdrop-blur-2xl p-6 rounded-3xl border border-white/5 shadow-2xl shadow-black/50'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight text-zinc-50'>Matriz de Inventario</h2>
          <p className='text-zinc-400 font-lora text-sm mt-1'>Gestión topológica de unidades y sincronización OTA.</p>
        </div>
        
        <div className='flex flex-wrap items-center gap-3 w-full lg:w-auto'>
          {/* Barra de Búsqueda Forense */}
          <div className='relative flex-1 lg:w-64'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500 stroke-[1.5]' />
            <input
              type='text'
              placeholder='Buscar unidad...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='w-full pl-10 pr-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all'
            />
          </div>

          {/* Filtro de Estado */}
          <div className='relative'>
            <Filter className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500 stroke-[1.5]' />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className='pl-10 pr-8 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-sm text-zinc-200 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer transition-all'
            >
              <option value='all'>Todos los Estados</option>
              <option value='active'>Disponibles</option>
              <option value='maintenance'>Mantenimiento</option>
            </select>
          </div>

          {/* Botones de Acción Táctica */}
          <button 
            onClick={onSync} 
            disabled={isSyncing}
            className='flex items-center gap-2 px-4 py-2.5 bg-zinc-800/50 hover:bg-zinc-700/50 border border-white/5 text-zinc-300 rounded-xl font-medium text-sm transition-all disabled:opacity-50'
          >
            <RefreshCw className={cn("size-4 stroke-[1.5]", isSyncing && "animate-spin")} />
            <span className="hidden sm:inline">Sincronizar</span>
          </button>
          
          <button 
            onClick={() => onOpenEditor()}
            className='flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all active:scale-95'
          >
            <Plus className="size-4 stroke-[2]" /> Nueva Unidad
          </button>
        </div>
      </div>

      {/* RENDERIZADO CONDICIONAL DE DATA */}
      {isLoading ? (
        <InventorySkeleton />
      ) : rooms.length === 0 ? (
        <EmptyState 
          icon={BedDouble}
          title="Inventario Vacío"
          description={searchTerm ? "No se encontraron unidades que coincidan con los parámetros de búsqueda." : "No hay habitaciones registradas en la base de datos. Inicie añadiendo su primera unidad."}
          actionLabel={searchTerm ? "Limpiar Filtros" : "Añadir Habitación"}
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
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -4 }}
                  className='bg-zinc-900/40 backdrop-blur-sm rounded-[2rem] p-6 border border-white/5 shadow-xl relative overflow-hidden group'
                >
                  {/* Resplandor Dinámico */}
                  <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors duration-500"></div>
                  
                  <div className="relative z-10">
                    <div className='flex justify-between items-start mb-6'>
                      <div className='size-12 rounded-2xl bg-zinc-800/80 border border-white/5 flex items-center justify-center text-zinc-300 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 transition-colors'>
                        <BedDouble className="size-6 stroke-[1.5]" />
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </div>

                    <h3 className='text-xl font-bold text-zinc-50 mb-1 truncate'>{room.name}</h3>
                    <p className='text-sm text-zinc-500 font-mono mb-6 truncate'>{(room.type || 'Estándar').toUpperCase()}</p>

                    <div className='space-y-3 mb-6'>
                      <div className='flex items-center text-zinc-400 text-sm bg-zinc-950/30 p-2.5 rounded-xl border border-white/5'>
                        <Users className='size-4 mr-3 text-zinc-500' />
                        <span className='font-medium'>Capacidad:</span>
                        <span className='ml-auto text-zinc-200 font-bold'>{room.capacity} pax</span>
                      </div>
                      <div className='flex items-center text-zinc-400 text-sm bg-zinc-950/30 p-2.5 rounded-xl border border-white/5'>
                        <DollarSign className='size-4 mr-3 text-emerald-500/70' />
                        <span className='font-medium'>Tarifa Base:</span>
                        <span className='ml-auto text-zinc-200 font-mono'>${(room.base_price || room.price || 0).toLocaleString()}</span>
                      </div>
                      {room.ical_import_url && (
                        <div className='flex items-center text-xs text-sky-400/80 bg-sky-500/5 p-2 rounded-xl border border-sky-500/10'>
                          <Link2 className='size-3 mr-2' /> Sincronización OTA Activa
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => onOpenEditor(room)}
                      className='w-full py-3 bg-zinc-800/50 hover:bg-indigo-600 border border-white/5 hover:border-indigo-500 text-zinc-300 hover:text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2'
                    >
                      <Edit className='size-4 stroke-[2]' /> Configurar Unidad
                    </button>
                  </div>
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
// BLOQUE 4: COMPONENTE CONTENEDOR (Máquina de Estados)
// ==========================================

export default function InventoryPanel({ hotelId }: InventoryPanelContainerProps) {
  const { rooms, isLoading, syncRooms } = useInventory(hotelId);
  
  // Estado Local (UI State)
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Estado de Modal
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | undefined>(undefined);

  // 🚨 Lógica de Filtrado Memoria (Memoizada y BLINDADA CON ZERO-TRUST)
  const filteredRooms = useMemo(() => {
    // Escudo Cero Confianza: Si rooms es undefined o null, se convierte en un arreglo vacío.
    const safeRooms = Array.isArray(rooms) ? rooms : [];
    
    return safeRooms.filter((room) => {
      // Usamos Optional Chaining (?.) por si el objeto room no tiene la propiedad name.
      const matchesSearch = room?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
      const matchesStatus = filterStatus === 'all' || room?.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [rooms, searchTerm, filterStatus]);

  // Handler de Acciones
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

  return (
    <>
      <InventoryPanelView 
        rooms={filteredRooms}
        isLoading={isLoading}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        isSyncing={isSyncing}
        onSync={handleManualSync}
        onOpenEditor={handleOpenEditor}
      />

      {/* Portal Inyectado Fuera del Layout de Rejilla */}
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