'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BedDouble, Users, DollarSign, Plus, Edit, Trash2, Link2, RefreshCw, Loader2 } from 'lucide-react';
import { useInventory, Room } from '@/hooks/useInventory';
import { syncChannelManagerAction } from '@/app/actions/channel-manager';
import EmptyState from '@/components/ui/EmptyState'; 
import RoomEditorModal from './RoomEditorModal';

interface InventoryPanelProps {
  initialRooms: Room[];
  hotelId: string;
}

// 🚨 COMPONENTE SKELETON (Carga Inicial Elegante)
const InventorySkeleton = () => (
  <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className='bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm animate-pulse'>
        <div className='w-12 h-12 bg-slate-200 rounded-2xl mb-4'></div>
        <div className='h-6 bg-slate-200 rounded-full w-3/4 mb-2'></div>
        <div className='h-3 bg-slate-200 rounded-full w-1/4 mb-6'></div>
        <div className='space-y-3'>
          <div className='h-12 bg-slate-50 rounded-xl w-full'></div>
          <div className='h-12 bg-slate-50 rounded-xl w-full'></div>
        </div>
      </div>
    ))}
  </div>
);

const InventoryPanel = ({ initialRooms, hotelId }: InventoryPanelProps) => {
  const {
    rooms, isEditing, setIsEditing, roomForm, setRoomForm,
    createRoom, updateRoom, deleteRoom, openNewRoomModal, openEditModal, selectedRoom,
  } = useInventory(initialRooms, hotelId);

  const [isSyncing, setIsSyncing] = useState(false);
  
  // 🚨 ESTADO DE HIDRATACIÓN PARA EVITAR EL PARPADEO
  const [isClientMounted, setIsClientMounted] = useState(false);

  useEffect(() => {
    setIsClientMounted(true);
  }, []);

  const copyIcalLink = (roomId: string) => {
    const url = `${window.location.origin}/api/ical/${roomId}`;
    navigator.clipboard.writeText(url);
    alert('✅ Enlace iCal copiado. Ve a Booking.com o Airbnb y pégalo en la sección de importar calendario.');
  };

  const handleSyncOTAs = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await syncChannelManagerAction(hotelId);
      alert(res.message || res.error);
    } catch (error) {
      alert('Error de conexión al sincronizar.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className='space-y-6 pb-20'>
      
      {/* CABECERA */}
      <div className='flex justify-between items-center bg-white/50 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-sm'>
        <div>
          <h2 className='text-2xl font-display font-bold text-slate-800'>Inventario de Activos</h2>
          <p className='text-slate-500 text-sm'>Gestiona la flota de habitaciones y sus tarifas.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleSyncOTAs} 
            disabled={isSyncing || rooms.length === 0 || !isClientMounted} 
            className='bg-blue-50 text-blue-600 px-4 py-3 rounded-2xl font-bold hover:bg-blue-100 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {isSyncing ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
          
          <button onClick={openNewRoomModal} className='bg-hospeda-900 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2'>
            <Plus size={20} /> Crear Habitación
          </button>
        </div>
      </div>

      {/* 🚨 RENDERIZADO CONDICIONAL DE 3 FASES (V2) */}
      {!isClientMounted ? (
        // FASE 1: Montaje (Evita parpadeos y errores de hidratación)
        <InventorySkeleton />
      ) : rooms.length === 0 ? (
        // FASE 2: Base de datos vacía
        <EmptyState 
          icon={BedDouble} 
          title="Construye tu Hotel" 
          description="Para poder recibir huéspedes y ver tu calendario en acción, primero necesitas configurar las habitaciones y tarifas de tu propiedad."
          actionLabel="Añadir mi primera habitación"
          actionOnClick={openNewRoomModal}
          color="emerald"
        />
      ) : (
        // FASE 3: Datos reales
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
          {rooms.map((room) => (
            <motion.div key={room.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className='bg-white rounded-[2rem] p-6 border border-slate-100 shadow-xl shadow-slate-200/50 group hover:border-hospeda-200 transition-all relative overflow-hidden'>
              <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${room.status === 'clean' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                {room.status === 'clean' ? 'Limpia' : 'Sucia'}
              </div>

              <div className='mb-4'>
                <div className='w-12 h-12 bg-hospeda-50 rounded-2xl flex items-center justify-center text-hospeda-600 mb-4 group-hover:scale-110 transition-transform'>
                  <BedDouble size={24} />
                </div>
                <h3 className='text-xl font-bold text-slate-800'>{room.name}</h3>
                <p className='text-slate-400 text-xs uppercase font-bold tracking-wider'>{room.type}</p>
              </div>

              <div className='space-y-3'>
                <div className='flex items-center justify-between p-3 bg-slate-50 rounded-xl'>
                  <div className='flex items-center gap-2 text-slate-500'><Users size={16} /><span className='text-xs font-bold'>Capacidad</span></div>
                  <span className='font-bold text-slate-800'>{room.capacity} Pax</span>
                </div>
                <div className='flex items-center justify-between p-3 bg-slate-50 rounded-xl'>
                  <div className='flex items-center gap-2 text-slate-500'><DollarSign size={16} /><span className='text-xs font-bold'>Tarifa Base</span></div>
                  <span className='font-bold text-emerald-600 text-lg'>${room.price.toLocaleString()}</span>
                </div>
              </div>

              <div className='absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur translate-y-full group-hover:translate-y-0 transition-transform flex gap-2 justify-center border-t border-slate-100'>
                <button onClick={() => copyIcalLink(room.id)} className='p-3 hover:bg-blue-50 rounded-xl text-blue-500 transition-colors' title='Copiar Enlace iCal (Sync)'>
                  <Link2 size={20} />
                </button>
                <button onClick={() => openEditModal(room)} className='p-3 hover:bg-hospeda-50 rounded-xl text-hospeda-600 transition-colors' title='Editar'>
                  <Edit size={20} />
                </button>
                <button onClick={() => deleteRoom(room.id)} className='p-3 hover:bg-red-50 rounded-xl text-red-500 transition-colors' title='Eliminar'>
                  <Trash2 size={20} />
                </button>
              </div>
            </motion.div>
          ))}

          <button onClick={openNewRoomModal} className='border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center gap-4 min-h-[300px] text-slate-400 hover:border-hospeda-300 hover:text-hospeda-500 hover:bg-hospeda-50/50 transition-all'>
            <div className='w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center'><Plus size={32} /></div>
            <span className='font-bold'>Añadir Habitación</span>
          </button>
        </div>
      )}

      {/* MODAL DE EDICIÓN / CREACIÓN */}
      <AnimatePresence>
        {isEditing && (
          <div className='fixed inset-0 z-[100] flex items-center justify-center p-4 bg-hospeda-950/60 backdrop-blur-md'>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className='bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative'>
              <h3 className='text-2xl font-display font-bold text-slate-800 mb-6'>{selectedRoom ? 'Editar Activo' : 'Nuevo Activo'}</h3>
              <div className='space-y-4'>
                <div>
                  <label className='text-xs font-bold text-slate-400 uppercase ml-2'>Nombre / Número</label>
                  <input className='w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-hospeda-200' placeholder='Ej: Habitación 101' value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} />
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='text-xs font-bold text-slate-400 uppercase ml-2'>Tipo</label>
                    <select className='w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none' value={roomForm.type} onChange={(e) => setRoomForm({ ...roomForm, type: e.target.value })}>
                      <option value='standard'>Estándar</option>
                      <option value='suite'>Suite</option>
                      <option value='deluxe'>Deluxe</option>
                    </select>
                  </div>
                  <div>
                    <label className='text-xs font-bold text-slate-400 uppercase ml-2'>Capacidad</label>
                    <input type='number' className='w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none' value={roomForm.capacity} onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })} />
                  </div>
                </div>
                
                <div className='grid grid-cols-2 gap-4 mt-2'>
                  <div>
                    <label className='text-xs font-bold text-slate-400 uppercase ml-2'>Tarifa (Dom-Jue)</label>
                    <div className='relative'>
                      <span className='absolute left-4 top-4 text-slate-400 font-bold'>$</span>
                      <input 
                        type='number' 
                        className='w-full p-4 pl-8 bg-slate-50 rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-200' 
                        value={roomForm.price === 0 ? '' : roomForm.price} 
                        onChange={(e) => { 
                          const val = e.target.value === '' ? 0 : Number(e.target.value); 
                          setRoomForm({ ...roomForm, price: val }); 
                        }} 
                      />
                    </div>
                  </div>
                  <div>
                    <label className='text-[10px] font-bold text-emerald-500 uppercase ml-2'>Tarifa (Vie-Sáb)</label>
                    <div className='relative'>
                      <span className='absolute left-4 top-4 text-emerald-500 font-bold'>$</span>
                      <input 
                        type='number' 
                        className='w-full p-4 pl-8 bg-emerald-50 border border-emerald-100 rounded-2xl font-bold text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-300 placeholder:text-emerald-200' 
                        placeholder='Opcional'
                        value={roomForm.weekend_price === 0 ? '' : roomForm.weekend_price} 
                        onChange={(e) => { 
                          const val = e.target.value === '' ? 0 : Number(e.target.value); 
                          setRoomForm({ ...roomForm, weekend_price: val }); 
                        }} 
                      />
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-slate-100 mt-4">
                  <label className='text-xs font-bold text-slate-400 uppercase ml-2 flex items-center gap-2'>
                    <Link2 size={12}/> Importar desde Airbnb / Booking (URL iCal)
                  </label>
                  <input
                    type="url"
                    className='w-full p-4 bg-blue-50/50 rounded-2xl text-sm font-mono text-slate-600 outline-none focus:ring-2 focus:ring-blue-200 border border-blue-100'
                    placeholder='https://www.airbnb.com/calendar/ical/...'
                    value={roomForm.ical_import_url || ''}
                    onChange={(e) => setRoomForm({ ...roomForm, ical_import_url: e.target.value })}
                  />
                </div>

              </div>
              <div className='flex gap-4 mt-8'>
                <button onClick={() => setIsEditing(false)} className='flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-colors'>Cancelar</button>
                <button onClick={() => (selectedRoom ? updateRoom() : createRoom())} className='flex-1 py-4 bg-hospeda-900 text-white font-bold rounded-2xl shadow-xl hover:scale-105 transition-transform'>Guardar Cambios</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InventoryPanel;