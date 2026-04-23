'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { saveRoomAction, deleteRoomAction } from '@/app/actions/inventory';

// ==========================================
// BLOQUE 1: INTERFACES Y CONTRATOS ESTRICTOS
// ==========================================

export interface Room {
  id: string;
  name: string;
  type: string;
  capacity: number;
  price: number;
  weekend_price?: number; 
  status: 'clean' | 'dirty' | 'maintenance' | 'active'; 
  gallery?: any[];
  amenities?: any[];
  size_sqm?: number;
  hotel_id?: string;
  ical_import_url?: string;
}

// ==========================================
// BLOQUE 2: LÓGICA DEL HOOK (Motor Operativo)
// ==========================================

export const useInventory = (initialRooms: Room[], hotelId: string) => {
  const router = useRouter();
  
  // 🛡️ Sincronización Server-to-Client: Garantiza coherencia tras mutaciones externas
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  useEffect(() => { 
    setRooms(initialRooms); 
  }, [initialRooms]);

  const [isEditing, setIsEditing] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const [roomForm, setRoomForm] = useState<Partial<Room>>({
    name: '', 
    type: 'standard', 
    capacity: 2, 
    price: 0, 
    status: 'active',
    gallery: [], 
    amenities: [], 
    ical_import_url: '',
  });

  // 🛡️ SANEAMIENTO DE PAYLOAD (Protocolo Zero-Trust)
  // Evita el envío de campos basura o malformados a la Server Action
  const getSanitizedPayload = () => ({
    name: roomForm.name || '',
    capacity: Number(roomForm.capacity) || 2,
    price: Number(roomForm.price) || 0,
    status: (roomForm.status as 'active' | 'maintenance') || 'active',
    size_sqm: roomForm.size_sqm,
    gallery: roomForm.gallery || [],
    amenities: roomForm.amenities || [],
    ical_import_url: roomForm.ical_import_url || '',
  });

  // CONTROLADORES DE ACCIÓN
  const createRoom = async () => {
    if (!hotelId) return alert('Error Crítico: Hotel ID no detectado en el contexto.');
    try {
      const res = await saveRoomAction(hotelId, getSanitizedPayload());
      if (!res.success) throw new Error(res.error);
      
      setIsEditing(false);
      router.refresh();
      alert('✅ Unidad registrada exitosamente.');
    } catch (e: any) {
      console.error("[CRITICAL] Inventory Creation Failure:", e);
      alert('Fallo Operativo: ' + e.message);
    }
  };

  const updateRoom = async () => {
    if (!selectedRoom?.id || !hotelId) return;
    try {
      const res = await saveRoomAction(hotelId, getSanitizedPayload(), selectedRoom.id);
      if (!res.success) throw new Error(res.error);
      
      setIsEditing(false);
      router.refresh();
      alert('✅ Cambios persistidos en el nodo central.');
    } catch (e: any) {
      console.error("[CRITICAL] Inventory Update Failure:", e);
      alert('Fallo Operativo: ' + e.message);
    }
  };

  const deleteRoom = useCallback(async (id: string) => {
    if (!confirm('¿Desea anular permanentemente este nodo de inventario?')) return;
    try {
      const res = await deleteRoomAction(id);
      if (!res.success) throw new Error(res.error);
      
      // Mutación optimista del estado local para latencia cero
      setRooms(prev => prev.filter(r => r.id !== id));
      router.refresh();
    } catch (e: any) {
      alert('Falla Crítica de Eliminación: ' + e.message);
    }
  }, [router]);

  const openNewRoomModal = useCallback(() => {
    setRoomForm({ 
      name: '', type: 'standard', capacity: 2, price: 0, 
      status: 'active', gallery: [], amenities: [], ical_import_url: '' 
    });
    setSelectedRoom(null);
    setIsEditing(true);
  }, []);

  const syncRooms = useCallback(() => {
    router.refresh();
  }, [router]);

  return {
    rooms, 
    isEditing, 
    setIsEditing, 
    roomForm, 
    setRoomForm,
    createRoom, 
    updateRoom, 
    deleteRoom, 
    openNewRoomModal, 
    openEditModal: (room: Room) => { 
      setRoomForm(room); 
      setSelectedRoom(room); 
      setIsEditing(true); 
    },
    selectedRoom, 
    syncRooms
  };
};