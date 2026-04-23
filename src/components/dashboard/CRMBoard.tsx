'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Phone, MessageCircle, CheckCircle, XCircle, MoreHorizontal, LayoutGrid, Briefcase, X, Save, TrendingUp
} from 'lucide-react';
import { useCRM, Lead } from '@/hooks/useCRM';
import { cn } from '@/lib/utils';

// ==========================================
// BLOQUE 1: INTERFACES Y DICCIONARIOS
// ==========================================

interface CRMBoardContainerProps {
  initialLeads: Lead[];
}

interface CRMBoardPanelViewProps {
  leads: Lead[];
  onMoveLead: (id: string, status: Lead['status']) => void;
  onOpenModal: () => void;
  onCloseModal: () => void;
  isModalOpen: boolean;
  newLeadForm: any;
  setNewLeadForm: (form: any) => void;
  onCreateLead: () => void;
}

const COLUMNS: { id: Lead['status']; label: string; accent: string }[] = [
  { id: 'new', label: 'Prospectos / Inbox', accent: 'border-zinc-500/30 text-zinc-400' },
  { id: 'contacted', label: 'En Conversación', accent: 'border-indigo-500/30 text-indigo-400' },
  { id: 'negotiation', label: 'Propuesta / Negoc.', accent: 'border-amber-500/30 text-amber-400' },
  { id: 'won', label: 'Cierres Exitosos', accent: 'border-emerald-500/30 text-emerald-400' },
];

// ==========================================
// BLOQUE 2: COMPONENTE PRESENTACIONAL (UI Claude 2026)
// ==========================================

