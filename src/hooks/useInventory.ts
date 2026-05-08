'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

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
  status: 'clean' | 'dirty' | 'maintenance' | 'active' | string; 
  gallery?: any[];
  amenities?: any[];
  size_sqm?: number;
  hotel_id?: string;
  ical_import_url?: string;
}

// ==========================================
// BLOQUE 2: LÓGICA DEL HOOK (Motor de Sincronización Puro)
// ==========================================

// 🚨 FIX FORENSE: El contrato ahora coincide exactamente con lo que espera InventoryPanel.tsx
export const useInventory = (hotelId: string) => {
  const router = useRouter();
  
  // Estado inicial 'undefined' permite que InventoryPanel use sus initialRooms
  const [rooms, setRooms] = useState<Room[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  // 🛡️ SINCRONIZACIÓN ABSOLUTA: Trae datos frescos directamente de la BD 
  // para evitar recargas completas de página y parpadeos.
  const syncRooms = useCallback(async () => {
    if (!hotelId) return;
    
    setIsLoading(true);
    try {
      // Cliente público seguro para operaciones de lectura en el borde
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Credenciales de Supabase no encontradas en el cliente.");
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      // Consulta topológica estricta
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('hotel_id', hotelId)
        .order('name', { ascending: true });

      if (error) throw new Error(error.message);
      
      // 1. Hidratación del estado local del panel (Reactividad Instantánea)
      setRooms(data || []);
      
      // 2. Purga del caché de Next.js (Mantiene los Server Components sincronizados)
      router.refresh();
      
    } catch (error: any) {
      console.error('[CRITICAL] Falla en sincronización de inventario:', error.message);
      // Fallback: Si falla la red del cliente, forzamos recarga del servidor
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }, [hotelId, router]);

  return {
    rooms,       // Expuesto para sobreescribir los initialRooms tras un cambio
    isLoading,   // Expuesto para manejar el UI Skeleton
    syncRooms    // Expuesto para ser llamado tras crear, editar o eliminar
  };
};