'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Search, Plus, MapPin, Phone, Mail, Edit, Trash2, Fingerprint } from 'lucide-react';
import { useGuests, Guest } from '@/hooks/useGuests';

interface GuestsPanelProps {
  initialGuests: Guest[];
  hotelId: string; // 👇 CORRECCIÓN: Añadida la prop obligatoria
}

const GuestsPanel = ({ initialGuests, hotelId }: GuestsPanelProps) => {
  // 👇 CORRECCIÓN: Inyectamos el hotelId al hook
  const {
    guests, totalGuests, searchTerm, handleSearch, isEditing, setIsEditing,
    guestForm, setGuestForm, createGuest, updateGuest, deleteGuest,
    openNewGuestModal, openEditModal, selectedGuest,
  } = useGuests(initialGuests, hotelId); 

  

  return (
    <div className='space-y-6 pb-20'>
      {/* HEADER Y BUSCADOR */}
      <div className='flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-sm'>
        <div>
          <h2 className='text-2xl font-display font-bold text-slate-800'>
            Base de Huéspedes
          </h2>
          <p className='text-slate-500 text-sm'>
            {totalGuests} perfiles registrados
          </p>
        </div>

        <div className='flex w-full md:w-auto gap-3'>
          <div className='relative flex-1 md:w-64'>
            <Search
              className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400'
              size={18}
            />
            <input
              type='text'
              placeholder='Buscar por nombre o cédula...'
              className='w-full pl-11 pr-4 py-3 bg-white rounded-2xl border-none font-medium text-slate-600 focus:ring-2 focus:ring-hospeda-200 shadow-sm outline-none transition-all'
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <button
            onClick={openNewGuestModal}
            className='bg-hospeda-900 text-white px-5 py-3 rounded-2xl font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2'
          >
            <Plus size={20} /> <span className='hidden md:inline'>Nuevo</span>
          </button>
        </div>
      </div>

      {/* LISTA DE HUÉSPEDES */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
        {guests.map((guest) => (
          <motion.div
            key={guest.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className='bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-hospeda-200 transition-all group'
          >
            <div className='flex items-start justify-between mb-4'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold border border-white shadow-inner'>
                  {guest.full_name.charAt(0)}
                </div>
                <div>
                  <h3
                    className='font-bold text-slate-800 leading-tight truncate max-w-[140px]'
                    title={guest.full_name}
                  >
                    {guest.full_name}
                  </h3>
                  <div className='flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full w-max mt-1'>
                    <Fingerprint size={10} />
                    <span className='font-mono'>{guest.doc_number}</span>
                  </div>
                </div>
              </div>

              <div className='flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                <button
                  onClick={() => openEditModal(guest)}
                  className='p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-500 rounded-xl transition-colors'
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => deleteGuest(guest.id)}
                  className='p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-colors'
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className='space-y-2 text-sm text-slate-500 border-t border-slate-50 pt-3'>
              {guest.phone && (
                <div className='flex items-center gap-2'>
                  <Phone
                    size={14}
                    className='text-hospeda-400'
                  />
                  <span>{guest.phone}</span>
                </div>
              )}
              {guest.email && (
                <div className='flex items-center gap-2'>
                  <Mail
                    size={14}
                    className='text-hospeda-400'
                  />
                  <span className='truncate'>{guest.email}</span>
                </div>
              )}
              {guest.country && (
                <div className='flex items-center gap-2'>
                  <MapPin
                    size={14}
                    className='text-hospeda-400'
                  />
                  <span>{guest.country}</span>
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {/* Estado Vacío */}
        {guests.length === 0 && (
          <div className='col-span-full flex flex-col items-center justify-center py-20 text-slate-400 opacity-70'>
            <User
              size={48}
              className='mb-4 stroke-1'
            />
            <p>No se encontraron huéspedes con ese criterio.</p>
          </div>
        )}
      </div>

      {/* MODAL FORMULARIO */}
      <AnimatePresence>
        {isEditing && (
          <div className='fixed inset-0 z-[100] flex items-center justify-center p-4 bg-hospeda-950/60 backdrop-blur-md'>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className='bg-white w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar'
            >
              <h3 className='text-2xl font-display font-bold text-slate-800 mb-6'>
                {selectedGuest ? 'Editar Perfil' : 'Registro de Huésped'}
              </h3>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='md:col-span-2'>
                  <label className='text-xs font-bold text-slate-400 uppercase ml-2'>
                    Nombre Completo
                  </label>
                  <input
                    className='w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-hospeda-200'
                    placeholder='Ej: Juan Pérez'
                    value={guestForm.full_name}
                    onChange={(e) =>
                      setGuestForm({ ...guestForm, full_name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className='text-xs font-bold text-slate-400 uppercase ml-2'>
                    Tipo Doc
                  </label>
                  <select
                    className='w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-800 outline-none'
                    value={guestForm.doc_type}
                    onChange={(e) =>
                      setGuestForm({ ...guestForm, doc_type: e.target.value })
                    }
                  >
                    <option value='CC'>Cédula Ciudadanía</option>
                    <option value='CE'>Cédula Extranjería</option>
                    <option value='PASSPORT'>Pasaporte</option>
                    <option value='TI'>Tarjeta Identidad</option>
                  </select>
                </div>

                <div>
                  <label className='text-xs font-bold text-slate-400 uppercase ml-2'>
                    Número Doc
                  </label>
                  <input
                    type='text'
                    className='w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-800 outline-none'
                    value={guestForm.doc_number}
                    onChange={(e) =>
                      setGuestForm({ ...guestForm, doc_number: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className='text-xs font-bold text-slate-400 uppercase ml-2'>
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type='tel'
                    className='w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-800 outline-none'
                    value={guestForm.phone}
                    onChange={(e) =>
                      setGuestForm({ ...guestForm, phone: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className='text-xs font-bold text-slate-400 uppercase ml-2'>
                    Email (Opcional)
                  </label>
                  <input
                    type='email'
                    className='w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-800 outline-none'
                    value={guestForm.email}
                    onChange={(e) =>
                      setGuestForm({ ...guestForm, email: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className='text-xs font-bold text-slate-400 uppercase ml-2'>
                    Origen
                  </label>
                  <input
                    className='w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-800 outline-none'
                    value={guestForm.country}
                    onChange={(e) =>
                      setGuestForm({ ...guestForm, country: e.target.value })
                    }
                  />
                </div>

                <div className='md:col-span-2'>
                  <label className='text-xs font-bold text-slate-400 uppercase ml-2'>
                    Notas Forenses (Alergias, VIP, etc)
                  </label>
                  <textarea
                    className='w-full p-4 bg-slate-50 rounded-2xl font-medium text-slate-800 outline-none resize-none h-24'
                    value={guestForm.notes}
                    onChange={(e) =>
                      setGuestForm({ ...guestForm, notes: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className='flex gap-4 mt-8 pt-6 border-t border-slate-100'>
                <button
                  onClick={() => setIsEditing(false)}
                  className='flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-colors'
                >
                  Cancelar
                </button>
                <button
                  onClick={() =>
                    selectedGuest ? updateGuest() : createGuest()
                  }
                  className='flex-1 py-4 bg-hospeda-900 text-white font-bold rounded-2xl shadow-xl hover:scale-105 transition-transform'
                >
                  Guardar Huésped
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GuestsPanel;
