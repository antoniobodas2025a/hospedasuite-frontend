import React from 'react';
import {
  ShoppingBag,
  MessageCircle,
  UploadCloud,
  Check,
  X,
  Users,
  TrendingUp,
  Megaphone,
  Plus,
  Search,
  Pencil, // <--- Nuevo icono
  Trash2, // <--- Nuevo icono
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MarketingPanel = ({ leads, hotelInfo, marketing }) => {
  // Desestructuración de funciones vitales (Actualizada)
  const {
    updateLeadStatus,
    sendWhatsAppTemplate,
    handleImportLeads,
    handleSaveLead, // <--- Reemplaza a handleCreateManualLead
    openNewLeadModal, // <--- Nueva función de apertura limpia
    prepareEdit, // <--- Nueva función de edición
    handleDeleteLead, // <--- Nueva función de borrado
    editingId, // <--- Estado para saber si editamos
    importInputRef,
    showLeadModal,
    setShowLeadModal,
    leadForm,
    setLeadForm,
  } = marketing;

  // Control de Acceso
  const ALLOWED_PLANS = [
    'GROWTH',
    'CORPORATE',
    'PRO_AI',
    'PRO',
    'NANO_AI',
    'GROWTH_AI',
    'CORPORATE_AI',
  ];
  const hasAccess = ALLOWED_PLANS.includes(hotelInfo?.subscription_plan);

  // Stats Rápidos
  const stats = [
    {
      label: 'Total Leads',
      value: leads.length,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Contactados',
      value: leads.filter((l) => l.status === 'contacted').length,
      icon: MessageCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Pendientes',
      value: leads.filter((l) => l.status !== 'contacted').length,
      icon: TrendingUp,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ];

  return (
    <div className='h-full p-6 overflow-y-auto scrollbar-hide'>
      {/* 🔒 PANTALLA DE BLOQUEO */}
      {!hasAccess ? (
        <div className='flex flex-col items-center justify-center h-full text-center max-w-md mx-auto'>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className='w-24 h-24 bg-gradient-to-tr from-cyan-100 to-blue-50 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-cyan-500/20'
          >
            <ShoppingBag
              size={48}
              className='text-cyan-600'
            />
          </motion.div>

          <h3 className='font-serif text-3xl font-bold mb-4 text-slate-800'>
            Motor de Ventas Bloqueado
          </h3>
          <p className='text-slate-500 mb-8 leading-relaxed'>
            Tu plan actual <b>{hotelInfo?.subscription_plan || 'NANO'}</b> no
            incluye el módulo de CRM. Actualiza a <b>GROWTH</b> para desbloquear
            campañas.
          </p>

          <button
            onClick={() =>
              window.open(
                'https://wa.me/573213795015?text=Upgrade%20GROWTH',
                '_blank'
              )
            }
            className='w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-black transition-all flex items-center justify-center gap-3'
          >
            <MessageCircle size={20} />
            <span>Hablar con un Asesor</span>
          </button>
        </div>
      ) : (
        <>
          {/* HEADER & ACCIONES */}
          <div className='flex flex-col md:flex-row justify-between items-end mb-8 gap-4'>
            <div>
              <h2 className='text-3xl font-serif font-bold text-slate-800'>
                Marketing
              </h2>
              <p className='text-slate-500'>Gestión de prospectos y campañas</p>
            </div>

            <div className='flex gap-3'>
              {/* Botón Importar */}
              <button
                onClick={() => importInputRef.current.click()}
                className='px-5 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2'
              >
                <UploadCloud size={18} />
                <span className='hidden md:inline'>Importar Excel</span>
              </button>
              <input
                type='file'
                accept='.csv,.xlsx'
                ref={importInputRef}
                className='hidden'
                onChange={handleImportLeads}
              />

              {/* Botón Nuevo Lead (AHORA USA openNewLeadModal) */}
              <button
                onClick={openNewLeadModal}
                className='px-5 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 hover:bg-black transition-all flex items-center gap-2'
              >
                <Plus size={18} />
                <span>Nuevo Lead</span>
              </button>
            </div>
          </div>

          {/* WIDGETS */}
          <div className='grid grid-cols-3 gap-4 mb-8'>
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className='bg-white/60 backdrop-blur-xl border border-white/50 p-5 rounded-[2rem] shadow-sm flex flex-col items-center justify-center text-center hover:bg-white/80 transition-colors'
              >
                <div
                  className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-full flex items-center justify-center mb-3`}
                >
                  <stat.icon size={20} />
                </div>
                <h3 className='text-2xl font-bold text-slate-800'>
                  {stat.value}
                </h3>
                <p className='text-[10px] text-slate-500 font-bold uppercase tracking-widest'>
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>

          {/* TABLA DE LEADS */}
          <div className='bg-white/50 backdrop-blur-xl rounded-[2.5rem] border border-white/60 shadow-sm overflow-hidden'>
            <div className='overflow-x-auto'>
              <table className='w-full text-left'>
                <thead className='bg-white/40 border-b border-white/40 text-xs font-bold text-slate-500 uppercase tracking-widest'>
                  <tr>
                    <th className='p-6 pl-8'>Prospecto</th>
                    <th className='p-6'>Interés</th>
                    <th className='p-6'>Fuente</th>
                    <th className='p-6 text-right pr-8'>Acciones</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-white/40'>
                  {leads.map((lead, i) => (
                    <motion.tr
                      key={lead.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className='hover:bg-white/40 transition-colors group'
                    >
                      {/* COLUMNA 1: PROSPECTO */}
                      <td className='p-5 pl-8'>
                        <div className='flex items-center gap-4'>
                          <button
                            onClick={() =>
                              updateLeadStatus(lead.id, lead.status)
                            }
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${
                              lead.status === 'contacted'
                                ? 'bg-green-500 text-white ring-2 ring-green-100'
                                : 'bg-white border border-slate-200 text-transparent hover:border-green-300'
                            }`}
                          >
                            <Check
                              size={14}
                              strokeWidth={4}
                            />
                          </button>
                          <div>
                            <div className='font-bold text-slate-800 text-base'>
                              {lead.full_name ||
                                lead.guest_name ||
                                'Sin Nombre'}
                            </div>
                            <div className='text-xs text-slate-500 font-medium'>
                              {lead.hotel_name || 'Hotel General'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* COLUMNA 2: INTERÉS */}
                      <td className='p-5'>
                        <span className='inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100'>
                          {lead.city_interest || lead.notes || 'General'}
                        </span>
                        <div className='text-[10px] font-bold text-slate-400 mt-1 pl-1'>
                          {lead.metadata?.plan_interest
                            ? `PLAN ${lead.metadata.plan_interest}`
                            : 'MANUAL'}
                        </div>
                      </td>

                      {/* COLUMNA 3: FUENTE */}
                      <td className='p-5'>
                        <div className='text-xs font-mono text-slate-500 bg-white/50 px-3 py-1.5 rounded-lg border border-white/50 inline-block max-w-[150px] truncate'>
                          {lead.source ||
                            lead.metadata?.source_url ||
                            'Directo'}
                        </div>
                      </td>

                      {/* COLUMNA 4: ACCIONES (NUEVOS BOTONES) */}
                      <td className='p-5 pr-8 text-right'>
                        <div className='flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity'>
                          {/* WhatsApp */}
                          <button
                            onClick={() =>
                              sendWhatsAppTemplate(lead, 'welcome')
                            }
                            className='p-2 bg-green-100 text-green-600 rounded-xl hover:bg-green-200 transition-colors'
                            title='Enviar Bienvenida'
                          >
                            <MessageCircle size={18} />
                          </button>

                          {/* Editar */}
                          <button
                            onClick={() => prepareEdit(lead)}
                            className='p-2 bg-indigo-100 text-indigo-600 rounded-xl hover:bg-indigo-200 transition-colors'
                            title='Editar Prospecto'
                          >
                            <Pencil size={18} />
                          </button>

                          {/* Borrar */}
                          <button
                            onClick={() => handleDeleteLead(lead.id)}
                            className='p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors'
                            title='Eliminar Prospecto'
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}

                  {leads.length === 0 && (
                    <tr>
                      <td
                        colSpan='4'
                        className='p-12 text-center text-slate-400'
                      >
                        <div className='flex flex-col items-center'>
                          <Search
                            size={40}
                            className='mb-3 opacity-20'
                          />
                          <p>No hay leads registrados aún.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* MODAL (CREAR / EDITAR) */}
      <AnimatePresence>
        {showLeadModal && (
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
                  {editingId ? 'Editar Prospecto' : 'Nuevo Prospecto'}
                </h3>
                <button
                  onClick={() => setShowLeadModal(false)}
                  className='p-2 bg-white rounded-full text-slate-400 hover:text-red-500 shadow-sm transition-colors'
                >
                  <X size={20} />
                </button>
              </div>

              {/* Formulario (Usa handleSaveLead) */}
              <form
                onSubmit={handleSaveLead}
                className='p-6 space-y-5'
              >
                <div className='space-y-1'>
                  <label className='text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1'>
                    Nombre Completo
                  </label>
                  <input
                    autoFocus
                    className='w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-800 focus:ring-2 focus:ring-slate-900/10 transition-all placeholder:text-slate-300'
                    placeholder='Ej: Laura Martínez'
                    value={leadForm.name}
                    onChange={(e) =>
                      setLeadForm({ ...leadForm, name: e.target.value })
                    }
                  />
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-1'>
                    <label className='text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1'>
                      Teléfono
                    </label>
                    <input
                      className='w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-800 focus:ring-2 focus:ring-slate-900/10'
                      placeholder='300...'
                      value={leadForm.phone}
                      onChange={(e) =>
                        setLeadForm({ ...leadForm, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className='space-y-1'>
                    <label className='text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1'>
                      Email
                    </label>
                    <input
                      className='w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-800 focus:ring-2 focus:ring-slate-900/10'
                      placeholder='@...'
                      value={leadForm.email}
                      onChange={(e) =>
                        setLeadForm({ ...leadForm, email: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className='space-y-1'>
                  <label className='text-[10px] font-bold uppercase text-slate-400 tracking-widest ml-1'>
                    Notas Adicionales
                  </label>
                  <textarea
                    rows='3'
                    className='w-full p-4 bg-slate-50 rounded-2xl border-none text-slate-600 focus:ring-2 focus:ring-slate-900/10 resize-none'
                    placeholder='Detalles sobre el interés del cliente...'
                    value={leadForm.notes}
                    onChange={(e) =>
                      setLeadForm({ ...leadForm, notes: e.target.value })
                    }
                  />
                </div>

                <button className='w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all'>
                  {editingId ? 'Actualizar Lead' : 'Guardar Lead'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MarketingPanel;
