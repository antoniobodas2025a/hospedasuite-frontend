import React from 'react';
import {
  ShoppingBag,
  MessageCircle,
  UploadCloud,
  Check,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MarketingPanel = ({
  leads,
  hotelInfo,
  marketing, // Este objeto contiene todo lo que nos devuelve el hook
}) => {
  // Desestructuramos para escribir menos código abajo
  const {
    updateLeadStatus,
    sendWhatsAppTemplate,
    handleImportLeads,
    handleCreateManualLead,
    importInputRef,
    showLeadModal,
    setShowLeadModal,
    leadForm,
    setLeadForm,
  } = marketing;

  // Lista de planes que tienen acceso (Misma lógica que tenías)
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

  return (
    <div className='p-8 h-full overflow-auto custom-scrollbar pb-32'>
      {!hasAccess ? (
        <div className='flex flex-col items-center justify-center h-full text-center max-w-md mx-auto'>
          <div className='w-20 h-20 bg-cyan-100 text-cyan-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-cyan-200/50 animate-bounce'>
            <ShoppingBag size={40} />
          </div>
          <h3 className='font-serif text-3xl font-bold mb-4 text-[#2C2C2C]'>
            Desbloquea el Motor de Ventas
          </h3>
          <p className='text-slate-500 mb-8 leading-relaxed text-sm'>
            Estás en el <b>Plan {hotelInfo?.subscription_plan || 'NANO'}</b>.
            Actualiza al Plan <b>GROWTH</b> para identificar quién visita tu
            web.
          </p>
          <button
            onClick={() =>
              window.open(
                'https://wa.me/573213795015?text=Hola!%20Quiero%20hacer%20upgrade%20al%20Plan%20GROWTH%20en%20HospedaSuite',
                '_blank'
              )
            }
            className='w-full bg-[#2C2C2C] text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-black transition-all transform hover:scale-105 flex items-center justify-center gap-2'
          >
            <MessageCircle size={20} /> Hablar con un Consultor Elite
          </button>
        </div>
      ) : (
        <>
          <div className='flex justify-between items-end mb-8'>
            <div>
              <h2 className='font-serif text-3xl font-bold text-[#2C2C2C]'>
                Prospectos & Campañas
              </h2>
              <p className='text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold'>
                Marketing Forense de Elite
              </p>
            </div>

            <div className='flex gap-3'>
              {/* Botón Importar */}
              <button
                onClick={() => importInputRef.current.click()}
                className='bg-white text-slate-600 border border-slate-300 px-4 py-3 rounded-xl font-bold text-xs shadow-sm hover:bg-slate-50 flex items-center gap-2 transition-all'
              >
                <UploadCloud size={16} /> Importar Excel
              </button>

              <input
                type='file'
                accept='.csv,.xlsx'
                ref={importInputRef}
                className='hidden'
                onChange={handleImportLeads}
              />

              {/* Botón Nuevo Lead Manual (Trigger Modal) */}
              <button
                onClick={() => setShowLeadModal(true)}
                className='bg-[#2C2C2C] text-white px-4 py-3 rounded-xl font-bold text-xs shadow-sm hover:bg-black flex items-center gap-2 transition-all'
              >
                + Nuevo
              </button>

              <div className='bg-cyan-50 border border-cyan-100 px-6 py-3 rounded-2xl flex items-center gap-3 shadow-sm'>
                <span className='text-[11px] font-black text-cyan-700 uppercase tracking-widest'>
                  Leads Activos: {leads.length}
                </span>
              </div>
            </div>
          </div>

          {/* TABLA DE LEADS */}
          <div className='bg-white rounded-[2rem] shadow-sm border border-[#E5E0D8] overflow-hidden relative'>
            <table className='w-full text-left border-collapse'>
              <thead className='bg-[#F9F7F2] border-b border-[#E5E0D8] sticky top-0 z-10'>
                <tr>
                  <th className='p-5 text-[10px] font-bold uppercase text-[#5D5555] tracking-widest'>
                    Origen / Interesado
                  </th>
                  <th className='p-5 text-[10px] font-bold uppercase text-[#5D5555] tracking-widest'>
                    Ciudad / Plan Sugerido
                  </th>
                  <th className='p-5 text-[10px] font-bold uppercase text-[#5D5555] tracking-widest'>
                    Trazabilidad
                  </th>
                  <th className='p-5 text-[10px] font-bold uppercase text-[#5D5555] tracking-widest'>
                    Gestión
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-[#F2F0E9]'>
                {leads.map((l) => (
                  <tr
                    key={l.id}
                    className={`transition-colors group ${
                      l.status === 'contacted'
                        ? 'bg-green-50/40'
                        : 'hover:bg-slate-50/50'
                    }`}
                  >
                    <td className='p-5'>
                      <div className='flex items-center gap-4'>
                        <button
                          onClick={() => updateLeadStatus(l.id, l.status)}
                          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all shadow-sm ${
                            l.status === 'contacted'
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-slate-200'
                          }`}
                        >
                          {l.status === 'contacted' && (
                            <Check
                              size={14}
                              strokeWidth={4}
                            />
                          )}
                        </button>
                        <div>
                          <div className='font-serif font-bold text-slate-800 text-lg leading-tight'>
                            {l.hotel_name || 'Hotel'}
                          </div>
                          <div className='text-xs font-bold text-slate-600'>
                            {l.full_name || l.guest_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className='p-5'>
                      <span className='text-[10px] font-black uppercase bg-cyan-50 text-cyan-700 px-2 py-1 rounded'>
                        {l.city_interest || 'N/A'}
                      </span>
                      <div className='mt-1 text-[9px] font-black text-slate-400'>
                        TIER {l.metadata?.plan_interest || 'NANO'}
                      </div>
                    </td>
                    <td className='p-5'>
                      <div className='text-[9px] font-mono bg-slate-50 p-2 rounded border border-slate-100 text-slate-500 break-all leading-relaxed max-w-[220px]'>
                        {l.metadata?.source_url || 'Tráfico Directo'}
                      </div>
                    </td>
                    <td className='p-5'>
                      <div className='flex flex-col gap-2'>
                        <button
                          onClick={() => sendWhatsAppTemplate(l, 'welcome')}
                          className='bg-white text-green-600 px-3 py-1.5 rounded-lg border border-green-200 text-[10px] font-black uppercase shadow-sm'
                        >
                          Bienvenida
                        </button>
                        <button
                          onClick={() => sendWhatsAppTemplate(l, 'followup')}
                          className='bg-white text-blue-600 px-3 py-1.5 rounded-lg border border-blue-200 text-[10px] font-black uppercase shadow-sm'
                        >
                          Seguimiento
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* MODAL NUEVO LEAD (Integramos el modal aquí mismo para limpiar DashboardPage) */}
      <AnimatePresence>
        {showLeadModal && (
          <div className='fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className='bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden'
            >
              <div className='p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50'>
                <h3 className='font-serif text-xl font-bold text-gray-800'>
                  Nuevo Interesado
                </h3>
                <button onClick={() => setShowLeadModal(false)}>
                  <X
                    size={20}
                    className='text-gray-400 hover:text-red-500'
                  />
                </button>
              </div>

              <form
                onSubmit={handleCreateManualLead}
                className='p-6 space-y-4'
              >
                <div>
                  <label className='text-[10px] font-bold uppercase text-gray-500 tracking-widest'>
                    Nombre
                  </label>
                  <input
                    autoFocus
                    className='w-full p-3 bg-gray-50 rounded-xl border-none font-bold text-gray-900 mt-1'
                    placeholder='Ej: Laura Martínez'
                    value={leadForm.name}
                    onChange={(e) =>
                      setLeadForm({ ...leadForm, name: e.target.value })
                    }
                  />
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='text-[10px] font-bold uppercase text-gray-500 tracking-widest'>
                      Teléfono
                    </label>
                    <input
                      className='w-full p-3 bg-gray-50 rounded-xl border-none font-bold text-gray-900 mt-1'
                      placeholder='300...'
                      value={leadForm.phone}
                      onChange={(e) =>
                        setLeadForm({ ...leadForm, phone: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className='text-[10px] font-bold uppercase text-gray-500 tracking-widest'>
                      Email
                    </label>
                    <input
                      className='w-full p-3 bg-gray-50 rounded-xl border-none font-bold text-gray-900 mt-1'
                      placeholder='@...'
                      value={leadForm.email}
                      onChange={(e) =>
                        setLeadForm({ ...leadForm, email: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className='text-[10px] font-bold uppercase text-gray-500 tracking-widest'>
                    Notas
                  </label>
                  <textarea
                    rows='2'
                    className='w-full p-3 bg-gray-50 rounded-xl border-none text-sm mt-1'
                    placeholder='Interesado en boda para diciembre...'
                    value={leadForm.notes}
                    onChange={(e) =>
                      setLeadForm({ ...leadForm, notes: e.target.value })
                    }
                  />
                </div>

                <button className='w-full bg-black text-white font-bold py-4 rounded-xl shadow-lg hover:scale-[1.02] transition-transform'>
                  Guardar Lead
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
