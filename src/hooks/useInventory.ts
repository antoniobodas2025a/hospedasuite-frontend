'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveRoomAction, deleteRoomAction } from '@/app/actions/inventory';

export interface Room {
  id: string;
  name: string;
  type: string;
  capacity: number;
  price: number;
  weekend_price?: number; 
  status: 'clean' | 'dirty' | 'maintenance' | 'active'; 
  features?: string[];
  gallery?: any[];
  amenities?: any[];
  size_sqm?: number;
  hotel_id?: string;
  ical_import_url?: string;
}

export const useInventory = (initialRooms: Room[], hotelId: string) => {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const [roomForm, setRoomForm] = useState<Partial<Room>>({
    name: '',
    type: 'standard',
    capacity: 2,
    price: 0,
    weekend_price: 0, 
    status: 'active',
    features: [],
    gallery: [],
    amenities: [],
    ical_import_url: '',
  });

  // 🚨 FIX QA CRÍTICO: Sincronización Server-to-Client
  // Cuando router.refresh() trae nuevas props, actualizamos la tabla visible
  useEffect(() => {
    setRooms(initialRooms);
  }, [initialRooms]);

  const createRoom = async () => {
    if (!hotelId) {
      alert('Error Crítico: No se ha identificado el Hotel ID.');
      return;
    }

    try {
      const res = await saveRoomAction(hotelId, {
        name: roomForm.name || '',
        capacity: roomForm.capacity || 2,
        price: roomForm.price || 0,
        status: (roomForm.status as 'active' | 'maintenance') || 'active',
        size_sqm: roomForm.size_sqm,
        gallery: roomForm.gallery || [],
        amenities: roomForm.amenities || [],
      });

      if (!res.success) throw new Error(res.error);

      setIsEditing(false);

      setRoomForm({
        name: '', type: 'standard', capacity: 2, price: 0, weekend_price: 0, 
        status: 'active', features: [], gallery: [], amenities: [], ical_import_url: '',
      });

      router.refresh(); // Esto disparará el useEffect de arriba al finalizar
      alert('✅ Habitación creada correctamente');
    } catch (e: any) {
      alert('Error al crear: ' + e.message);
    }
  };

  const updateRoom = async () => {
    if (!selectedRoom?.id || !hotelId) return;
    try {
      const res = await saveRoomAction(hotelId, {
        name: roomForm.name || '',
        capacity: roomForm.capacity || 2,
        price: roomForm.price || 0,
        status: (roomForm.status as 'active' | 'maintenance') || 'active',
        size_sqm: roomForm.size_sqm,
        gallery: roomForm.gallery || [],
        amenities: roomForm.amenities || [],
      }, selectedRoom.id);

      if (!res.success) throw new Error(res.error);

      setIsEditing(false);
      router.refresh(); // Disparará el useEffect
      alert('✅ Habitación actualizada');
    } catch (e: any) {
      alert('Error al actualizar: ' + e.message);
    }
  };

  const deleteRoom = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta habitación forense?')) return;
    try {
      const res = await deleteRoomAction(id);
      
      if (!res.success) throw new Error(res.error);

      // Eliminación optimista local (UX más rápida al borrar)
      setRooms((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } catch (e: any) {
      alert('Error eliminando: ' + e.message);
    }
  };

  const openNewRoomModal = () => {
    setRoomForm({
      name: '', type: 'standard', capacity: 2, price: 0, weekend_price: 0, 
      status: 'active', features: [], gallery: [], amenities: [], ical_import_url: '',
    });
    setSelectedRoom(null);
    setIsEditing(true);
  };

  const openEditModal = (room: Room) => {
    setRoomForm(room);
    setSelectedRoom(room);
    setIsEditing(true);
  };

  return {
    rooms, isEditing, setIsEditing, roomForm, setRoomForm,
    createRoom, updateRoom, deleteRoom, openNewRoomModal, openEditModal, selectedRoom,
  };
};