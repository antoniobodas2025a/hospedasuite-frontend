'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray, UseFormRegister, FieldErrors, Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RoomSchema, RoomFormValues } from '@/lib/validations/inventory';
import { saveRoomAction } from '@/app/actions/inventory';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  X, Plus, Trash2, Wifi, Tv, Wind, Bath, 
  Car, Coffee, Globe, Copy, RefreshCw 
} from 'lucide-react';

// ==========================================
// BLOQUE 1: CONSTANTES Y TIPADOS
// ==========================================

const AVAILABLE_AMENITIES = [
  { id: 'wifi', label: 'Wi-Fi', icon: Wifi },
  { id: 'tv', label: 'Smart TV', icon: Tv },
  { id: 'ac', label: 'Aire Acondicionado', icon: Wind },
  { id: 'hot_water', label: 'Agua Caliente', icon: Bath },
  { id: 'parking', label: 'Parqueadero', icon: Car },
  { id: 'coffee', label: 'Cafetera', icon: Coffee },
];

interface RoomEditorModalProps {
  hotelId: string;
  initialData?: any; 
  onClose: () => void;
}

interface RoomEditorModalViewProps {
  initialData?: any;
  isSaving: boolean;
  register: UseFormRegister<RoomFormValues>;
  errors: FieldErrors<RoomFormValues>;
  control: Control<RoomFormValues>;
  currentAmenities: any[];
  galleryFields: Record<"id", string>[];
  appendPhoto: (obj: any) => void;
  removePhoto: (index: number) => void;
  toggleAmenity: (id: string) => void;
  copyToClipboard: (text: string) => void;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  onClose: () => void;
}

// ==========================================
// BLOQUE 2: COMPONENTE PRESENTACIONAL (UI Claude 2026)
// ==========================================

