'use client';

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RoomSchema } from '@/lib/validations/inventory';
import * as z from 'zod';

type RoomFormValues = z.input<typeof RoomSchema>;
import { saveRoomAction } from '@/app/actions/inventory';
import { motion } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import { cn } from '@/lib/utils';
import { 
  X, Trash2, Wifi, Tv, Wind, Bath, 
  Car, Coffee, Copy, RefreshCw, Image as ImageIcon, Building2, Plus, UploadCloud, Loader2
} from 'lucide-react';

// ==========================================
// BLOQUE 1: CONSTANTES Y TIPADOS
// ==========================================

const AVAILABLE_AMENITIES = [
  { id: 'wifi', label: 'Wi-Fi 6', icon: Wifi },
  { id: 'tv', label: 'Smart TV', icon: Tv },
  { id: 'ac', label: 'Climatización', icon: Wind },
  { id: 'jacuzzi', label: 'Jacuzzi', icon: Bath },
  { id: 'parking', label: 'Parqueadero', icon: Car },
  { id: 'minibar', label: 'Minibar', icon: Coffee },
];

interface RoomEditorModalProps {
  hotelId: string;
  initialData?: any; 
  onClose: (needsRefresh?: boolean) => void;
}

// ==========================================
// BLOQUE 2: MOTOR DE OPTIMIZACIÓN (WEBP)
// ==========================================

const optimizeImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Canvas compilation failed'));
          resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
            type: 'image/webp',
            lastModified: Date.now(),
          }));
        }, 'image/webp', 0.80);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

// ==========================================
// BLOQUE 3: COMPONENTE PRINCIPAL
// ==========================================

