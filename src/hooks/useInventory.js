import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import imageCompression from 'browser-image-compression'; //

export const useInventory = ({
  hotelInfo,
  rooms,
  setRooms,
  fetchOperationalData,
}) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // --- SUBIDA DE IMÁGENES OPTIMIZADA (OPCIÓN 1) ---
  const uploadImages = async (files, roomId, bucket = 'room-images') => {
    if (!files || files.length === 0) return [];

    setUploading(true);
    const uploadedUrls = [];

    // Configuración de compresión: Calidad web alta pero ligera
    const compressionOptions = {
      maxSizeMB: 1, // Máximo 1MB por foto
      maxWidthOrHeight: 1920, // Full HD es suficiente para web
      useWebWorker: true, // Usa hilos paralelos para no congelar la pantalla
      fileType: 'image/webp', // Intenta convertir a WebP si es posible (opcional)
    };

    try {
      for (const file of files) {
        // 1. Comprimir la imagen antes de subir
        let fileToUpload = file;
        try {
          // Solo comprimimos imágenes, ignoramos si es otro tipo por seguridad
          if (file.type.startsWith('image/')) {
            console.log(
              `Comprimiendo ${file.name} de ${(file.size / 1024 / 1024).toFixed(
                2
              )}MB...`
            );
            fileToUpload = await imageCompression(file, compressionOptions);
            console.log(
              `Comprimido a: ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`
            );
          }
        } catch (compressionError) {
          console.warn(
            'Falló la compresión, subiendo original:',
            compressionError
          );
        }

        const fileExt = fileToUpload.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        // Estructura segura: hotel_id / (room_id o 'hero') / archivo
        const folder = roomId || 'general';
        const filePath = `${hotelInfo.id}/${folder}/${fileName}`;

        // 2. Subir el archivo (posiblemente comprimido)
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, fileToUpload);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

        uploadedUrls.push(data.publicUrl);
      }
      return uploadedUrls;
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      alert('Error subiendo imagen: ' + error.message);
      return [];
    } finally {
      setUploading(false);
    }
  };

  // --- ACTUALIZAR PERFIL DEL HOTEL (HERO + TAGLINE) ---
  const updateHotelProfile = async (updates, heroFile) => {
    try {
      setLoading(true);

      let heroUrl = updates.main_image_url;

      // 1. Si hay nueva foto Hero, subirla al bucket 'hotel-assets'
      if (heroFile) {
        const urls = await uploadImages([heroFile], 'branding', 'hotel-assets');
        if (urls.length > 0) heroUrl = urls[0];
      }

      // 2. Actualizar tabla hotels
      const { error } = await supabase
        .from('hotels')
        .update({
          name: updates.name,
          location: updates.location,
          tagline: updates.tagline,
          main_image_url: heroUrl,
          phone: updates.phone,
          instagram_url: updates.instagram_url,
        })
        .eq('id', hotelInfo.id);

      if (error) throw error;

      // Recargar datos para ver cambios reflejados
      await fetchOperationalData();
      return true;
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 1. CREAR HABITACIÓN
  const createRoom = async (roomData, imageFiles) => {
    try {
      setLoading(true);
      if (!hotelInfo?.id) throw new Error('No se identificó el hotel.');

      const imageUrls = await uploadImages(imageFiles, null);

      const { data: newRoom, error } = await supabase
        .from('rooms')
        .insert([
          {
            hotel_id: hotelInfo.id,
            name: roomData.name,
            price: parseFloat(roomData.price) || 0,
            status: roomData.status || 'available',
            is_price_per_person: roomData.is_price_per_person || false,
            description: roomData.description,
            capacity: parseInt(roomData.capacity) || 2,
            beds: parseInt(roomData.beds) || 1,
            bed_type: roomData.bed_type || 'Doble',
            amenities: roomData.amenities || [],
            images: imageUrls,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (roomData.status === 'maintenance') {
        await supabase.from('bookings').insert([
          {
            hotel_id: hotelInfo.id,
            room_id: newRoom.id,
            check_in: new Date().toISOString().split('T')[0],
            check_out: '2030-12-31',
            status: 'maintenance',
            total_price: 0,
            notes: 'BLOQUEO AUTOMÁTICO: Mantenimiento Inicial',
          },
        ]);
      }

      await fetchOperationalData();
      return true;
    } catch (error) {
      console.error('Error creando:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 2. ACTUALIZAR HABITACIÓN
  const updateRoom = async (
    roomId,
    updates,
    newFiles,
    existingImages,
    oldStatus
  ) => {
    try {
      setLoading(true);
      let finalImages = [...(existingImages || [])];
      if (newFiles && newFiles.length > 0) {
        const newUrls = await uploadImages(newFiles, roomId);
        finalImages = [...finalImages, ...newUrls];
      }

      const { error } = await supabase
        .from('rooms')
        .update({
          name: updates.name,
          price: parseFloat(updates.price) || 0,
          status: updates.status,
          is_price_per_person: updates.is_price_per_person,
          description: updates.description,
          capacity: parseInt(updates.capacity),
          beds: parseInt(updates.beds),
          bed_type: updates.bed_type,
          amenities: updates.amenities,
          images: finalImages,
        })
        .eq('id', roomId);

      if (error) throw error;

      if (updates.status === 'maintenance' && oldStatus !== 'maintenance') {
        await supabase.from('bookings').insert([
          {
            hotel_id: hotelInfo.id,
            room_id: roomId,
            check_in: new Date().toISOString().split('T')[0],
            check_out: '2030-12-31',
            status: 'maintenance',
            total_price: 0,
            notes: 'BLOQUEO AUTOMÁTICO: Mantenimiento',
          },
        ]);
      } else if (
        updates.status === 'available' &&
        oldStatus === 'maintenance'
      ) {
        await supabase
          .from('bookings')
          .delete()
          .eq('room_id', roomId)
          .eq('status', 'maintenance');
      }

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
      await supabase
        .from('bookings')
        .delete()
        .eq('room_id', roomId)
        .eq('status', 'maintenance');
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

  return {
    createRoom,
    updateRoom,
    deleteRoom,
    updateHotelProfile,
    loading,
    uploading,
  };
};
