import { useState } from 'react';
import { supabase } from '../supabaseClient';

export const useInventory = ({
  hotelInfo,
  rooms,
  setRooms,
  fetchOperationalData,
}) => {
  const [loading, setLoading] = useState(false);

  // 1. CREAR HABITACIÓN
  const createRoom = async (roomData) => {
    try {
      setLoading(true);

      // Validamos que haya hotel
      if (!hotelInfo?.id) throw new Error('No se identificó el hotel.');

      const { error } = await supabase.from('rooms').insert([
        {
          hotel_id: hotelInfo.id,
          name: roomData.name,
          price: parseFloat(roomData.price) || 0,
          status: roomData.status || 'available',
          is_price_per_person: roomData.is_price_per_person || false, // 👈 Inyectar esto
        },
      ]);

      if (error) throw error;

      // Recargamos los datos para ver la nueva habitación
      await fetchOperationalData();
      return true;
    } catch (error) {
      console.error('Error creando habitación:', error);
      throw error; // Lanzamos el error para que el Panel lo muestre
    } finally {
      setLoading(false);
    }
  };

  // 2. EDITAR HABITACIÓN
  const updateRoom = async (roomId, updates) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('rooms')
        .update({
          name: updates.name,
          price: parseFloat(updates.price) || 0,
          status: updates.status,
          is_price_per_person: updates.is_price_per_person, // 👈 Inyectar esto
        })
        .eq('id', roomId);

      if (error) throw error;

      await fetchOperationalData();
      return true;
    } catch (error) {
      console.error('Error actualizando:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 3. ELIMINAR HABITACIÓN
  const deleteRoom = async (roomId) => {
    try {
      setLoading(true);
      const { error } = await supabase.from('rooms').delete().eq('id', roomId);

      if (error) throw error;

      await fetchOperationalData();
      return true;
    } catch (error) {
      console.error('Error eliminando:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Exportamos todo para que InventoryPanel lo pueda usar
  return {
    createRoom,
    updateRoom,
    deleteRoom,
    loading,
  };
};
