import { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import Papa from 'papaparse';

export const useMarketing = ({
  hotelInfo,
  leads,
  setLeads,
  fetchOperationalData,
}) => {
  // 1. Estados
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingId, setEditingId] = useState(null); // <--- Nuevo: Rastrea si editamos
  const [leadForm, setLeadForm] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
  });

  const importInputRef = useRef(null);

  // =================================================================
  // 🧠 CEREBRO DE VENTAS
  // =================================================================
  const generateSmartScript = (leadData) => {
    const name = leadData.name || 'Cliente';
    const details = (leadData.notes || '').toLowerCase();
    const hotelName = hotelInfo?.name || 'nuestro hotel';
    let message = '';

    if (details.includes('boda') || details.includes('matrimonio')) {
      message = `Hola *${name}*, felicidades por el compromiso 💍. Soy del equipo de *${hotelName}*. ¿Te gustaría ver nuestro portafolio de Bodas?`;
    } else if (details.includes('empresa') || details.includes('evento')) {
      message = `Hola *${name}*, un gusto saludarte. Vi tu interés en eventos corporativos en *${hotelName}*. 🤝 ¿Te envío opciones?`;
    } else if (details.includes('pasadía') || details.includes('solar')) {
      message = `Hola *${name}*, ¿buscas un día de sol? ☀️ En *${hotelName}* tenemos planes de Pasadía. ¿Te comparto precios?`;
    } else {
      message = `Hola *${name}*, gracias por tu interés en *${hotelName}*. 🏨 ¿Tienes alguna fecha en mente o te gustaría ver promociones?`;
    }
    return message;
  };

  const openWhatsApp = (phone, message) => {
    if (!phone) return alert('Sin teléfono válido');
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(
      `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`,
      '_blank'
    );
  };

  // =================================================================
  // 🛠️ ABM (ALTAS, BAJAS Y MODIFICACIONES)
  // =================================================================

  // A. PREPARAR EDICIÓN (Llena el form con datos existentes)
  const prepareEdit = (lead) => {
    setEditingId(lead.id); // Marcamos que estamos editando este ID
    setLeadForm({
      name: lead.guest_name || '',
      phone: lead.guest_phone || '',
      email: lead.guest_email || '',
      notes: lead.notes || '',
    });
    setShowLeadModal(true);
  };

  // B. BORRAR LEAD
  const handleDeleteLead = async (id) => {
    if (!window.confirm('¿Seguro que quieres eliminar este prospecto?')) return;

    try {
      const { error } = await supabase
        .from('hotel_guest_leads')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Actualización optimista (borrar de la lista visualmente)
      setLeads(leads.filter((l) => l.id !== id));
    } catch (error) {
      alert('Error al borrar: ' + error.message);
    }
  };

  // C. GUARDAR (CREAR O EDITAR)
  const handleSaveLead = async (e) => {
    e.preventDefault();
    if (!leadForm.name) return alert('Nombre obligatorio');

    try {
      if (editingId) {
        // --- MODO EDICIÓN ---
        const { error } = await supabase
          .from('hotel_guest_leads')
          .update({
            guest_name: leadForm.name,
            guest_phone: leadForm.phone,
            guest_email: leadForm.email,
            notes: leadForm.notes,
          })
          .eq('id', editingId);

        if (error) throw error;
        alert('Lead actualizado');
      } else {
        // --- MODO CREACIÓN ---
        const { error } = await supabase.from('hotel_guest_leads').insert([
          {
            hotel_id: hotelInfo.id,
            guest_name: leadForm.name,
            guest_phone: leadForm.phone,
            guest_email: leadForm.email,
            notes: leadForm.notes,
            source: 'front_desk',
            status: 'new',
          },
        ]);

        if (error) throw error;
        alert('Lead creado');
      }

      // Limpieza y Refresco
      setShowLeadModal(false);
      setEditingId(null); // Reset modo edición
      setLeadForm({ name: '', phone: '', email: '', notes: '' });
      fetchOperationalData();
    } catch (error) {
      alert(error.message);
    }
  };

  // D. RESETEAR FORMULARIO (Para el botón "Nuevo Lead")
  const openNewLeadModal = () => {
    setEditingId(null);
    setLeadForm({ name: '', phone: '', email: '', notes: '' });
    setShowLeadModal(true);
  };

  // ... (Funciones auxiliares existentes)
  const updateLeadStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'contacted' ? 'new' : 'contacted';
    const { error } = await supabase
      .from('hotel_guest_leads')
      .update({ status: nextStatus })
      .eq('id', id);
    if (!error)
      setLeads(
        leads.map((l) => (l.id === id ? { ...l, status: nextStatus } : l))
      );
  };

  const createHuntedLead = async (aiData) => {
    console.log('💾 Guardando Lead de IA:', aiData);
    try {
      const { error } = await supabase.from('hotel_guest_leads').insert([
        {
          hotel_id: hotelInfo.id,
          guest_name: aiData.name,
          guest_phone: aiData.phone,
          source: aiData.source || 'Voice AI',
          status: aiData.status || 'new',
          notes: aiData.notes || 'Registrado automáticamente por Voz',
        },
      ]);
      if (error) throw error;
      await fetchOperationalData();
      return true;
    } catch (error) {
      console.error('Error guardando lead:', error.message);
      throw error;
    }
  };

  const handleImportLeads = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        /* Tu lógica de importación aquí */
      },
    });
  };

  return {
    showLeadModal,
    setShowLeadModal,
    leadForm,
    setLeadForm,
    editingId, // <--- Estado expuesto
    importInputRef,
    updateLeadStatus,
    handleImportLeads,
    handleSaveLead, // <--- Reemplaza a handleCreateManualLead
    openNewLeadModal, // <--- Función para limpiar antes de abrir
    prepareEdit, // <--- Función para editar
    handleDeleteLead, // <--- Función para borrar
    createHuntedLead,
    generateSmartScript,
    openWhatsApp,
  };
};
