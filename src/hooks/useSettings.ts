'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
// ✅ Importamos la acción del servidor
import { saveSettingsAction } from '@/app/actions/settings';

export interface HotelSettings {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  tax_rate: number;
  primary_color: string;
  logo_url: string;
  wompi_public_key?: string;
  wompi_integrity_secret?: string;
}

export const useSettings = (initialData: HotelSettings) => {
  const router = useRouter();
  const [settings, setSettings] = useState<HotelSettings>(initialData);
  const [isSaving, setIsSaving] = useState(false);

  const updateSettings = async () => {
    setIsSaving(true);
    try {
      // 🚨 AQUÍ ESTABA EL ERROR: Antes usabas 'supabase.from...', ahora usamos la acción:
      const result = await saveSettingsAction(settings);

      if (!result.success) {
        throw new Error(result.error);
      }

      alert('✅ Configuración guardada correctamente');
      router.refresh();
    } catch (e: any) {
      alert('❌ Error guardando: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    settings,
    setSettings,
    updateSettings,
    isSaving,
  };
};
