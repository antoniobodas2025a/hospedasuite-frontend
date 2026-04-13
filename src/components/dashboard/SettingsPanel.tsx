'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Save, MapPin, MessageCircle, ShieldAlert, Wifi, 
  Coffee, Car, Waves, Building, CreditCard, UploadCloud, 
  Users, Palette, Trash2, KeyRound 
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { saveSettingsAction, updateHotelProfileAction } from '@/app/actions/settings';
import { createStaffAction, deleteStaffAction } from '@/app/actions/staff';

const HOTEL_AMENITIES = [
  { id: 'wifi', label: 'Wi-Fi Gratis', icon: Wifi },
  { id: 'parking', label: 'Parqueadero', icon: Car },
  { id: 'pool', label: 'Piscina', icon: Waves },
  { id: 'breakfast', label: 'Desayuno Incluido', icon: Coffee },
];

// 🚨 FUSIÓN DE PROPS: Mantenemos el ID para OTA y recuperamos el Staff del código antiguo
interface SettingsPanelProps {
  hotelId: string;
  initialStaff?: any[];
}

export default function SettingsPanel({ hotelId, initialStaff = [] }: SettingsPanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'ota' | 'staff'>('general');
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null);
  const [localStaff, setLocalStaff] = useState(initialStaff);
  
  // Formulario unificado para evitar cruce de datos
  const { register, handleSubmit, setValue, watch, reset } = useForm();
  const supabase = createClient();

  const currentAmenities = watch('hotel_amenities') || [];
  const staffName = watch('staff_name') || '';
  const staffPin = watch('staff_pin') || '';

  useEffect(() => {
    async function loadHotelData() {
      const { data, error } = await supabase.from('hotels').select('*').eq('id', hotelId).single();
      if (data) {
        reset({
          id: data.id,
          name: data.name || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          tax_rate: data.tax_rate || 0,
          primary_color: data.primary_color || '#1e293b',
          wompi_public_key: data.wompi_public_key || '',
          wompi_integrity_secret: data.wompi_integrity_secret || '',
          description: data.description || '',
          whatsapp_number: data.whatsapp_number || '',
          google_maps_url: data.google_maps_url || '',
          cancellation_policy: data.cancellation_policy || '',
          hotel_amenities: data.hotel_amenities || [],
          cover_photo_url: data.cover_photo_url || ''
        });
        if (data.cover_photo_url) setCoverPhotoPreview(data.cover_photo_url);
      }
      setIsLoading(false);
    }
    loadHotelData();
  }, [hotelId, reset]);

  const toggleAmenity = (id: string) => {
    const exists = currentAmenities.includes(id);
    setValue('hotel_amenities', exists ? currentAmenities.filter((a: string) => a !== id) : [...currentAmenities, id]);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${hotelId}_${Date.now()}.${fileExt}`;
    const filePath = `covers/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage.from('hotel-media').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('hotel-media').getPublicUrl(filePath);
      setValue('cover_photo_url', publicUrl);
      setCoverPhotoPreview(publicUrl);
    } catch (error: any) {
      alert('Error subiendo imagen: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Lógica recuperada del Equipo (Staff)
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!staffName || !staffPin) return;
    
    setIsSaving(true);
    const formData = new FormData();
    formData.append('name', staffName);
    formData.append('role', 'Recepcionista');
    formData.append('pin_code', staffPin);

    const res = await createStaffAction(formData);
    if (res.success) {
      setLocalStaff([...localStaff, { id: Date.now().toString(), name: staffName, role: 'Recepcionista' }]);
      setValue('staff_name', '');
      setValue('staff_pin', '');
    } else alert('❌ Error: ' + res.error);
    setIsSaving(false);
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('¿Revocar acceso?')) return;
    const res = await deleteStaffAction(id);
    if (res.success) setLocalStaff(localStaff.filter(s => s.id !== id));
  };

  // Guardado Maestro (Enruta los datos según la pestaña activa)
  const onMasterSave = async (data: any) => {
    setIsSaving(true);
    try {
      if (activeTab === 'general') {
        const res = await saveSettingsAction(data);
        if (!res.success) throw new Error(res.error);
      } else if (activeTab === 'ota') {
        const res = await updateHotelProfileAction(hotelId, data);
        if (!res.success) throw new Error(res.error);
      } else if (activeTab === 'staff') {
        const resSettings = await saveSettingsAction(data); // Guarda color primario
        if (!resSettings.success) throw new Error(resSettings.error);
      }
      alert('✅ Bóveda actualizada con éxito');
    } catch (err: any) {
      alert('❌ Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500 font-bold animate-pulse">Desencriptando Bóveda...</div>;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-28 relative">
      
      {/* CABECERA Y TABS (Mobile First: Scroll Horizontal en móviles) */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] shadow-sm border border-slate-100">
        <div className="mb-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">Centro de Mando</h2>
          <p className="text-slate-500 text-sm mt-1">Administra operación, OTA y equipo.</p>
        </div>
        
        {/* Contenedor Swipeable para móviles */}
        <div className="flex overflow-x-auto hide-scrollbar bg-slate-50 p-1.5 rounded-2xl border border-slate-200 snap-x">
          <button 
            onClick={() => setActiveTab('general')}
            className={`snap-center flex-shrink-0 px-4 sm:px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'general' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Building size={16}/> Operación
          </button>
          <button 
            onClick={() => setActiveTab('ota')}
            className={`snap-center flex-shrink-0 px-4 sm:px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'ota' ? 'bg-hospeda-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <MapPin size={16}/> Perfil OTA
          </button>
          <button 
            onClick={() => setActiveTab('staff')}
            className={`snap-center flex-shrink-0 px-4 sm:px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'staff' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Users size={16}/> Equipo & Marca
          </button>
        </div>
      </div>

      <form id="master-settings-form" onSubmit={handleSubmit(onMasterSave)} className="animate-in fade-in duration-300">
        
        {/* ================= PESTAÑA 1: OPERACIÓN ================= */}
        <div className={activeTab === 'general' ? 'space-y-6' : 'hidden'}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4"><Building className="text-hospeda-600"/> Datos del Negocio</h3>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre</label>
                <input {...register('name')} autoComplete="off" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-hospeda-300 outline-none transition-all" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Teléfono</label>
                  <input {...register('phone')} autoComplete="off" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-hospeda-300 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email</label>
                  <input {...register('email')} type="email" autoComplete="off" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-hospeda-300 outline-none" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4"><CreditCard className="text-blue-600"/> Pasarela Wompi</h3>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Llave Pública</label>
                <input {...register('wompi_public_key')} type="password" placeholder="pub_prod_..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-300 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Secreto Integridad</label>
                <input {...register('wompi_integrity_secret')} type="password" placeholder="prod_integrity_..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-300 outline-none" />
              </div>
            </div>
          </div>
        </div>

        {/* ================= PESTAÑA 2: MOTOR OTA ================= */}
        <div className={activeTab === 'ota' ? 'grid grid-cols-1 lg:grid-cols-3 gap-6' : 'hidden'}>
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><MessageCircle className="text-hospeda-600"/> Vitrina OTA</h3>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Descripción (Atrapa al huésped)</label>
                <textarea {...register('description')} rows={3} autoComplete="off" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-hospeda-300 outline-none resize-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">WhatsApp</label>
                  <input {...register('whatsapp_number')} autoComplete="off" className="w-full p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-400 outline-none" placeholder="+57..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">URL Google Maps</label>
                  <input {...register('google_maps_url')} type="url" autoComplete="off" className="w-full p-4 bg-blue-50 border border-blue-100 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-400 outline-none" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Amenidades Visibles</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {HOTEL_AMENITIES.map((am) => {
                  const isSel = currentAmenities.includes(am.id);
                  const Icon = am.icon;
                  return (
                    <button type="button" key={am.id} onClick={() => toggleAmenity(am.id)} className={`p-4 rounded-xl border text-sm font-bold flex flex-col items-center gap-2 transition-all ${isSel ? 'border-hospeda-600 bg-hospeda-50 text-hospeda-900' : 'border-slate-200 bg-white text-slate-400'}`}>
                      <Icon size={20} className={isSel ? 'text-hospeda-600' : 'text-slate-300'} /> {am.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Foto Portada</h3>
              <div className="relative w-full h-40 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 overflow-hidden group">
                {coverPhotoPreview ? <img src={coverPhotoPreview} alt="Cover" className="w-full h-full object-cover" /> : <div className="flex flex-col items-center justify-center h-full text-slate-400"><UploadCloud size={24} className="mb-2"/><span className="text-xs font-bold">Subir foto</span></div>}
                <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
            </div>

            <div className="bg-slate-900 p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] shadow-sm">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4"><ShieldAlert className="text-amber-400"/> Políticas</h3>
              <textarea {...register('cancellation_policy')} rows={4} className="w-full p-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-400 outline-none resize-none" placeholder="Reglas de cancelación..." />
            </div>
          </div>
        </div>

        {/* ================= PESTAÑA 3: EQUIPO Y MARCA ================= */}
        <div className={activeTab === 'staff' ? 'space-y-6' : 'hidden'}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] shadow-sm border border-slate-100 space-y-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Palette className="text-hospeda-600"/> Identidad de Marca</h3>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Color Primario (Hexadecimal)</label>
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-xl border border-slate-200 shadow-inner shrink-0" style={{ backgroundColor: watch('primary_color') || '#000' }} />
                  <input {...register('primary_color')} className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 outline-none uppercase" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] shadow-sm border border-slate-100 space-y-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Users className="text-blue-600"/> Accesos POS (Recepcionistas)</h3>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-6">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre</label>
                  <input {...register('staff_name')} autoComplete="off" className="w-full p-3 bg-white border border-slate-200 rounded-lg text-slate-900 outline-none" placeholder="Ej. Ana" />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">PIN</label>
                  <input {...register('staff_pin')} maxLength={4} autoComplete="off" className="w-full p-3 bg-white border border-slate-200 rounded-lg text-slate-900 outline-none font-mono text-center tracking-widest" placeholder="1234" />
                </div>
                <div className="sm:col-span-3">
                  <button type="button" onClick={handleCreateStaff} className="w-full bg-slate-900 text-white font-bold h-[46px] rounded-lg hover:bg-black transition-colors">Añadir</button>
                </div>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                {localStaff.map((person) => (
                  <div key={person.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{person.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{person.role}</p>
                    </div>
                    <button type="button" onClick={() => handleDeleteStaff(person.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-md"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </form>

      {/* 🚨 MOBILE FIRST: Botón Maestro Sticky en la parte inferior */}
      <div className="fixed bottom-6 left-0 right-0 px-4 md:px-0 md:absolute md:bottom-auto md:left-auto md:right-8 md:top-6 z-50 pointer-events-none flex justify-center md:justify-end">
        <button 
          form="master-settings-form" 
          type="submit" 
          disabled={isSaving} 
          className="pointer-events-auto bg-hospeda-900 text-white px-8 py-4 md:py-3 rounded-full font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 w-[90%] md:w-auto border border-white/10"
        >
          {isSaving ? 'Encriptando...' : <><Save size={20} /> Guardar Bóveda</>}
        </button>
      </div>

    </div>
  );
}