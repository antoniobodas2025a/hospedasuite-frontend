'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createGuestAction, updateGuestAction, deleteGuestAction } from '@/app/actions/guests';

export interface Guest {
  id: string;
  full_name: string;
  doc_type: string;
  doc_number: string;
  phone: string;
  email?: string;
  country?: string;
  notes?: string;
  hotel_id?: string;
}

const sanitizeGuests = (data: any[]): Guest[] => {
  if (!Array.isArray(data)) return [];
  return data.map(g => ({
    ...g,
    full_name: g.full_name || 'Huésped Anónimo',
    doc_number: g.doc_number || 'N/A',
    phone: g.phone || 'Sin Contacto'
  }));
};

export const useGuests = (initialGuests: Guest[], hotelId?: string) => {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [guestForm, setGuestForm] = useState<Partial<Guest>>({
    full_name: '', doc_type: 'CC', doc_number: '', phone: '', email: '', country: 'Colombia', notes: '',
  });

  const { guests, filteredGuests } = useMemo(() => {
    const safeData = sanitizeGuests(initialGuests);
    const term = searchTerm.toLowerCase();
    const filtered = safeData.filter(g => 
      !term || 
      g.full_name.toLowerCase().includes(term) || 
      g.doc_number.includes(term) || 
      g.phone.includes(term)
    );
    return { guests: safeData, filteredGuests: filtered };
  }, [initialGuests, searchTerm]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const createGuest = async () => {
    if (!hotelId) return alert('Violación de Contexto: Hotel ID no detectado.');
    try {
      const result = await createGuestAction({ ...guestForm, hotel_id: hotelId });
      if (result.success) {
        setIsEditing(false);
        resetForm();
        router.refresh();
        alert('✅ Perfil indexado correctamente.');
      } else throw new Error(result.error);
    } catch (e: any) {
      alert('Fallo en Registro: ' + e.message);
    }
  };

  const updateGuest = async () => {
    if (!selectedGuest?.id) return;
    try {
      const result = await updateGuestAction(selectedGuest.id, guestForm);
      if (result.success) {
        setIsEditing(false);
        resetForm();
        router.refresh();
        alert('✅ Perfil actualizado.');
      } else throw new Error(result.error);
    } catch (e: any) {
      alert('Fallo en Actualización: ' + e.message);
    }
  };

  const deleteGuest = useCallback(async (id: string) => {
    if (!confirm('¿Confirmar purga de este perfil?')) return;
    try {
      const result = await deleteGuestAction(id);
      if (result.success) {
        router.refresh();
      } else throw new Error(result.error);
    } catch (e: any) {
      alert('Fallo en Eliminación: ' + e.message);
    }
  }, [router]);

  const resetForm = () => setGuestForm({ full_name: '', doc_type: 'CC', doc_number: '', phone: '', email: '', country: 'Colombia', notes: '' });
  
  return {
    guests: filteredGuests,
    totalGuests: guests.length,
    searchTerm,
    handleSearch,
    isEditing,
    setIsEditing,
    guestForm,
    setGuestForm,
    createGuest,
    updateGuest,
    deleteGuest,
    openNewGuestModal: () => { resetForm(); setSelectedGuest(null); setIsEditing(true); },
    openEditModal: (guest: Guest) => { setGuestForm(guest); setSelectedGuest(guest); setIsEditing(true); },
    selectedGuest
  };
};