const RoomEditorModalView: React.FC<RoomEditorModalViewProps> = ({
  initialData, isSaving, register, errors, currentAmenities, galleryFields,
  appendPhoto, removePhoto, toggleAmenity, copyToClipboard, onSubmit, onClose
}) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-3xl max-h-[90vh] bg-[#09090b]/95 backdrop-blur-3xl border border-white/5 shadow-2xl shadow-black/50 rounded-[2rem] flex flex-col overflow-hidden ring-1 ring-white/10"
      >
        {/* HEADER */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center sticky top-0 bg-[#09090b]/80 backdrop-blur-xl z-20">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-50 tracking-tight">
              {initialData ? 'Configurar Unidad' : 'Registrar Nueva Unidad'}
            </h2>
            <p className="text-xs text-zinc-400 mt-1 font-mono uppercase tracking-wider">
              {initialData ? `ID: ${initialData.id?.split('-')[0]}` : 'Creación de Registro'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-400 hover:text-white">
            <X className="size-6 stroke-[1.5]" />
          </button>
        </div>

        {/* BODY (Scrollable) */}
        <div className="p-6 overflow-y-auto custom-scrollbar font-poppins text-zinc-200">
          <form id="room-form" onSubmit={onSubmit} className="space-y-8">
            
            {/* Sección: Información Básica */}
            <div>
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 border-l-2 border-indigo-500 pl-3">Parámetros Operativos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wide">Identificador / Nombre</label>
                  <input {...register('name')} className="w-full rounded-xl border border-white/10 bg-zinc-950/50 text-zinc-100 px-4 py-3 placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner" placeholder="Ej. Suite Presidencial" />
                  {errors.name && <p className="text-rose-400 text-xs mt-1.5 font-medium">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wide">Tarifa Base (COP)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 font-medium">$</span>
                    <input type="number" {...register('price', { valueAsNumber: true })} className="w-full rounded-xl border border-white/10 bg-zinc-950/50 text-zinc-100 pl-8 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner" />
                  </div>
                  {errors.price && <p className="text-rose-400 text-xs mt-1.5 font-medium">{errors.price.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wide">Capacidad Máxima (PAX)</label>
                  <input type="number" {...register('capacity', { valueAsNumber: true })} className="w-full rounded-xl border border-white/10 bg-zinc-950/50 text-zinc-100 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wide">Estado Físico</label>
                  <select {...register('status')} className="w-full rounded-xl border border-white/10 bg-zinc-950/50 text-zinc-100 px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner cursor-pointer">
                    <option value="active" className="bg-zinc-900 text-emerald-400">Disponible / Activa</option>
                    <option value="maintenance" className="bg-zinc-900 text-amber-400">En Mantenimiento</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Sección: Channel Manager */}
            <div className="pt-6 border-t border-white/5">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 border-l-2 border-sky-500 pl-3 flex items-center gap-2">
                <Globe className="size-4 text-sky-400" /> Nodos de Sincronización OTA
              </h3>

              <div className="space-y-4">
                {/* Exportación (Read-only) */}
                {initialData?.ical_export_token && (
                  <div className="bg-indigo-500/5 p-4 sm:p-5 rounded-2xl border border-indigo-500/10">
                    <label className="text-[10px] font-bold text-indigo-400/80 uppercase tracking-widest block mb-2">
                      Vector de Exportación (Para Booking/Airbnb)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/ical/export/${initialData.ical_export_token}`}
                        className="flex-1 bg-zinc-950/80 border border-indigo-500/20 rounded-xl px-3 py-2 text-[11px] font-mono text-indigo-300 select-all focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`${window.location.origin}/api/ical/export/${initialData.ical_export_token}`)}
                        className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 p-2.5 rounded-xl transition-all active:scale-95"
                        title="Copiar Enlace Privado"
                      >
                        <Copy className="size-4 stroke-[2]" />
                      </button>
                    </div>
                    <p className="text-[10px] text-indigo-500/60 mt-2 font-mono">
                      // RESTRICTED: Este endpoint proporciona lectura unidireccional de su disponibilidad.
                    </p>
                  </div>
                )}

                {/* Importación (Input) */}
                <div className="bg-zinc-900/40 p-4 sm:p-5 rounded-2xl border border-white/5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">
                    Vector de Importación (Fuente Maestra iCal)
                  </label>
                  <input
                    type="url"
                    {...register('ical_import_url')}
                    placeholder="https://calendar.google.com/.../basic.ics"
                    className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-sky-500/50 shadow-inner"
                  />
                  {errors.ical_import_url && <p className="text-rose-400 text-xs mt-1.5 font-medium">{errors.ical_import_url.message}</p>}
                </div>

                {initialData?.last_sync_at && (
                  <div className="flex items-center justify-end gap-1.5 text-[10px] text-zinc-500 font-mono px-2">
                    <RefreshCw className="size-3 animate-spin-slow text-sky-500/70" />
                    Last Sync: {new Date(initialData.last_sync_at).toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            {/* Sección: Amenidades (Matriz Neón) */}
            <div className="pt-6 border-t border-white/5">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 border-l-2 border-emerald-500 pl-3">Inventario de Servicios</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {AVAILABLE_AMENITIES.map((amenity) => {
                  const isSelected = currentAmenities.some(a => a.id === amenity.id);
                  const Icon = amenity.icon;
                  return (
                    <button
                      type="button"
                      key={amenity.id}
                      onClick={() => toggleAmenity(amenity.id)}
                      className={cn(
                        "flex items-center gap-2.5 p-3.5 rounded-xl border text-xs sm:text-sm font-medium transition-all duration-300 active:scale-95",
                        isSelected 
                          ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300 shadow-[0_0_15px_-3px_rgba(99,102,241,0.15)]" 
                          : "border-white/5 bg-zinc-900/30 text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
                      )}
                    >
                      <Icon className={cn("size-4 sm:size-5 stroke-[1.5]", isSelected ? "text-indigo-400" : "text-zinc-600")} />
                      <span className="truncate">{amenity.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sección: Galería */}
            <div className="pt-6 border-t border-white/5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider border-l-2 border-rose-500 pl-3">Activos Visuales</h3>
                <button 
                  type="button" 
                  onClick={() => appendPhoto({ url: '', alt: '', order: galleryFields.length + 1 })}
                  className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 bg-zinc-800/50 hover:bg-zinc-700/50 px-3 py-1.5 rounded-lg border border-white/5 transition-colors"
                >
                  <Plus className="size-3.5 stroke-[2]" /> Inyectar Nodo
                </button>
              </div>
              
              <div className="space-y-3">
                {galleryFields.length === 0 && (
                  <div className="p-6 rounded-2xl border border-dashed border-white/10 bg-zinc-900/20 text-center text-zinc-600 text-sm font-mono">
                    No se han registrado punteros de imagen.
                  </div>
                )}
                {galleryFields.map((field, index) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    key={field.id} 
                    className="flex gap-3 items-start bg-zinc-900/40 p-4 rounded-2xl border border-white/5 shadow-sm"
                  >
                    <div className="flex-1 space-y-3">
                      <input 
                        {...register(`gallery.${index}.url`)} 
                        placeholder="https://... (URL directa del activo)" 
                        className="w-full text-xs font-mono rounded-lg border border-white/10 bg-zinc-950/80 text-zinc-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-rose-500/50" 
                      />
                      <input 
                        {...register(`gallery.${index}.alt`)} 
                        placeholder="Meta-descripción (Alt text)" 
                        className="w-full text-xs rounded-lg border border-white/10 bg-zinc-950/80 text-zinc-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-rose-500/50" 
                      />
                    </div>
                    <button type="button" onClick={() => removePhoto(index)} className="p-2.5 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors border border-transparent hover:border-rose-500/20">
                      <Trash2 className="size-4 stroke-[2]" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>

          </form>
        </div>

        {/* FOOTER (Actions) */}
        <div className="p-6 border-t border-white/5 bg-zinc-950/80 rounded-b-[2rem] flex justify-end gap-3 z-20">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-6 py-2.5 text-sm font-bold text-zinc-400 hover:text-zinc-100 hover:bg-white/5 rounded-xl transition-all"
          >
            Abortar
          </button>
          <button 
            type="submit" 
            form="room-form" 
            disabled={isSaving}
            className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/25 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <><RefreshCw className="size-4 animate-spin" /> Procesando...</>
            ) : 'Compilar Unidad'}
          </button>
        </div>

      </motion.div>
    </div>
  );
};

// ==========================================
// BLOQUE 3: COMPONENTE CONTENEDOR (Máquina de Estados)
// ==========================================

export default function RoomEditorModal({ hotelId, initialData, onClose }: RoomEditorModalProps) {
  const [isSaving, setIsSaving] = useState(false);

  // Instanciación del Motor de Validaciones (Zod)
  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<RoomFormValues>({
    resolver: zodResolver(RoomSchema),
    defaultValues: initialData || {
      name: '',
      capacity: 2,
      price: 0,
      status: 'active',
      size_sqm: undefined,
      gallery: [],
      amenities: [],
      ical_import_url: '',
    }
  });

  const { fields: galleryFields, append: appendPhoto, remove: removePhoto } = useFieldArray({ control, name: "gallery" });
  const currentAmenities = watch('amenities') || [];

  // Lógica Forense: Mutador de estado binario para amenidades
  const toggleAmenity = (amenityId: string) => {
    const exists = currentAmenities.find(a => a.id === amenityId);
    if (exists) {
      setValue('amenities', currentAmenities.filter(a => a.id !== amenityId));
    } else {
      setValue('amenities', [...currentAmenities, { id: amenityId, isFree: true }]);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Placeholder temporal: En el futuro esto se conectará a tu store de Toasts
    alert("Enlace seguro copiado a la memoria del sistema.");
  };

  const onSubmitHandler = async (data: RoomFormValues) => {
    setIsSaving(true);
    try {
      const result = await saveRoomAction(hotelId, data, initialData?.id);
      if (result.success) {
        onClose(); 
      } else {
        console.error("Fallo de compilación en BD:", result.error);
        alert(`Error en la mutación: ${result.error}`);
      }
    } catch (error) {
      console.error("Excepción de Red:", error);
      alert("Excepción crítica al intentar enlazar con Supabase.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RoomEditorModalView 
      initialData={initialData}
      isSaving={isSaving}
      register={register}
      errors={errors}
      control={control}
      currentAmenities={currentAmenities}
      galleryFields={galleryFields}
      appendPhoto={appendPhoto}
      removePhoto={removePhoto}
      toggleAmenity={toggleAmenity}
      copyToClipboard={copyToClipboard}
      onSubmit={handleSubmit(onSubmitHandler)}
      onClose={onClose}
    />
  );
}