export default function RoomEditorModal({ hotelId, initialData, onClose }: RoomEditorModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState(''); 
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<RoomFormValues>({
    resolver: zodResolver(RoomSchema),
    defaultValues: {
      name: initialData?.name || '',
      capacity: initialData?.capacity || 2,
      price: initialData?.price || 0,
      description: initialData?.description || '',
      status: initialData?.status || 'active',
      amenities: initialData?.amenities || [],
      gallery: initialData?.gallery || [],
      ical_import_url: initialData?.ical_import_url || '',
    }
  });

  const currentAmenities = watch('amenities') || [];
  const currentGallery = watch('gallery') || [];

  const toggleAmenity = (amenityId: string) => {
    const exists = currentAmenities.includes(amenityId);
    setValue('amenities', exists 
      ? currentAmenities.filter((id: string) => id !== amenityId) 
      : [...currentAmenities, amenityId], { shouldDirty: true });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploadingMedia(true);
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!, 
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      // 🔍 AUDITORÍA DE SESIÓN EN VIVO
      const { data: { session } } = await supabase.auth.getSession();
      console.log("Estado de la sesión en cliente:", session ? "LOGUEADO" : "ANÓNIMO");

      const newUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const optimizedFile = await optimizeImage(file);
        const fileName = `${hotelId}/room-${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
        
        const { error } = await supabase.storage
          .from('gallery')
          .upload(fileName, optimizedFile, {
            cacheControl: '31536000',
            upsert: true 
          });

        if (error) {
          console.error("Error específico de Storage:", error);
          throw error;
        }

        const { data: publicUrlData } = supabase.storage.from('gallery').getPublicUrl(fileName);
        newUrls.push(publicUrlData.publicUrl);
      }

      setValue('gallery', [...currentGallery, ...newUrls], { shouldDirty: true });
    } catch (error: any) {
      console.error("[CRITICAL] Falla en la carga multimedia:", error);
      alert(`Error al subir archivo: ${error.message || 'Verifique conexión y bucket'}`);
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onSubmitHandler = async (data: RoomFormValues) => {
    setIsSaving(true);
    try {
      const result = await saveRoomAction(hotelId, data, initialData?.id);
      if (result.success) onClose(true);
      else alert(`Error en la mutación: ${result.error}`);
    } catch (error) {
      alert("Excepción crítica al intentar enlazar con la Bóveda.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-4xl max-h-[90vh] glass-panel flex flex-col overflow-hidden"
      >
        <div className="p-6 border-b border-white/5 flex justify-between items-center glass-card !rounded-none">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-[var(--radius-squircle-2xl)] bg-zinc-900 border border-white/10 flex items-center justify-center">
              <Building2 className="size-6 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {initialData ? 'Afinación de Nodo' : 'Nuevo Nodo'}
            </h2>
          </div>
          <button onClick={() => onClose(false)} className="p-3 bg-white/5 hover:bg-rose-500/20 rounded-[var(--radius-squircle-2xl)] transition-colors text-zinc-400 hover:text-rose-400">
            <X className="size-5" />
          </button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar font-poppins text-zinc-200">
          <form id="room-form" onSubmit={handleSubmit(onSubmitHandler)} className="space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-8">
                <div>
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Núcleo Operativo
                  </h3>
                  <div className="space-y-5">
                    <input {...register('name')} className="w-full bg-transparent border-b border-white/10 text-white px-2 py-3 focus:outline-none focus:border-indigo-500 font-black text-2xl placeholder:text-zinc-700" placeholder="Nombre de Unidad" />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-900/50 p-4 rounded-[var(--radius-squircle-2xl)] border border-white/5">
                        <label className="block text-[9px] font-bold text-zinc-500 mb-1 uppercase tracking-widest">Tarifa (COP)</label>
                        <input type="number" {...register('price', { valueAsNumber: true })} className="w-full bg-transparent text-emerald-400 focus:outline-none font-bold font-mono" />
                      </div>
                      <div className="bg-zinc-900/50 p-4 rounded-[var(--radius-squircle-2xl)] border border-white/5">
                        <label className="block text-[9px] font-bold text-zinc-500 mb-1 uppercase tracking-widest">Aforo</label>
                        <input type="number" {...register('capacity', { valueAsNumber: true })} className="w-full bg-transparent text-white focus:outline-none font-bold font-mono" />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Comodidades</h3>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_AMENITIES.map((amenity) => (
                      <button type="button" key={amenity.id} onClick={() => toggleAmenity(amenity.id)} className={cn("flex items-center gap-2 px-3 py-2 rounded-[var(--radius-squircle-lg)] border text-[11px] font-medium transition-all", currentAmenities.includes(amenity.id) ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-300")}>
                        <amenity.icon className="size-3.5" /> {amenity.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-8 border-t lg:border-t-0 lg:border-l border-white/5 pt-8 lg:pt-0 lg:pl-8">
                <div>
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Galería Visual (WebP)</h3>
                  <div className="space-y-4">
                    <input type="file" accept="image/*" multiple className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingMedia} className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 border-dashed rounded-[var(--radius-squircle-lg)] py-4 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                      {isUploadingMedia ? <><Loader2 className="size-4 animate-spin" /> Procesando...</> : <><UploadCloud className="size-4" /> Subir desde el Equipo</>}
                    </button>

                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                      {currentGallery.map((img: any, i: number) => (
                        <div key={i} className="relative shrink-0 w-24 h-20 rounded-[var(--radius-squircle-md)] overflow-hidden border border-white/10 group">
                          <img src={img.url || img} className="w-full h-full object-cover" />
                          <button type="button" onClick={() => setValue('gallery', currentGallery.filter((_, idx) => idx !== i))} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Trash2 className="size-4 text-rose-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-white/5 bg-[#09090b]/80 flex justify-end gap-4">
          <button onClick={() => onClose(false)} className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Descartar</button>
          <button type="submit" form="room-form" disabled={isSaving || isUploadingMedia} className="px-8 py-3 text-[10px] font-bold uppercase tracking-widest text-white bg-indigo-600 rounded-[var(--radius-squircle-lg)] shadow-cta">
            {isSaving ? 'Guardando...' : 'Compilar Mutación'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}