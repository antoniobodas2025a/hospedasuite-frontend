import { useState } from 'react';
import { supabase } from '../supabaseClient';

export const useInventory = ({
  hotelInfo,
  rooms,
  setRooms,
  fetchOperationalData,
}) => {
  // 1. Estados Locales
  const [newRoomName, setNewRoomName] = useState('');
  const [editingRoom, setEditingRoom] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Estado del Formulario de Edición
  const [roomForm, setRoomForm] = useState({
    name: '',
    price: '',
    description: '',
    image_url: '',
    amenities: [],
    capacity: 2,
    beds: 1,
    bedrooms: 1,
    is_price_per_person: false,
  });

  // 2. Funciones Lógicas

  // Crear Habitación Rápida
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName) return;
    const { data, error } = await supabase
      .from('rooms')
      .insert([{ hotel_id: hotelInfo.id, name: newRoomName, price: 150000 }])
      .select();

    if (!error && data) {
      setRooms([...rooms, data[0]]);
      setNewRoomName('');
    }
  };

  // Abrir Modal de Edición
  const openEditRoom = (room) => {
    setEditingRoom(room);
    setSelectedFile(null);
    setRoomForm({
      name: room.name || '',
      price: room.price || '',
      description: room.description || '',
      image_url: room.image_url || '',
      amenities: room.amenities || [],
      capacity: room.capacity || 2,
      beds: room.beds || 1,
      bedrooms: room.bedrooms || 1,
      is_price_per_person: room.is_price_per_person || false,
    });
  };

  // Guardar Cambios (Update + Foto)
  const handleUpdateRoom = async (e) => {
    e.preventDefault();
    if (!editingRoom) return;

    setUploading(true);
    let finalImageUrl = roomForm.image_url;

    try {
      // 1. Subida de Foto (si hay archivo seleccionado)
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('room-images')
          .upload(filePath, selectedFile);

        if (uploadError) throw new Error('Falla en subida de imagen');

        const { data: urlData } = supabase.storage
          .from('room-images')
          .getPublicUrl(filePath);

        finalImageUrl = urlData.publicUrl;
      }

      // 2. Guardar en Base de Datos
      const { error: updateError } = await supabase
        .from('rooms')
        .update({
          name: roomForm.name,
          price: parseFloat(roomForm.price),
          description: roomForm.description,
          image_url: finalImageUrl,
          amenities: roomForm.amenities,
          capacity: parseInt(roomForm.capacity),
          beds: parseInt(roomForm.beds),
          bedrooms: parseInt(roomForm.bedrooms),
          is_price_per_person: roomForm.is_price_per_person,
        })
        .eq('id', editingRoom.id);

      if (updateError) throw new Error(updateError.message);

      alert('✅ Habitación actualizada');
      setEditingRoom(null);
      fetchOperationalData(); // Recargar datos globales
    } catch (error) {
      alert('❌ Error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return {
    // Estados
    newRoomName,
    setNewRoomName,
    editingRoom,
    setEditingRoom,
    uploading,
    selectedFile,
    setSelectedFile,
    roomForm,
    setRoomForm,
    // Funciones
    handleCreateRoom,
    openEditRoom,
    handleUpdateRoom,
  };
};
