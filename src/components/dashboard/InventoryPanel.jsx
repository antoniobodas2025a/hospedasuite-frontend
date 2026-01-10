import React from 'react';
import { Plus, ImageIcon, Edit, UploadCloud, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const InventoryPanel = ({ rooms, inventory, onOpenSync }) => {
  // Desestructuramos el "cerebro"
  const {
    newRoomName,
    setNewRoomName,
    handleCreateRoom,
    openEditRoom,
    editingRoom,
    setEditingRoom,
    handleUpdateRoom,
    roomForm,
    setRoomForm,
    uploading,
    setSelectedFile,
  } = inventory;

  const brandStyle = { backgroundColor: '#06b6d4' }; // Ajusta si usas variables globales

  return (
    <div className='p-8 h-full overflow-auto pb-32'>
      {/* 1. Formulario Agregar Rápido */}
      <div className='bg-white/80 p-8 rounded-[2rem] shadow-sm border border-[#E5E0D8] mb-8 max-w-2xl'>
        <h3 className='font-serif text-2xl font-bold mb-6 text-[#2C2C2C]'>
          Agregar Habitación
        </h3>
        <form
          onSubmit={handleCreateRoom}
          className='flex gap-4'
        >
          <input
            type='text'
            placeholder='Ej: Suite 505'
            className='flex-1 px-6 py-4 bg-[#F9F7F2] rounded-xl border-none outline-none font-bold text-[#2C2C2C] shadow-inner'
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
          />
          <button
            className='text-white px-6 rounded-xl font-bold flex items-center justify-center shadow-lg hover:scale-105 transition-transform'
            style={brandStyle}
          >
            <Plus size={24} />
          </button>
        </form>
      </div>

      {/* 2. GRID DE HABITACIONES */}
      <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6'>
        {rooms.map((r) => (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            key={r.id}
            className='bg-white p-4 rounded-[1.5rem] border border-[#E5E0D8] shadow-sm hover:shadow-md transition-all flex flex-col gap-4 group relative'
          >
            {/* FOTO + LÁPIZ */}
            <div className='h-40 w-full bg-gray-100 rounded-2xl overflow-hidden relative'>
              {r.image_url ? (
                <img
                  src={r.image_url}
                  className='w-full h-full object-cover group-hover:scale-110 transition-transform duration-500'
                  alt={r.name}
                />
              ) : (
                <div className='w-full h-full flex items-center justify-center text-gray-300 bg-slate-50'>
                  <ImageIcon size={32} />
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openEditRoom(r);
                }}
                className='absolute top-3 right-3 bg-white/90 p-2 rounded-full text-slate-700 shadow-sm hover:bg-black hover:text-white transition-all opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0'
                title='Editar habitación'
              >
                <Edit size={14} />
              </button>
            </div>

            {/* DATOS */}
            <div className='flex justify-between items-end'>
              <div>
                <span className='font-serif font-bold text-lg text-[#2C2C2C] block leading-tight mb-1'>
                  {r.name}
                </span>
                <span className='text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded'>
                  ${r.price?.toLocaleString()}
                </span>
              </div>
              {/* Botón Sincronizar Airbnb (Llama a función padre) */}
              <button
                onClick={() => onOpenSync(r.id)}
                className='p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors'
                title='Sincronizar Airbnb'
              >
                <UploadCloud size={18} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 3. MODAL EDITAR HABITACIÓN (Movido aquí para limpiar DashboardPage) */}
      <AnimatePresence>
        {editingRoom && (
          <div className='fixed inset-0 bg-[#2C2C2C]/40 backdrop-blur-sm z-60 flex items-center justify-center p-4'>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className='bg-[#F9F7F2] rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden h-auto max-h-[90vh] overflow-y-auto'
            >
              <div className='p-6 border-b border-[#E5E0D8] flex justify-between items-center'>
                <h3 className='font-serif text-xl font-bold'>
                  Editar Detalles
                </h3>
                <button onClick={() => setEditingRoom(null)}>
                  <X />
                </button>
              </div>

              <form
                onSubmit={handleUpdateRoom}
                className='p-6 space-y-4'
              >
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='text-[10px] font-bold uppercase text-[#5D5555] tracking-widest'>
                      Nombre
                    </label>
                    <input
                      className='w-full p-3 bg-white rounded-xl border-none font-bold'
                      value={roomForm.name}
                      onChange={(e) =>
                        setRoomForm({ ...roomForm, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className='text-[10px] font-bold uppercase text-[#5D5555] tracking-widest'>
                      Precio
                    </label>
                    <input
                      type='number'
                      className='w-full p-3 bg-white rounded-xl border-none font-bold'
                      value={roomForm.price}
                      onChange={(e) =>
                        setRoomForm({ ...roomForm, price: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className='flex items-center gap-2 mt-2'>
                  <input
                    type='checkbox'
                    id='pricePerPerson'
                    checked={roomForm.is_price_per_person}
                    onChange={(e) =>
                      setRoomForm({
                        ...roomForm,
                        is_price_per_person: e.target.checked,
                      })
                    }
                    className='w-4 h-4 text-black rounded border-gray-300 focus:ring-black'
                  />
                  <label
                    htmlFor='pricePerPerson'
                    className='text-xs font-bold text-gray-600 select-none cursor-pointer'
                  >
                    Cobrar por persona
                  </label>
                </div>

                <div className='grid grid-cols-3 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200 mt-4 mb-4'>
                  <div>
                    <label className='text-[9px] font-bold uppercase text-gray-500 tracking-widest'>
                      Personas
                    </label>
                    <input
                      type='number'
                      className='w-full p-2 bg-white rounded-lg border-none font-bold text-center'
                      value={roomForm.capacity}
                      onChange={(e) =>
                        setRoomForm({ ...roomForm, capacity: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className='text-[9px] font-bold uppercase text-gray-500 tracking-widest'>
                      Camas
                    </label>
                    <input
                      type='number'
                      className='w-full p-2 bg-white rounded-lg border-none font-bold text-center'
                      value={roomForm.beds}
                      onChange={(e) =>
                        setRoomForm({ ...roomForm, beds: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className='text-[9px] font-bold uppercase text-gray-500 tracking-widest'>
                      Habitaciones
                    </label>
                    <input
                      type='number'
                      className='w-full p-2 bg-white rounded-lg border-none font-bold text-center'
                      value={roomForm.bedrooms}
                      onChange={(e) =>
                        setRoomForm({ ...roomForm, bedrooms: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className='bg-white p-4 rounded-xl border border-dashed border-gray-300'>
                  <label className='text-[10px] font-bold uppercase text-[#5D5555] tracking-widest block mb-3'>
                    Foto
                  </label>
                  <input
                    type='file'
                    accept='image/*'
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    className='block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#2C2C2C] file:text-white file:cursor-pointer hover:file:bg-black cursor-pointer mb-4'
                  />
                  <input
                    placeholder='O URL directa...'
                    className='w-full p-2 bg-[#F9F7F2] rounded-lg border-none text-xs text-gray-600'
                    value={roomForm.image_url}
                    onChange={(e) =>
                      setRoomForm({ ...roomForm, image_url: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className='text-[10px] font-bold uppercase text-[#5D5555] tracking-widest'>
                    Descripción
                  </label>
                  <textarea
                    rows='3'
                    className='w-full p-3 bg-white rounded-xl border-none text-sm'
                    value={roomForm.description}
                    onChange={(e) =>
                      setRoomForm({ ...roomForm, description: e.target.value })
                    }
                  />
                </div>

                <div className='mb-6 bg-white p-4 rounded-xl border border-gray-100'>
                  <label className='text-[10px] font-bold uppercase text-[#5D5555] tracking-widest block mb-3'>
                    Comodidades
                  </label>
                  <div className='grid grid-cols-2 gap-3'>
                    {[
                      'Wifi',
                      'TV',
                      'Baño Privado',
                      'Agua Caliente',
                      'Vista',
                      'Secador',
                      'Aire Acondicionado',
                      'Parqueadero',
                      'Desayuno',
                      'Piscina',
                      'Minibar',
                      'Gimnasio',
                      'Pet Friendly',
                    ].map((item) => (
                      <label
                        key={item}
                        className='flex items-center gap-2 cursor-pointer'
                      >
                        <input
                          type='checkbox'
                          checked={roomForm.amenities?.includes(item)}
                          onChange={(e) => {
                            const current = roomForm.amenities || [];
                            if (e.target.checked)
                              setRoomForm({
                                ...roomForm,
                                amenities: [...current, item],
                              });
                            else
                              setRoomForm({
                                ...roomForm,
                                amenities: current.filter((i) => i !== item),
                              });
                          }}
                          className='w-4 h-4 rounded text-black focus:ring-black border-gray-300'
                        />
                        <span className='text-xs font-bold text-gray-600'>
                          {item}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  disabled={uploading}
                  className={`w-full text-white font-bold py-4 rounded-xl transition-all shadow-lg ${
                    uploading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-[#2C2C2C] hover:scale-[1.02]'
                  }`}
                >
                  {uploading ? '⏳ Subiendo...' : 'Guardar Cambios'}
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
