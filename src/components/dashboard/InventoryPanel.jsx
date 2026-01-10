import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  RefreshCw,
  Tag,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  X,
  BedDouble,
  CheckCircle2,
} from 'lucide-react';

const InventoryPanel = ({ rooms, inventory, onOpenSync }) => {
  // Desempaquetamos las funciones del hook useInventory
  // (Asumo que tu hook exporta estas funciones estándares. Si tienen otro nombre, solo ajústalo aquí)
  const { createRoom, updateRoom, deleteRoom, loading } = inventory || {};

  // Estado para el Modal de Edición/Creación
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null); // null = Modo Crear

  // Estado del Formulario
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    status: 'available', // available, maintenance, occupied
    is_price_per_person: false,
  });

  // Abrir Modal para Crear
  const handleOpenCreate = () => {
    setEditingRoom(null);
    setFormData({ name: '', price: '', status: 'available' });
    setShowModal(true);
  };

  // Abrir Modal para Editar
  const handleOpenEdit = (room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      price: room.price,
      status: room.status || 'available',
      is_price_per_person: room.is_price_per_person || false,
    });
    setShowModal(true);
  };

  // Guardar (Crear o Editar) con Bloqueo de Seguridad
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingRoom) {
        // 1. Actualizar datos de la habitación
        await updateRoom(editingRoom.id, formData);

        // 2. 🛡️ Lógica de Bloqueo de Seguridad
        if (formData.status === 'maintenance') {
          // Si pasamos a mantenimiento, creamos un bloqueo preventivo en bookings
          await supabase.from('bookings').insert([
            {
              hotel_id: editingRoom.hotel_id,
              room_id: editingRoom.id,
              check_in: new Date().toISOString().split('T')[0],
              check_out: '2030-12-31', // Bloqueo a largo plazo
              status: 'maintenance',
              total_price: 0,
              notes: 'BLOQUEO AUTOMÁTICO: Habitación en mantenimiento',
            },
          ]);
          alert(
            'Habitación puesta en mantenimiento y BLOQUEADA en el calendario.'
          );
        } else {
          // Si vuelve a estar disponible, eliminamos el bloqueo de mantenimiento
          await supabase
            .from('bookings')
            .delete()
            .eq('room_id', editingRoom.id)
            .eq('status', 'maintenance');
        }
      } else {
        await createRoom(formData);
      }
      setShowModal(false);
    } catch (error) {
      alert('Error al guardar: ' + error.message);
    }
  };

  // Eliminar Habitación
  const handleDelete = async (id) => {
    if (
      window.confirm(
        '¿Estás seguro de eliminar esta habitación? Se perderá el historial.'
      )
    ) {
      if (deleteRoom) await deleteRoom(id);
    }
  };

  return (
    <div className='h-full p-6 overflow-y-auto scrollbar-hide relative'>
      {/* 1. HEADER & ACCIONES */}
      <div className='flex flex-col md:flex-row justify-between items-end mb-8 gap-4'>
        <div>
          <h2 className='text-3xl font-serif font-bold text-slate-800'>
            Inventario
          </h2>
          <p className='text-slate-500'>Gestión de tarifas y disponibilidad</p>
        </div>

        <div className='flex gap-3'>
          {/* Botón Nueva Habitación */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleOpenCreate}
            className='px-5 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 hover:bg-black transition-all flex items-center gap-2'
          >
            <Plus size={18} />
            <span>Nueva Habitación</span>
          </motion.button>
        </div>
      </div>

      {/* 2. GRID DE HABITACIONES (Diseño Moderno) */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-24'>
        <AnimatePresence>
          {rooms.map((room, index) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05 }}
              className='group relative bg-white/60 backdrop-blur-xl border border-white/60 p-6 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between min-h-[220px]'
            >
              {/* Encabezado Tarjeta Corregido */}
              <div className='flex justify-between items-start'>
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm
                  ${
                    room.status === 'maintenance'
                      ? 'bg-orange-100 text-orange-600'
                      : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  <BedDouble size={28} />
                </div>

                {/* Menú de Acciones: Visibilidad garantizada y stopPropagation añadido */}
                <div className='flex gap-2 opacity-100 transition-opacity z-10'>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Evita interferencia con clics de la tarjeta
                      handleOpenEdit(room);
                    }}
                    className='p-2 bg-white/90 backdrop-blur-sm rounded-full text-slate-500 hover:text-blue-600 shadow-sm hover:shadow-md transition-all border border-slate-100'
                    title='Editar'
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(room.id);
                    }}
                    className='p-2 bg-white/90 backdrop-blur-sm rounded-full text-slate-500 hover:text-red-500 shadow-sm hover:shadow-md transition-all border border-slate-100'
                    title='Eliminar'
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Info Habitación */}
              <div className='mt-4'>
                <h3 className='text-xl font-bold text-slate-800 uppercase'>
                  {room.name}
                </h3>
                <div className='flex items-center gap-2 mt-1'>
                  <span className='text-2xl font-serif font-bold text-slate-700'>
                    ${parseInt(room.price).toLocaleString()}
                  </span>
                  {/* Etiqueta dinámica de modalidad de cobro */}
                  <span className='text-[10px] text-slate-400 font-bold uppercase tracking-tighter'>
                    {room.is_price_per_person ? '/ persona' : '/ noche'}
                  </span>
                </div>
              </div>

              {/* Footer Tarjeta: Estado y Sync */}
              <div className='mt-6 flex items-center justify-between'>
                <span
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border
                  ${
                    room.status === 'maintenance'
                      ? 'bg-orange-50 text-orange-600 border-orange-100'
                      : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  }`}
                >
                  {room.status === 'maintenance'
                    ? 'Mantenimiento'
                    : 'Disponible'}
                </span>

                <button
                  onClick={() => onOpenSync(room.id)}
                  className='flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors bg-white/50 px-2 py-1 rounded-lg border border-transparent hover:border-blue-100'
                >
                  <RefreshCw size={12} /> Sync
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Tarjeta "Crear Nueva" (Estado Vacío / Relleno) */}
        <motion.button
          whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.4)' }}
          whileTap={{ scale: 0.98 }}
          onClick={handleOpenCreate}
          className='border-2 border-dashed border-slate-300 rounded-[2rem] flex flex-col items-center justify-center p-6 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all min-h-[220px]'
        >
          <div className='w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 shadow-inner'>
            <Plus size={32} />
          </div>
          <span className='font-bold'>Agregar Habitación</span>
        </motion.button>
      </div>

      {/* 3. MODAL DE EDICIÓN / CREACIÓN (Estilo Glass) */}
      <AnimatePresence>
        {showModal && (
          <div className='fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-4'>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className='bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden relative'
            >
              {/* Header Modal */}
              <div className='p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50'>
                <h3 className='font-serif text-xl font-bold text-slate-800'>
                  {editingRoom ? 'Editar Habitación' : 'Nueva Habitación'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className='p-2 bg-white rounded-full text-slate-400 hover:text-red-500 shadow-sm transition-colors'
                >
                  <X size={20} />
                </button>
              </div>

              {/* Formulario */}
              <form
                onSubmit={handleSave}
                className='p-6 space-y-5'
              >
                <div className='space-y-1'>
                  <label className='text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1'>
                    Nombre / Número
                  </label>
                  <input
                    autoFocus
                    className='w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-800 focus:ring-2 focus:ring-slate-900/10 transition-all placeholder:text-slate-300'
                    placeholder='Ej: 101, Suite Presidencial'
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className='space-y-1'>
                  <label className='text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1'>
                    Precio por Noche (COP)
                  </label>
                  <div className='relative'>
                    <span className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold'>
                      $
                    </span>
                    <input
                      type='number'
                      className='w-full p-4 pl-8 bg-slate-50 rounded-2xl border-none font-bold text-slate-800 focus:ring-2 focus:ring-slate-900/10'
                      placeholder='0'
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className='space-y-1'>
                  <label className='text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1'>
                    Estado Actual
                  </label>
                  <div className='grid grid-cols-2 gap-3'>
                    <button
                      type='button'
                      onClick={() =>
                        setFormData({ ...formData, status: 'available' })
                      }
                      className={`p-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all
                        ${
                          formData.status === 'available'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm'
                            : 'bg-white border-slate-100 text-slate-400'
                        }`}
                    >
                      {formData.status === 'available' && (
                        <CheckCircle2 size={16} />
                      )}
                      Disponible
                    </button>
                    <button
                      type='button'
                      onClick={() =>
                        setFormData({ ...formData, status: 'maintenance' })
                      }
                      className={`p-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all
                        ${
                          formData.status === 'maintenance'
                            ? 'bg-orange-50 border-orange-200 text-orange-600 shadow-sm'
                            : 'bg-white border-slate-100 text-slate-400'
                        }`}
                    >
                      {formData.status === 'maintenance' && (
                        <CheckCircle2 size={16} />
                      )}
                      Mantenimiento
                    </button>
                  </div>
                </div>

                <div className='flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100'>
                  <div className='flex flex-col'>
                    <span className='text-sm font-bold text-slate-800'>
                      Cobro por Persona
                    </span>
                    <span className='text-[10px] text-slate-500 font-bold uppercase tracking-tighter'>
                      Tarifa x Nro. de Huéspedes
                    </span>
                  </div>
                  <button
                    type='button'
                    onClick={() =>
                      setFormData({
                        ...formData,
                        is_price_per_person: !formData.is_price_per_person,
                      })
                    }
                    className={`w-12 h-6 rounded-full transition-all relative ${
                      formData.is_price_per_person
                        ? 'bg-cyan-600'
                        : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                        formData.is_price_per_person ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <button
                  type='submit'
                  disabled={loading}
                  className='w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all mt-4'
                >
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InventoryPanel;
