'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Search, Plus, MapPin, Phone, Mail, Edit, Trash2, Fingerprint, X, Save } from 'lucide-react';
import { useGuests, Guest } from '@/hooks/useGuests';
import { cn } from '@/lib/utils';

// ==========================================
// BLOQUE 1: INTERFACES ESTRICTAS
// ==========================================

interface GuestsPanelContainerProps {
  initialGuests: Guest[];
  hotelId: string;
}

interface GuestsPanelViewProps {
  guests: Guest[];
  totalGuests: number;
  searchTerm: string;
  onSearch: (term: string) => void;
  onOpenNewModal: () => void;
  onOpenEditModal: (guest: Guest) => void;
  onDeleteGuest: (id: string) => void;
}

// ==========================================
// BLOQUE 2: COMPONENTE PRESENTACIONAL (UI Claude 2026)
// ==========================================

const GuestsPanelView: React.FC<GuestsPanelViewProps> = ({
  guests, totalGuests, searchTerm, onSearch, onOpenNewModal, onOpenEditModal, onDeleteGuest
}) => {
  return (
    <div className='space-y-6 pb-20 font-poppins text-zinc-100'>
      
      {/* HEADER Y BUSCADOR (Liquid Glass) */}
      <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900/40 backdrop-blur-2xl p-6 rounded-3xl border border-white/5 shadow-2xl shadow-black/50'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight text-zinc-50 flex items-center gap-3'>
            <User className="size-6 text-indigo-400" />
            Base de Huéspedes
          </h2>
          <p className='text-zinc-400 font-lora text-sm mt-1'>
            {totalGuests} perfiles registrados e indexados.
          </p>
        </div>

        <div className='flex w-full md:w-auto gap-3'>
          <div className='relative flex-1 md:w-64'>
            <Search className='absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 size-4 stroke-[1.5]' />
            <input
              type='text'
              placeholder='Buscar identidad...'
              className='w-full pl-11 pr-4 py-2.5 bg-zinc-950/50 border border-white/10 rounded-xl text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner'
              value={searchTerm}
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
          <button
            onClick={onOpenNewModal}
            className='flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all active:scale-95'
          >
            <Plus className="size-4 stroke-[2]" /> <span className='hidden md:inline'>Registrar</span>
          </button>
        </div>
      </div>

      {/* LISTA DE HUÉSPEDES (Grid B2B) */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'>
        <AnimatePresence>
          {guests.map((guest) => (
            <motion.div
              key={guest.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileHover={{ y: -4 }}
              className='bg-zinc-900/40 backdrop-blur-sm rounded-[2rem] p-6 border border-white/5 shadow-xl relative overflow-hidden group'
            >
              {/* Resplandor Dinámico */}
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors duration-500 z-0"></div>
              
              <div className="relative z-10">
                <div className='flex items-start justify-between mb-5'>
                  <div className='flex items-center gap-3'>
                    <div className='size-11 bg-zinc-800/80 rounded-2xl border border-white/5 shadow-inner flex items-center justify-center text-zinc-300 font-display font-bold text-lg group-hover:text-indigo-400 group-hover:bg-indigo-500/10 transition-colors'>
                      {guest.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className='font-bold text-zinc-50 leading-tight truncate max-w-[130px]' title={guest.full_name}>
                        {guest.full_name}
                      </h3>
                      <div className='flex items-center gap-1.5 text-[10px] text-zinc-400 bg-zinc-950/50 border border-white/5 px-2 py-0.5 rounded-md w-max mt-1.5'>
                        <Fingerprint size={10} className="text-indigo-400/70" />
                        <span className='font-mono'>{guest.doc_number}</span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones Rápidas */}
                  <div className='flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-950/80 p-1 rounded-xl border border-white/5'>
                    <button onClick={() => onOpenEditModal(guest)} className='p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-indigo-400 rounded-lg transition-colors'>
                      <Edit size={14} strokeWidth={2} />
                    </button>
                    <button onClick={() => onDeleteGuest(guest.id)} className='p-1.5 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 rounded-lg transition-colors'>
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  </div>
                </div>

                <div className='space-y-2.5 text-xs text-zinc-400 border-t border-white/5 pt-4'>
                  {guest.phone && (
                    <div className='flex items-center gap-2.5 group/item'>
                      <Phone size={14} className='text-zinc-600 group-hover/item:text-emerald-400 transition-colors' />
                      <span className="font-mono">{guest.phone}</span>
                    </div>
                  )}
                  {guest.email && (
                    <div className='flex items-center gap-2.5 group/item'>
                      <Mail size={14} className='text-zinc-600 group-hover/item:text-sky-400 transition-colors' />
                      <span className='truncate'>{guest.email}</span>
                    </div>
                  )}
                  {guest.country && (
                    <div className='flex items-center gap-2.5 group/item'>
                      <MapPin size={14} className='text-zinc-600 group-hover/item:text-amber-400 transition-colors' />
                      <span>{guest.country}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Estado Vacío */}
        {guests.length === 0 && (
          <div className='col-span-full flex flex-col items-center justify-center py-20 text-zinc-500 bg-zinc-900/20 rounded-[2.5rem] border border-dashed border-white/5'>
            <User size={48} className='mb-4 stroke-[1] text-zinc-700' />
            <p className="font-mono text-sm uppercase tracking-widest">No se detectaron perfiles en la base de datos.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// BLOQUE 3: COMPONENTE CONTENEDOR (Máquina de Estados)
// ==========================================

export default function GuestsPanel({ initialGuests, hotelId }: GuestsPanelContainerProps) {
  const {
    guests, totalGuests, searchTerm, handleSearch, isEditing, setIsEditing,
    guestForm, setGuestForm, createGuest, updateGuest, deleteGuest,
    openNewGuestModal, openEditModal, selectedGuest,
  } = useGuests(initialGuests, hotelId); 

  // 🛡️ Zero-Trust Data Parsing
  const safeGuests = useMemo(() => Array.isArray(guests) ? guests : [], [guests]);

  return (
    <>
      <GuestsPanelView 
        guests={safeGuests}
        totalGuests={totalGuests}
        searchTerm={searchTerm}
        onSearch={handleSearch}
        onOpenNewModal={openNewGuestModal}
        onOpenEditModal={openEditModal}
        onDeleteGuest={deleteGuest}
      />

      {/* MODAL FORMULARIO (Portal a Nivel de Componente) */}
      <AnimatePresence>
        {isEditing && (
          <div className='fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className='bg-[#09090b]/95 border border-white/5 rounded-[2rem] w-full max-w-2xl shadow-2xl shadow-black/50 relative max-h-[90vh] overflow-hidden flex flex-col ring-1 ring-white/10'
            >
              {/* Header Modal */}
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#09090b]/80 backdrop-blur-xl z-20">
                <div>
                  <h3 className='text-xl sm:text-2xl font-bold text-zinc-50 tracking-tight'>
                    {selectedGuest ? 'Auditar Perfil de Huésped' : 'Indexar Nuevo Huésped'}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 font-mono uppercase tracking-wider">
                    {selectedGuest ? `ID: ${selectedGuest.id.split('-')[0]}` : 'Registro de Identidad'}
                  </p>
                </div>
                <button onClick={() => setIsEditing(false)} className='p-2 bg-transparent hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors'>
                  <X className="size-6 stroke-[1.5]" />
                </button>
              </div>

              {/* Body Modal */}
              <div className='p-6 sm:p-8 overflow-y-auto custom-scrollbar'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div className='md:col-span-2'>
                    <label className='text-xs font-bold text-zinc-500 uppercase tracking-wide mb-1.5 block'>Nombre Completo / Razón Social</label>
                    <input
                      className='w-full p-3.5 bg-zinc-950/50 border border-white/10 rounded-xl text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner'
                      placeholder='Ej: Juan Pérez'
                      value={guestForm.full_name}
                      onChange={(e) => setGuestForm({ ...guestForm, full_name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className='text-xs font-bold text-zinc-500 uppercase tracking-wide mb-1.5 block'>Tipo Documento</label>
                    <select
                      className='w-full p-3.5 bg-zinc-950/50 border border-white/10 rounded-xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all appearance-none cursor-pointer shadow-inner'
                      value={guestForm.doc_type}
                      onChange={(e) => setGuestForm({ ...guestForm, doc_type: e.target.value })}
                    >
                      <option value='CC' className="bg-zinc-900">Cédula de Ciudadanía</option>
                      <option value='CE' className="bg-zinc-900">Cédula de Extranjería</option>
                      <option value='PASSPORT' className="bg-zinc-900">Pasaporte Internacional</option>
                      <option value='TI' className="bg-zinc-900">Tarjeta de Identidad</option>
                    </select>
                  </div>

                  <div>
                    <label className='text-xs font-bold text-zinc-500 uppercase tracking-wide mb-1.5 block'>Número Documento</label>
                    <input
                      type='text'
                      className='w-full p-3.5 bg-zinc-950/50 border border-white/10 rounded-xl text-zinc-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner'
                      value={guestForm.doc_number}
                      onChange={(e) => setGuestForm({ ...guestForm, doc_number: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className='text-xs font-bold text-zinc-500 uppercase tracking-wide mb-1.5 block'>Teléfono / Comms</label>
                    <input
                      type='tel'
                      className='w-full p-3.5 bg-zinc-950/50 border border-white/10 rounded-xl text-zinc-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner'
                      value={guestForm.phone}
                      onChange={(e) => setGuestForm({ ...guestForm, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className='text-xs font-bold text-zinc-500 uppercase tracking-wide mb-1.5 block'>Vector Email (Opcional)</label>
                    <input
                      type='email'
                      className='w-full p-3.5 bg-zinc-950/50 border border-white/10 rounded-xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner'
                      value={guestForm.email}
                      onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className='text-xs font-bold text-zinc-500 uppercase tracking-wide mb-1.5 block'>Origen / Jurisdicción</label>
                    <input
                      className='w-full p-3.5 bg-zinc-950/50 border border-white/10 rounded-xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner'
                      value={guestForm.country}
                      onChange={(e) => setGuestForm({ ...guestForm, country: e.target.value })}
                    />
                  </div>

                  <div className='md:col-span-2'>
                    <label className='text-xs font-bold text-zinc-500 uppercase tracking-wide mb-1.5 block'>Auditoría Forense (Alergias, VIP, Notas)</label>
                    <textarea
                      className='w-full p-4 bg-zinc-950/50 border border-white/10 rounded-xl text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner resize-none h-24'
                      value={guestForm.notes}
                      onChange={(e) => setGuestForm({ ...guestForm, notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Footer Modal */}
              <div className='p-6 border-t border-white/5 bg-zinc-950/80 flex gap-3 z-20 backdrop-blur-xl'>
                <button
                  onClick={() => setIsEditing(false)}
                  className='px-6 py-2.5 text-sm font-bold text-zinc-400 hover:text-zinc-200 hover:bg-white/5 rounded-xl transition-all ml-auto'
                >
                  Cancelar
                </button>
                <button
                  onClick={() => selectedGuest ? updateGuest() : createGuest()}
                  className='px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-500/25 transition-all active:scale-95 text-sm flex items-center gap-2'
                >
                  <Save className="size-4 stroke-[2]" />
                  {selectedGuest ? 'Compilar Cambios' : 'Indexar Huésped'}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}