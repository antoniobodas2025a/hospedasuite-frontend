import { useState, useRef } from 'react';
import { supabase } from '../supabaseClient'; // Ajusta la ruta si es necesario
import Papa from 'papaparse';

export const useMarketing = ({
  hotelInfo,
  leads,
  setLeads,
  fetchOperationalData,
}) => {
  // 1. Estados Locales (Solo usados en Marketing)
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadForm, setLeadForm] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
  });

  // 2. Referencias
  const importInputRef = useRef(null);

  // 3. Funciones Lógicas (Extraídas del Dashboard)

  // Actualizar estado del Lead (Nuevo <-> Contactado)
  const updateLeadStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'contacted' ? 'new' : 'contacted';
    const { error } = await supabase
      .from('leads') // Nota: Asegúrate que tu tabla se llame 'leads' o 'hotel_guest_leads' según tu DB real
      .update({ status: nextStatus })
      .eq('id', id);

    // Optimistic Update (Actualiza la UI sin recargar todo)
    if (!error) {
      setLeads(
        leads.map((l) => (l.id === id ? { ...l, status: nextStatus } : l))
      );
    }
  };

  // Enviar WhatsApp Plantilla
  const sendWhatsAppTemplate = (lead, templateType) => {
    const phone =
      lead.phone?.replace(/\D/g, '') || lead.guest_phone?.replace(/\D/g, '');
    const templates = {
      welcome: `Hola *${
        lead.full_name || lead.guest_name
      }*, vi que te interesó el *Plan ${
        lead.metadata?.plan_interest
      }* para el hotel *${
        lead.hotel_name
      }* en HospedaSuite. ¿Te gustaría agendar una demo breve? 🚀`,
      followup: `Hola *${
        lead.full_name || lead.guest_name
      }*, te escribo para dar seguimiento a tu postulación en *${
        lead.city_interest
      }*. ¿Tienes alguna duda técnica? 🛡️`,
    };

    if (!phone) return alert('El lead no tiene teléfono válido');

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(
        templates[templateType]
      )}`,
      '_blank'
    );
  };

  // Importación Masiva (CSV/Excel)
  const handleImportLeads = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          console.log('Filas encontradas:', results.data);

          const newLeads = results.data
            .map((row) => ({
              hotel_id: hotelInfo.id,
              guest_name:
                row['Nombre'] || row['nombre'] || row['Name'] || row['Cliente'],
              guest_phone:
                row['Teléfono'] ||
                row['telefono'] ||
                row['Phone'] ||
                row['Celular'],
              guest_email: row['Email'] || row['email'] || row['Correo'],
              source: 'database_import',
              status: 'new',
              metadata: { imported_at: new Date().toISOString() },
            }))
            .filter((l) => l.guest_name);

          if (newLeads.length === 0) {
            return alert(
              '⚠️ No se encontraron datos válidos. Revisa que el Excel tenga columnas: Nombre, Teléfono, Email.'
            );
          }

          const { error } = await supabase
            .from('hotel_guest_leads')
            .insert(newLeads);

          if (error) throw error;

          alert(
            `✅ Éxito: Se importaron ${newLeads.length} clientes a tu CRM.`
          );
          fetchOperationalData();
        } catch (error) {
          console.error(error);
          alert('❌ Error importando: ' + error.message);
        } finally {
          if (importInputRef.current) importInputRef.current.value = '';
        }
      },
    });
  };

  // Crear Lead Manualmente
  const handleCreateManualLead = async (e) => {
    e.preventDefault();
    if (!leadForm.name) return alert('El nombre es obligatorio');

    try {
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

      alert('✅ Lead creado exitosamente');
      setShowLeadModal(false);
      setLeadForm({ name: '', phone: '', email: '', notes: '' });
      fetchOperationalData();
    } catch (error) {
      console.error(error);
      alert('Error guardando lead: ' + error.message);
    }
  };

  // 4. Retornamos todo lo que la UI necesita
  return {
    // Estados
    showLeadModal,
    setShowLeadModal,
    leadForm,
    setLeadForm,
    importInputRef,
    // Funciones
    updateLeadStatus,
    sendWhatsAppTemplate,
    handleImportLeads,
    handleCreateManualLead,
  };
};
