'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Phone,
  MessageCircle,
  CheckCircle,
  XCircle,
  MoreHorizontal,
} from 'lucide-react';
import { useCRM, Lead } from '@/hooks/useCRM';

const COLUMNS: { id: Lead['status']; label: string; color: string }[] = [
  {
    id: 'new',
    label: 'Nuevos / Por Contactar',
    color: 'bg-slate-100 border-slate-200',
  },
  {
    id: 'contacted',
    label: 'En Contacto',
    color: 'bg-blue-50 border-blue-100',
  },
  {
    id: 'negotiation',
    label: 'Negociación',
    color: 'bg-amber-50 border-amber-100',
  },
  {
    id: 'won',
    label: 'Cerrados (Ganados)',
    color: 'bg-emerald-50 border-emerald-100',
  },
];

const CRMBoard = ({ initialLeads }: { initialLeads: Lead[] }) => {
  const {
    leads,
    moveLead,
    isModalOpen,
    setIsModalOpen,
    newLeadForm,
    setNewLeadForm,
    createLead,
  } = useCRM(initialLeads);

  return (
    <div className='h-[calc(100vh-8rem)] flex flex-col'>
      {/* Header */}
      <div className='flex justify-between items-center mb-6 px-2'>
        <div>
          <h2 className='text-2xl font-display font-bold text-slate-800'>
            Pipeline de Ventas
          </h2>
          <p className='text-slate-500 text-sm'>
            Gestiona prospectos corporativos y agencias.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className='px-6 py-3 bg-hospeda-900 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 hover:scale-105 transition-transform'
        >
          <Plus size={18} /> Nuevo Prospecto
        </button>
      </div>

      {/* KANBAN SCROLLABLE */}
      <div className='flex-1 overflow-x-auto overflow-y-hidden pb-4'>
        <div className='flex gap-6 h-full min-w-[1000px] px-2'>
          {COLUMNS.map((col) => (
            <div
              key={col.id}
              className={`flex-1 min-w-[280px] flex flex-col rounded-2xl border ${col.color} p-4`}
            >
              {/* Header Columna */}
              <div className='flex justify-between items-center mb-4'>
                <h3 className='font-bold text-slate-700 uppercase text-xs tracking-wider'>
                  {col.label}
                </h3>
                <span className='bg-white/50 px-2 py-1 rounded-lg text-xs font-bold text-slate-500'>
                  {leads.filter((l) => l.status === col.id).length}
                </span>
              </div>

              {/* Cards Container */}
              <div className='flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1'>
                {leads
                  .filter((l) => l.status === col.id)
                  .map((lead) => (
                    <motion.div
                      layoutId={String(lead.id)}
                      key={lead.id}
                      className='bg-white p-4 rounded-xl shadow-sm border border-slate-100 group hover:shadow-md transition-all'
                    >
                      <div className='flex justify-between items-start mb-2'>
                        <h4 className='font-bold text-slate-800 text-sm'>
                          {lead.business_name}
                        </h4>
                        <button className='text-slate-300 hover:text-slate-600'>
                          <MoreHorizontal size={16} />
                        </button>
                      </div>

                      {lead.phone && (
                        <div className='text-xs text-slate-500 flex items-center gap-1 mb-2'>
                          <Phone size={12} /> {lead.phone}
                        </div>
                      )}

                      {lead.notes && (
                        <p className='text-[10px] text-slate-400 bg-slate-50 p-2 rounded-lg mb-3 line-clamp-2'>
                          {lead.notes}
                        </p>
                      )}

                      {/* Acciones Rápidas (Mover) */}
                      <div className='flex gap-1 pt-2 border-t border-slate-50 opacity-0 group-hover:opacity-100 transition-opacity'>
                        {col.id !== 'won' && (
                          <button
                            onClick={() => moveLead(lead.id, 'won')}
                            className='flex-1 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded hover:bg-emerald-200'
                          >
                            Ganar
                          </button>
                        )}
                        {col.id !== 'contacted' && col.id !== 'won' && (
                          <button
                            onClick={() => moveLead(lead.id, 'contacted')}
                            className='flex-1 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded hover:bg-blue-200'
                          >
                            Contactar
                          </button>
                        )}
                        {col.id === 'won' && (
                          <div className='w-full text-center text-[10px] text-emerald-600 font-bold flex items-center justify-center gap-1'>
                            <CheckCircle size={12} /> Cliente Cerrado
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL CREAR LEAD */}
      {isModalOpen && (
        <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4'>
          <div className='bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl'>
            <h3 className='font-bold text-xl mb-4'>Nuevo Prospecto</h3>
            <div className='space-y-3'>
              <input
                placeholder='Nombre Empresa / Cliente'
                className='w-full p-3 bg-slate-50 rounded-xl outline-none border focus:border-hospeda-500'
                value={newLeadForm.business_name}
                onChange={(e) =>
                  setNewLeadForm({
                    ...newLeadForm,
                    business_name: e.target.value,
                  })
                }
              />
              <input
                placeholder='Teléfono'
                className='w-full p-3 bg-slate-50 rounded-xl outline-none border focus:border-hospeda-500'
                value={newLeadForm.phone}
                onChange={(e) =>
                  setNewLeadForm({ ...newLeadForm, phone: e.target.value })
                }
              />
              <textarea
                placeholder='Notas iniciales...'
                className='w-full p-3 bg-slate-50 rounded-xl outline-none border focus:border-hospeda-500 h-24 resize-none'
                value={newLeadForm.notes}
                onChange={(e) =>
                  setNewLeadForm({ ...newLeadForm, notes: e.target.value })
                }
              />
            </div>
            <div className='flex gap-3 mt-6'>
              <button
                onClick={() => setIsModalOpen(false)}
                className='flex-1 py-3 text-slate-500 font-bold'
              >
                Cancelar
              </button>
              <button
                onClick={createLead}
                className='flex-1 py-3 bg-hospeda-900 text-white font-bold rounded-xl'
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMBoard;
