'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RoomSchema, RoomFormValues } from '@/lib/validations/inventory';
import { saveRoomAction } from '@/app/actions/inventory';
import { 
  X, Plus, Trash2, Wifi, Tv, Wind, Bath, 
  Car, Coffee, Globe, Copy, RefreshCw 
} from 'lucide-react';

const AVAILABLE_AMENITIES = [
  { id: 'wifi', label: 'Wi-Fi', icon: Wifi },
  { id: 'tv', label: 'Smart TV', icon: Tv },
  { id: 'ac', label: 'Aire Acondicionado', icon: Wind },
  { id: 'hot_water', label: 'Agua Caliente', icon: Bath },
  { id: 'parking', label: 'Parqueadero', icon: Car },
  { id: 'coffee', label: 'Cafetera', icon: Coffee },
];

interface Props {
  hotelId: string;
  initialData?: any; 
  onClose: () => void;
}

export default function RoomEditorModal({ hotelId, initialData, onClose }: Props) {
  const [isSaving, setIsSaving] = useState(false);

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
    // Nota: Sustituir alert por un componente de Toast corporativo en producción
    alert("Enlace copiado al portapapeles");
  };

  const onSubmit = async (data: RoomFormValues) => {
    setIsSaving(true);
    const result = await saveRoomAction(hotelId, data, initialData?.id);
    setIsSaving(false);
    
    if (result.success) {
      onClose(); 
    } else {
      alert("Error: " + result.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        
        <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-2xl font-bold text-slate-800">
            {initialData ? 'Editar Habitación' : 'Nueva Habitación'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="room-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Información Básica */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-4">Información Básica</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                  <input {...register('name')} className="w-full rounded-xl border-slate-200 bg-white text-slate-900" placeholder="Ej. Suite Presidencial" />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Precio por Noche (COP)</label>
                  <input type="number" {...register('price', { valueAsNumber: true })} className="w-full rounded-xl border-slate-200 bg-white text-slate-900" />
                  {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Capacidad Máxima</label>
                  <input type="number" {...register('capacity', { valueAsNumber: true })} className="w-full rounded-xl border-slate-200 bg-white text-slate-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                  <select {...register('status')} className="w-full rounded-xl border-slate-200 bg-white text-slate-900">
                    <option value="active">Activa</option>
                    <option value="maintenance">Mantenimiento</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 📡 MÓDULO DE CHANNEL MANAGER */}
            <div className="border-t border-slate-100 pt-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Globe className="w-5 h-5 text-blue-600" />
                Sincronización de Canales (iCal)
              </h3>

              <div className="space-y-4">
                {/* Exportación */}
                {initialData?.ical_export_token && (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <label className="text-xs font-bold text-blue-800 uppercase tracking-wider block mb-2">
                      Enlace de Exportación (Hacia Booking/Airbnb)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/ical/export/${initialData.ical_export_token}`}
                        className="flex-1 bg-white border border-blue-200 rounded-lg px-3 py-2 text-[10px] font-mono text-slate-600 select-all"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`${window.location.origin}/api/ical/export/${initialData.ical_export_token}`)}
                        className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                    <p className="text-[10px] text-blue-600 mt-2 italic">
                      🛡️ Este enlace es privado. Úselo para sincronizar con calendarios externos.
                    </p>
                  </div>
                )}

                {/* Importación */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                    Enlace de Importación (Desde OTA)
                  </label>
                  <input
                    type="url"
                    {...register('ical_import_url')}
                    placeholder="https://calendar.google.com/.../basic.ics"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-hospeda-600"
                  />
                  {errors.ical_import_url && <p className="text-red-500 text-xs mt-1">{errors.ical_import_url.message}</p>}
                </div>

                {initialData?.last_sync_at && (
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 px-1">
                    <RefreshCw size={12} className="animate-spin-slow text-blue-500" />
                    Última sincronización automática: {new Date(initialData.last_sync_at).toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            {/* Amenidades */}
            <div className="border-t border-slate-100 pt-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Amenidades</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {AVAILABLE_AMENITIES.map((amenity) => {
                  const isSelected = currentAmenities.some(a => a.id === amenity.id);
                  const Icon = amenity.icon;
                  return (
                    <button
                      type="button"
                      key={amenity.id}
                      onClick={() => toggleAmenity(amenity.id)}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                        isSelected 
                          ? 'border-hospeda-600 bg-hospeda-50 text-hospeda-900 ring-1 ring-hospeda-600' 
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <Icon size={18} className={isSelected ? 'text-hospeda-600' : 'text-slate-400'} />
                      {amenity.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Galería */}
            <div className="border-t border-slate-100 pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">Galería de Fotos</h3>
                <button 
                  type="button" 
                  onClick={() => appendPhoto({ url: '', alt: '', order: galleryFields.length + 1 })}
                  className="flex items-center gap-1 text-sm font-bold text-hospeda-600 hover:text-hospeda-800"
                >
                  <Plus size={16} /> Agregar Foto
                </button>
              </div>
              <div className="space-y-3">
                {galleryFields.map((field, index) => (
                  <div key={field.id} className="flex gap-3 items-start bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex-1 space-y-3">
                      <input 
                        {...register(`gallery.${index}.url`)} 
                        placeholder="URL de la imagen" 
                        className="w-full text-sm rounded-lg border-slate-200 bg-white" 
                      />
                      <input 
                        {...register(`gallery.${index}.alt`)} 
                        placeholder="Descripción corta" 
                        className="w-full text-sm rounded-lg border-slate-200 bg-white" 
                      />
                    </div>
                    <button type="button" onClick={() => removePhoto(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </form>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">
            Cancelar
          </button>
          <button 
            type="submit" 
            form="room-form" 
            disabled={isSaving}
            className="px-5 py-2.5 text-sm font-bold text-white bg-hospeda-900 hover:bg-black rounded-xl transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Guardando...' : 'Guardar Habitación'}
          </button>
        </div>

      </div>
    </div>
  );
}