const CRMBoardPanelView: React.FC<CRMBoardPanelViewProps> = ({
  leads, onMoveLead, onOpenModal, onCloseModal, isModalOpen, 
  newLeadForm, setNewLeadForm, onCreateLead
}) => {
  return (
    <div className='h-[calc(100vh-8rem)] flex flex-col font-poppins text-zinc-100'>
      
      {/* HEADER: Liquid Glass Header */}
      <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900/40 backdrop-blur-2xl p-6 rounded-3xl border border-white/5 shadow-2xl shadow-black/50 mb-6 ring-1 ring-inset ring-white/10'>
        <div>
          <h2 className='text-2xl font-bold text-zinc-50 tracking-tight flex items-center gap-3'>
            <TrendingUp className="size-6 text-indigo-400" />
            Pipeline de Ventas
          </h2>
          <p className='text-zinc-400 text-sm mt-1 font-lora'>Gestión topológica de prospectos corporativos y agencias.</p>
        </div>
        <button
          onClick={onOpenModal}
          className='flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all active:scale-95'
        >
          <Plus className="size-4 stroke-[2]" /> Nuevo Prospecto
        </button>
      </div>

      {/* KANBAN BOARD: Arquitectura de Columnas Liquid Glass */}
      <div className='flex-1 overflow-x-auto overflow-y-hidden pb-4 custom-scrollbar'>
        <div className='flex gap-6 h-full min-w-[1200px] px-2'>
          {COLUMNS.map((col) => (
            <div
              key={col.id}
              className='flex-1 min-w-[300px] flex flex-col bg-zinc-900/20 backdrop-blur-sm rounded-[2.5rem] border border-white/5 p-5 shadow-inner'
            >
              {/* Header Columna */}
              <div className={cn('flex justify-between items-center mb-6 pb-3 border-b-2', col.accent)}>
                <h3 className='font-bold uppercase text-[10px] tracking-[0.2em]'>
                  {col.label}
                </h3>
                <span className='bg-zinc-950/50 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-zinc-400 border border-white/5'>
                  {leads.filter((l) => l.status === col.id).length}
                </span>
              </div>

              {/* Cards Container: Virtualized Scroll */}
              <div className='flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1'>
                <AnimatePresence mode="popLayout">
                  {leads
                    .filter((l) => l.status === col.id)
                    .map((lead) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        key={lead.id}
                        className='bg-zinc-900/60 backdrop-blur-md p-5 rounded-[1.5rem] shadow-xl border border-white/10 group hover:border-indigo-500/30 transition-all relative overflow-hidden'
                      >
                        <div className="absolute -right-4 -top-4 size-16 bg-white/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors"></div>
                        
                        <div className='flex justify-between items-start mb-3 relative z-10'>
                          <h4 className='font-bold text-zinc-50 text-sm leading-tight group-hover:text-indigo-300 transition-colors'>
                            {lead.business_name}
                          </h4>
                          <button className='text-zinc-600 hover:text-zinc-300 transition-colors'>
                            <MoreHorizontal size={16} />
                          </button>
                        </div>

                        {lead.phone && (
                          <div className='text-[11px] text-zinc-400 flex items-center gap-2 mb-3 font-mono'>
                            <Phone size={12} className="text-zinc-600" /> {lead.phone}
                          </div>
                        )}

                        {lead.notes && (
                          <p className='text-[10px] leading-relaxed text-zinc-500 bg-zinc-950/50 p-3 rounded-xl mb-4 line-clamp-2 italic'>
                            "{lead.notes}"
                          </p>
                        )}

                        {/* Acciones de Transición de Estado */}
                        <div className='flex gap-2 pt-3 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity relative z-10'>
                          {col.id !== 'won' && (
                            <button
                              onClick={() => onMoveLead(String(lead.id), 'won')}
                              className='flex-1 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white text-[10px] font-bold rounded-lg border border-emerald-500/20 transition-all'
                            >
                              Ganar
                            </button>
                          )}
                          {col.id !== 'contacted' && col.id !== 'won' && (
                            <button
                              onClick={() => onMoveLead(String(lead.id), 'contacted')}
                              className='flex-1 py-1.5 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-300 hover:text-white text-[10px] font-bold rounded-lg border border-indigo-500/20 transition-all'
                            >
                              Contactar
                            </button>
                          )}
                          {col.id === 'won' && (
                            <div className='w-full text-center text-[10px] text-emerald-400 font-bold flex items-center justify-center gap-1 py-1'>
                              <CheckCircle size={12} /> Nodo Convertido
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL CREAR LEAD: Inyección de Topología Liquid Glass */}
      <AnimatePresence>
        {isModalOpen && (
          <div className='fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4'>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className='bg-[#09090b]/95 border border-white/5 w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl ring-1 ring-white/10'
            >
              <div className='flex justify-between items-center mb-8'>
                <h3 className='text-2xl font-bold text-zinc-50 tracking-tight'>Nuevo Prospecto</h3>
                <button onClick={onCloseModal} className='text-zinc-500 hover:text-white transition-colors'>
                  <X size={24} strokeWidth={1.5} />
                </button>
              </div>

              <div className='space-y-5'>
                <div className='space-y-2'>
                  <label className='text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1'>Identificador / Empresa</label>
                  <input
                    placeholder='Ej: Agencia de Viajes Boyacá'
                    className='w-full p-4 bg-zinc-950 border border-white/10 rounded-2xl font-bold text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner'
                    value={newLeadForm.business_name}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, business_name: e.target.value })}
                  />
                </div>
                
                <div className='space-y-2'>
                  <label className='text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1'>Canal de Contacto</label>
                  <input
                    placeholder='Teléfono o WhatsApp'
                    className='w-full p-4 bg-zinc-950 border border-white/10 rounded-2xl font-mono text-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner'
                    value={newLeadForm.phone}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                  />
                </div>

                <div className='space-y-2'>
                  <label className='text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1'>Contexto / Notas Forenses</label>
                  <textarea
                    placeholder='Notas iniciales del prospecto...'
                    className='w-full p-4 bg-zinc-950 border border-white/10 rounded-2xl text-zinc-300 h-24 resize-none outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner'
                    value={newLeadForm.notes}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className='flex gap-4 mt-10'>
                <button
                  onClick={onCloseModal}
                  className='flex-1 py-4 text-zinc-500 font-bold hover:text-zinc-300 transition-colors'
                >
                  Cancelar
                </button>
                <button
                  onClick={onCreateLead}
                  disabled={!newLeadForm.business_name}
                  className='flex-[2] py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2'
                >
                  <Save size={18} /> Compilar Lead
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// BLOQUE 3: COMPONENTE CONTENEDOR (Máquina de Estados)
// ==========================================

export default function CRMBoard({ initialLeads }: CRMBoardContainerProps) {
  const {
    leads, moveLead, isModalOpen, setIsModalOpen,
    newLeadForm, setNewLeadForm, createLead,
  } = useCRM(initialLeads);

  // 🛡️ Zero-Trust Data Parsing
  const safeLeads = useMemo(() => Array.isArray(leads) ? leads : [], [leads]);

  return (
    <CRMBoardPanelView 
      leads={safeLeads}
      onMoveLead={moveLead}
      onOpenModal={() => setIsModalOpen(true)}
      onCloseModal={() => setIsModalOpen(false)}
      isModalOpen={isModalOpen}
      newLeadForm={newLeadForm}
      setNewLeadForm={setNewLeadForm}
      onCreateLead={createLead}
    />
  );
}