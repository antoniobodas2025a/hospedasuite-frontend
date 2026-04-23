'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, MapPin, MessageCircle, ShieldAlert, Wifi, 
  Coffee, Car, Waves, Building, CreditCard, UploadCloud, 
  Users, Palette, Trash2, KeyRound, Globe, Smartphone, X, Check
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { saveSettingsAction, updateHotelProfileAction } from '@/app/actions/settings';
import { createStaffAction, deleteStaffAction } from '@/app/actions/staff';
import { cn } from '@/lib/utils';

// ==========================================
// BLOQUE 1: CONSTANTES Y TIPADOS
// ==========================================

const HOTEL_AMENITIES = [
  { id: 'wifi', label: 'Wi-Fi Gratis', icon: Wifi },
  { id: 'parking', label: 'Parqueadero', icon: Car },
  { id: 'pool', label: 'Piscina', icon: Waves },
  { id: 'breakfast', label: 'Desayuno', icon: Coffee },
];

interface SettingsPanelProps {
  hotelId: string;
  initialStaff?: any[];
}

interface SettingsPanelViewProps {
  activeTab: 'general' | 'ota' | 'staff';
  setActiveTab: (tab: 'general' | 'ota' | 'staff') => void;
  register: any;
  handleSubmit: any;
  onMasterSave: (data: any) => void;
  isSaving: boolean;
  coverPhotoPreview: string | null;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  currentAmenities: string[];
  toggleAmenity: (id: string) => void;
  localStaff: any[];
  handleCreateStaff: (e: React.FormEvent) => void;
  handleDeleteStaff: (id: string) => void;
  watch: any;
}

// ==========================================
// BLOQUE 2: COMPONENTE PRESENTACIONAL (UI Claude 2026)
// ==========================================

