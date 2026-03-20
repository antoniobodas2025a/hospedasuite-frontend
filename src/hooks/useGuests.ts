'use client';

import { useState } from 'react';
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

// 🚨 NOTA IMPORTANTE: Ahora requerimos hotelId como segundo parámetro
export const useGuests = (initialGuests: Guest[], hotelId?: string) => {
  const router = useRouter();
  const [guests, setGuests] = useState<Guest[]>(initialGuests);
  const [filteredGuests, setFilteredGuests] = useState<Guest[]>(initialGuests);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);

  const [guestForm, setGuestForm] = useState<Partial<Guest>>({
    full_name: '', doc_type: 'CC', doc_number: '', phone: '', email: '', country: 'Colombia', notes: '',
  });

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term) return setFilteredGuests(guests);
    const lower = term.toLowerCase();
    setFilteredGuests(guests.filter(g => g.full_name.toLowerCase().includes(lower) || g.doc_number.includes(term) || (g.phone && g.phone.includes(term))));
  };

  const createGuest = async () => {
    if (!hotelId) return alert('Error: Hotel no identificado.');
    const result = await createGuestAction({ ...guestForm, hotel_id: hotelId });
    
    if (result.success) {
      const newGuests = [result.data, ...guests];
      setGuests(newGuests);
      setFilteredGuests(newGuests);
      setIsEditing(false);
      resetForm();
      router.refresh();
      alert('✅ Huésped registrado exitosamente');
    } else {
      alert('❌ Error al crear: ' + result.error);
    }
  };

  const updateGuest = async () => {
    if (!selectedGuest?.id) return;
    const result = await updateGuestAction(selectedGuest.id, {
      full_name: guestForm.full_name, doc_type: guestForm.doc_type, doc_number: guestForm.doc_number,
      phone: guestForm.phone, email: guestForm.email, country: guestForm.country, notes: guestForm.notes
    });

    if (result.success) {
      const updatedList = guests.map((g) => g.id === selectedGuest.id ? ({ ...g, ...guestForm } as Guest) : g);
      setGuests(updatedList);
      setFilteredGuests(updatedList);
      setIsEditing(false);
      resetForm();
      router.refresh();
      alert('✅ Datos actualizados');
    } else {
      alert('❌ Error al actualizar: ' + result.error);
    }
  };

  const deleteGuest = async (id: string) => {
    if (!confirm('¿Confirmas eliminar este perfil?')) return;
    const result = await deleteGuestAction(id);
    
    if (result.success) {
      const newList = guests.filter((g) => g.id !== id);
      setGuests(newList);
      setFilteredGuests(newList);
      router.refresh();
    } else {
      alert('❌ Error eliminando: ' + result.error);
    }
  };

  const resetForm = () => setGuestForm({ full_name: '', doc_type: 'CC', doc_number: '', phone: '', email: '', country: 'Colombia', notes: '' });
  const openNewGuestModal = () => { resetForm(); setSelectedGuest(null); setIsEditing(true); };
  const openEditModal = (guest: Guest) => { setGuestForm(guest); setSelectedGuest(guest); setIsEditing(true); };

  return { guests: filteredGuests, totalGuests: guests.length, searchTerm, handleSearch, isEditing, setIsEditing, guestForm, setGuestForm, createGuest, updateGuest, deleteGuest, openNewGuestModal, openEditModal, selectedGuest };
};