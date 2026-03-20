'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
// ✅ Importamos las acciones blindadas
import {
  createLeadAction,
  updateLeadStatusAction,
} from '@/app/actions/marketing';

export interface Lead {
  id: number;
  business_name: string;
  phone: string | null;
  status: 'new' | 'contacted' | 'negotiation' | 'won' | 'lost';
  notes: string | null;
  ai_pitch?: string;
  city_search?: string;
}

export const useCRM = (initialLeads: Lead[]) => {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    business_name: '',
    phone: '',
    notes: '',
    city_search: 'Manual',
  });

  // A. MOVER LEAD (Server Action)
  const moveLead = async (leadId: number, newStatus: Lead['status']) => {
    // 1. Optimismo en UI (Feedback instantáneo)
    const previousLeads = [...leads];
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)),
    );

    // 2. Persistencia Segura
    const result = await updateLeadStatusAction(leadId, newStatus);

    if (!result.success) {
      alert('❌ Error moviendo lead: ' + result.error);
      setLeads(previousLeads); // Revertimos si falló
    } else {
      router.refresh(); // Sincronizamos silenciosamente
    }
  };

  // B. CREAR LEAD (Server Action)
  const createLead = async () => {
    if (!newLeadForm.business_name) return alert('Nombre requerido');

    const result = await createLeadAction(newLeadForm);

    if (result.success) {
      setLeads([result.data, ...leads]); // Agregamos el nuevo lead a la UI
      setIsModalOpen(false);
      setNewLeadForm({
        business_name: '',
        phone: '',
        notes: '',
        city_search: 'Manual',
      });
      router.refresh();
      // No mostramos alert para que sea fluido, solo cerramos el modal
    } else {
      alert('❌ Error creando prospecto: ' + result.error);
    }
  };

  return {
    leads,
    moveLead,
    isModalOpen,
    setIsModalOpen,
    newLeadForm,
    setNewLeadForm,
    createLead,
  };
};