const SettingsPanelView: React.FC<SettingsPanelViewProps> = ({
  activeTab, setActiveTab, register, handleSubmit, onMasterSave, isSaving,
  coverPhotoPreview, handleFileUpload, currentAmenities, toggleAmenity,
  localStaff, handleCreateStaff, handleDeleteStaff, watch
}) => {
  return (
    <div className='w-full max-w-5xl mx-auto space-y-6 pb-32 font-poppins text-zinc-100'>
      
      {/* HEADER & NAV: Liquid Glass Navigation */}
      <div className="bg-zinc-900/40 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/5 shadow-2xl shadow-black/50 ring-1 ring-inset ring-white/10">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-zinc-50 tracking-tight flex items-center gap-3">
            <KeyRound className="text-indigo-400 size-7" /> Centro de Mando
          </h2>
          <p className="text-zinc-400 text-sm mt-1 font-lora italic">Administración de la bóveda operativa y parámetros de identidad.</p>
        </div>
        
        <div className="flex bg-zinc-950/60 p-1.5 rounded-2xl border border-white/5 gap-1 overflow-x-auto hide-scrollbar">
          {[
            { id: 'general', label: 'Operación', icon: Building },
            { id: 'ota', label: 'Perfil OTA', icon: Globe },
            { id: 'staff', label: 'Equipo & Marca', icon: Users }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 min-w-[140px] px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border",
                activeTab === tab.id 
                  ? "bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-500/20" 
                  : "bg-transparent text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-white/5"
              )}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <form id="master-settings-form" onSubmit={handleSubmit(onMasterSave)} className="space-y-6">
        
        {/* PESTAÑA 1: OPERACIÓN CORE */}
        <AnimatePresence mode="wait">
          {activeTab === 'general' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Datos de Identidad B2B */}
              <div className="bg-zinc-900/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 shadow-xl space-y-6">
                <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-3 mb-2">
                  <Building className="text-indigo-400 size-5" /> Datos del Negocio
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">Razón Social</label>
                    <input {...register('name')} className="w-full p-4 bg-zinc-950/50 border border-white/10 rounded-2xl text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">Contacto Tel.</label>
                      <input {...register('phone')} className="w-full p-4 bg-zinc-950/50 border border-white/10 rounded-2xl text-zinc-100 font-mono outline-none focus:ring-2 focus:ring-indigo-500/50" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">Email Corporativo</label>
                      <input {...register('email')} type="email" className="w-full p-4 bg-zinc-950/50 border border-white/10 rounded-2xl text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/50" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bóveda de Pagos (Wompi) */}
              <div className="bg-zinc-900/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6 ring-1 ring-white/5">
                <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-3 mb-2">
                  <CreditCard className="text-sky-400 size-5" /> Pasarela Wompi
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1 text-sky-500/60">Llave Pública (Production)</label>
                    <input {...register('wompi_public_key')} type="password" placeholder="pub_prod_..." className="w-full p-4 bg-zinc-950 border border-white/10 rounded-2xl text-zinc-100 font-mono outline-none focus:ring-2 focus:ring-sky-500/50 shadow-inner" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1 text-sky-500/60">Secreto Integridad</label>
                    <input {...register('wompi_integrity_secret')} type="password" placeholder="prod_integrity_..." className="w-full p-4 bg-zinc-950 border border-white/10 rounded-2xl text-zinc-100 font-mono outline-none focus:ring-2 focus:ring-sky-500/50 shadow-inner" />
                  </div>
                </div>
              </div>

            </motion.div>
          )}

          {/* PESTAÑA 2: MOTOR OTA */}
          {activeTab === 'ota' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-zinc-900/40 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 shadow-xl space-y-6">
                  <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-3"><MessageCircle className="text-indigo-400 size-5"/> Vitrina Comercial</h3>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">Narrativa de Propiedad</label>
                    <textarea {...register('description')} rows={4} className="w-full p-4 bg-zinc-950/50 border border-white/10 rounded-2xl text-zinc-200 outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none shadow-inner" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-[0.2em] ml-1">Venta Directa (WA)</label>
                      <input {...register('whatsapp_number')} className="w-full p-4 bg-zinc-950/50 border border-white/10 rounded-2xl text-zinc-100 font-mono outline-none focus:ring-2 focus:ring-emerald-500/50" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-sky-500/70 uppercase tracking-[0.2em] ml-1">Geolocalización Maps</label>
                      <input {...register('google_maps_url')} className="w-full p-4 bg-zinc-950/50 border border-white/10 rounded-2xl text-zinc-100 text-xs outline-none focus:ring-2 focus:ring-sky-500/50" />
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900/40 p-8 rounded-[2.5rem] border border-white/5 shadow-xl">
                  <h3 className="text-lg font-bold text-zinc-100 mb-6">Matriz de Amenidades</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {HOTEL_AMENITIES.map((am) => {
                      const isSel = currentAmenities.includes(am.id);
                      const Icon = am.icon;
                      return (
                        <button type="button" key={am.id} onClick={() => toggleAmenity(am.id)} className={cn(
                          "p-5 rounded-2xl border text-[10px] font-bold uppercase tracking-widest flex flex-col items-center gap-3 transition-all active:scale-95",
                          isSel ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300 shadow-lg shadow-indigo-500/10" : "border-white/5 bg-zinc-950/30 text-zinc-600 hover:bg-zinc-800"
                        )}>
                          <Icon size={20} className={isSel ? 'text-indigo-400' : 'text-zinc-700'} /> {am.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-zinc-900/40 p-8 rounded-[2.5rem] border border-white/5 shadow-xl">
                  <h3 className="text-lg font-bold text-zinc-100 mb-6 flex items-center gap-3">
                    <UploadCloud className="text-indigo-400 size-5" /> Multimedia
                  </h3>
                  <div className="relative w-full h-48 bg-zinc-950 rounded-2xl border-2 border-dashed border-white/10 overflow-hidden group hover:border-indigo-500/30 transition-all">
                    {coverPhotoPreview ? (
                      <img src={coverPhotoPreview} alt="Cover" className="w-full h-full object-cover opacity-80" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                        <UploadCloud size={32} className="mb-2 opacity-20"/>
                        <span className="text-[10px] font-bold uppercase tracking-widest">Inyectar Foto</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="text-xs font-bold text-white uppercase tracking-widest">Cambiar Imagen</span>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-950/80 p-8 rounded-[2.5rem] border border-amber-500/20 shadow-2xl">
                  <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-3 mb-6"><ShieldAlert className="text-amber-500/70 size-5"/> Protocolos Legales</h3>
                  <textarea {...register('cancellation_policy')} rows={5} className="w-full p-4 bg-zinc-900 border border-white/5 rounded-2xl text-zinc-400 text-xs italic outline-none focus:ring-1 focus:ring-amber-500/50 resize-none" placeholder="Defina aquí las reglas de cancelación y reembolsos..." />
                </div>
              </div>
            </motion.div>
          )}

          {/* PESTAÑA 3: EQUIPO & MARCA */}
          {activeTab === 'staff' && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Branding Engine */}
              <div className="bg-zinc-900/40 p-8 rounded-[2.5rem] border border-white/5 shadow-xl space-y-8">
                <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-3"><Palette className="text-indigo-400 size-5"/> Identidad de Marca</h3>
                <div className="bg-zinc-950/50 p-6 rounded-3xl border border-white/5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-4">Vector de Color Primario</label>
                  <div className="flex gap-4 items-center">
                    <div className="w-16 h-16 rounded-2xl border border-white/10 shadow-2xl shrink-0" style={{ backgroundColor: watch('primary_color') || '#6366f1' }} />
                    <div className="flex-1">
                      <input {...register('primary_color')} className="w-full p-4 bg-zinc-900 border border-white/10 rounded-xl font-mono text-indigo-400 outline-none uppercase text-center text-lg font-bold" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Staff Management (POS Access) */}
              <div className="bg-zinc-900/40 p-8 rounded-[2.5rem] border border-white/5 shadow-xl flex flex-col">
                <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-3 mb-6"><Users className="text-sky-400 size-5"/> Credenciales POS</h3>
                
                <div className="bg-zinc-950 p-5 rounded-3xl border border-white/5 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end mb-6">
                  <div className="sm:col-span-6 space-y-1">
                    <label className="text-[9px] font-bold text-zinc-600 uppercase ml-2">Nombre Operario</label>
                    <input {...register('staff_name')} className="w-full p-3 bg-zinc-900 border border-white/10 rounded-xl text-zinc-100 outline-none text-sm font-bold" placeholder="Ej. Alejandra" />
                  </div>
                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[9px] font-bold text-zinc-600 uppercase ml-2 text-center block">PIN (4-D)</label>
                    <input {...register('staff_pin')} maxLength={4} className="w-full p-3 bg-zinc-900 border border-white/10 rounded-xl text-zinc-100 font-mono text-center tracking-[0.5em] outline-none text-sm" placeholder="0000" />
                  </div>
                  <div className="sm:col-span-3">
                    <button type="button" onClick={handleCreateStaff} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-[46px] rounded-xl transition-all shadow-lg active:scale-95 text-xs uppercase">Añadir</button>
                  </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
                  <AnimatePresence>
                    {localStaff.map((person) => (
                      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} key={person.id} className="flex justify-between items-center p-4 bg-zinc-950/80 border border-white/5 rounded-2xl group">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500">{person.name.charAt(0)}</div>
                          <div>
                            <p className="text-sm font-bold text-zinc-100">{person.name}</p>
                            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Vector: {person.role}</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => handleDeleteStaff(person.id)} className="p-2 text-zinc-700 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"><Trash2 size={16} /></button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {/* FIXED FOOTER (Command Control) */}
      <div className="fixed bottom-8 left-0 right-0 px-6 z-50 pointer-events-none">
        <div className="max-w-5xl mx-auto flex justify-center md:justify-end">
          <button 
            form="master-settings-form" 
            type="submit" 
            disabled={isSaving} 
            className="pointer-events-auto bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-5 rounded-[2rem] font-bold shadow-[0_20px_50px_rgba(79,70,229,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 ring-1 ring-white/20"
          >
            {isSaving ? (
              <div className="flex items-center gap-2">
                <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Sincronizando Bóveda...</span>
              </div>
            ) : (
              <>
                <Save size={20} strokeWidth={2.5} />
                <span>Compilar y Guardar Cambios</span>
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
};

// ==========================================
// BLOQUE 3: COMPONENTE CONTENEDOR (Máquina de Estados)
// ==========================================

export default function SettingsPanel({ hotelId, initialStaff = [] }: SettingsPanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'ota' | 'staff'>('general');
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null);
  const [localStaff, setLocalStaff] = useState(initialStaff);
  
  const { register, handleSubmit, setValue, watch, reset } = useForm();
  const supabase = createClient();

  const currentAmenities = watch('hotel_amenities') || [];
  const staffName = watch('staff_name') || '';
  const staffPin = watch('staff_pin') || '';

  // Carga Forense de Datos
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
          primary_color: data.primary_color || '#6366f1',
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
  }, [hotelId, reset, supabase]);

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
      alert('Fallo Crítico en Storage: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

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
    } else alert('Error al instanciar staff: ' + res.error);
    setIsSaving(false);
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('¿Confirmar revocación de acceso para este nodo?')) return;
    const res = await deleteStaffAction(id);
    if (res.success) setLocalStaff(localStaff.filter(s => s.id !== id));
  };

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
        const resSettings = await saveSettingsAction(data); 
        if (!resSettings.success) throw new Error(resSettings.error);
      }
      alert('Bóveda Sincronizada con el Nodo Central.');
    } catch (err: any) {
      alert('Violación de Escritura: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
      <div className="size-12 border-4 border-zinc-800 border-t-indigo-500 rounded-full animate-spin" />
      <p className="text-zinc-500 font-mono text-sm animate-pulse tracking-widest uppercase">Desencriptando Bóveda...</p>
    </div>
  );

  return (
    <SettingsPanelView 
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      register={register}
      handleSubmit={handleSubmit}
      onMasterSave={onMasterSave}
      isSaving={isSaving}
      coverPhotoPreview={coverPhotoPreview}
      handleFileUpload={handleFileUpload}
      currentAmenities={currentAmenities}
      toggleAmenity={toggleAmenity}
      localStaff={localStaff}
      handleCreateStaff={handleCreateStaff}
      handleDeleteStaff={handleDeleteStaff}
      watch={watch}
    />
  );
}