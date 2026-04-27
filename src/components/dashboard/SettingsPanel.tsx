'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, MessageCircle, ShieldAlert, Wifi, 
  Coffee, Car, Waves, Building, CreditCard, UploadCloud, 
  Users, Palette, Trash2, KeyRound, Globe, Check,
  AlertOctagon, RefreshCcw
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { saveSettingsAction, updateHotelProfileAction } from '@/app/actions/settings';
import { createStaffAction, deleteStaffAction } from '@/app/actions/staff';
import { executeCleanSlateAction } from '@/app/actions/seeding';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const HOTEL_AMENITIES = [
  { id: 'wifi', label: 'Wi-Fi Gratis', icon: Wifi },
  { id: 'parking', label: 'Parqueadero', icon: Car },
  { id: 'pool', label: 'Piscina', icon: Waves },
  { id: 'breakfast', label: 'Desayuno', icon: Coffee },
];

interface SettingsPanelProps {
  initialData: any;
  initialStaff: any[];
}

export default function SettingsPanel({ initialData, initialStaff = [] }: SettingsPanelProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'ota' | 'staff'>('general');
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(initialData?.cover_photo_url || null);
  const [localStaff, setLocalStaff] = useState(initialStaff);
  
  const router = useRouter();
  const supabase = createClient();
  const hotelId = initialData.id;

  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: initialData
  });

  const currentAmenities = watch('hotel_amenities') || [];
  const staffName = watch('staff_name') || '';
  const staffPin = watch('staff_pin') || '';
  const primaryColor = watch('primary_color') || '#6366f1';

  const toggleAmenity = (id: string) => {
    const exists = currentAmenities.includes(id);
    setValue('hotel_amenities', exists 
      ? currentAmenities.filter((a: string) => a !== id) 
      : [...currentAmenities, id]
    );
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsSaving(true);
    const filePath = `covers/${hotelId}_${Date.now()}.${file.name.split('.').pop()}`;
    try {
      const { error: uploadError } = await supabase.storage.from('hotel-media').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('hotel-media').getPublicUrl(filePath);
      setValue('cover_photo_url', publicUrl);
      setCoverPhotoPreview(publicUrl);
    } catch (error: any) {
      alert('Error en Storage: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!staffName || !staffPin) return;
    setIsSaving(true);
    const formData = new FormData();
    formData.append('hotel_id', hotelId);
    formData.append('name', staffName);
    formData.append('role', 'Recepcionista');
    formData.append('pin_code', staffPin);
    const res = await createStaffAction(formData);
    if (res.success) {
      setLocalStaff([...localStaff, { id: Math.random().toString(), name: staffName, role: 'Recepcionista' }]);
      setValue('staff_name', '');
      setValue('staff_pin', '');
    } else alert('Error en Staff: ' + res.error);
    setIsSaving(false);
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('¿Revocar acceso?')) return;
    const res = await deleteStaffAction(id);
    if (res.success) setLocalStaff(localStaff.filter(s => s.id !== id));
  };

  const onMasterSave = async (data: any) => {
    setIsSaving(true);
    try {
      let res;
      if (activeTab === 'general' || activeTab === 'staff') res = await saveSettingsAction(data);
      else res = await updateHotelProfileAction(hotelId, data);
      if (!res.success) throw new Error(res.error);
      alert('✅ Cambios aplicados.');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCleanSlate = async () => {
    if (!confirm("☢️ NUCLEAR: Se borrarán habitaciones, reservas y pagos. ¿Proceder?")) return;
    setIsCleaning(true);
    const res = await executeCleanSlateAction(hotelId);
    if (res.success) {
      alert("✅ Reseteo completado.");
      router.push('/software/onboarding');
      router.refresh();
    } else {
      alert("❌ Error: " + res.error);
      setIsCleaning(false);
    }
  };

  return (
    <div className='w-full max-w-7xl mx-auto space-y-12 pb-40 font-poppins text-zinc-100 p-8'>
      <div className="bg-zinc-900/40 backdrop-blur-2xl p-8 rounded-[3rem] border border-white/5 shadow-2xl ring-1 ring-white/10">
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-zinc-50 tracking-tight flex items-center gap-3">
            <KeyRound className="text-indigo-400 size-8" /> Centro de Mando
          </h2>
          <p className="text-zinc-400 text-sm mt-2 font-lora italic">Administración operativa del tenant.</p>
        </div>
        <div className="flex bg-zinc-950/60 p-2 rounded-3xl border border-white/5 gap-2">
          {[{ id: 'general', label: 'Operación', icon: Building }, { id: 'ota', label: 'Perfil OTA', icon: Globe }, { id: 'staff', label: 'Equipo', icon: Users }].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={cn("flex-1 px-8 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border", activeTab === tab.id ? "bg-indigo-600 text-white border-indigo-400 shadow-lg" : "bg-transparent text-zinc-500 border-transparent hover:text-zinc-300")}>
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <form id="master-settings-form" onSubmit={handleSubmit(onMasterSave)} className="space-y-12">
        <AnimatePresence mode="wait">
          {activeTab === 'general' && (
            <motion.div key="gen" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-zinc-900/40 p-10 rounded-[3rem] border border-white/5 shadow-xl space-y-8">
                <h3 className="text-xl font-bold flex items-center gap-3"><Building className="text-indigo-400" /> Negocio</h3>
                <div className="space-y-6">
                  <input {...register('name')} placeholder="Nombre" className="w-full p-5 bg-zinc-950 border border-white/10 rounded-2xl" />
                  <div className="grid grid-cols-2 gap-6">
                    <input {...register('phone')} placeholder="Tel" className="p-5 bg-zinc-950 border border-white/10 rounded-2xl" />
                    <input {...register('email')} placeholder="Email" className="p-5 bg-zinc-950 border border-white/10 rounded-2xl" />
                  </div>
                </div>
              </div>
              <div className="bg-zinc-900/60 p-10 rounded-[3rem] border border-white/5 shadow-2xl space-y-8">
                <h3 className="text-xl font-bold flex items-center gap-3"><CreditCard className="text-sky-400" /> Wompi</h3>
                <div className="space-y-6">
                  <input {...register('wompi_public_key')} type="password" placeholder="Public Key" className="w-full p-5 bg-zinc-950 border border-white/10 rounded-2xl" />
                  <input {...register('wompi_integrity_secret')} type="password" placeholder="Integrity Secret" className="w-full p-5 bg-zinc-950 border border-white/10 rounded-2xl" />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'ota' && (
            <motion.div key="ota" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-zinc-900/40 p-10 rounded-[3rem] border border-white/5 shadow-xl space-y-6">
                  <h3 className="text-xl font-bold flex items-center gap-3"><MessageCircle className="text-indigo-400"/> Vitrina</h3>
                  <textarea {...register('description')} rows={5} className="w-full p-6 bg-zinc-950/50 border border-white/10 rounded-3xl" />
                  <div className="grid grid-cols-2 gap-6">
                    <input {...register('whatsapp_number')} placeholder="WA" className="p-5 bg-zinc-950 border border-white/10 rounded-2xl" />
                    <input {...register('google_maps_url')} placeholder="Maps" className="p-5 bg-zinc-950 border border-white/10 rounded-2xl text-xs" />
                  </div>
                </div>
                <div className="bg-zinc-900/40 p-10 rounded-[3rem] border border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {HOTEL_AMENITIES.map((am) => (
                    <button type="button" key={am.id} onClick={() => toggleAmenity(am.id)} className={cn("p-6 rounded-3xl border text-[10px] font-bold uppercase flex flex-col items-center gap-4 transition-all", currentAmenities.includes(am.id) ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-300" : "border-white/5 bg-zinc-950/30 text-zinc-600")}>
                      <am.icon size={24} /> {am.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-8">
                <div className="bg-zinc-900/40 p-8 rounded-[3rem] border border-white/5">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-3"><UploadCloud className="text-indigo-400" /> Foto</h3>
                  <div className="relative w-full h-56 bg-zinc-950 rounded-3xl border-2 border-dashed border-white/10 overflow-hidden group">
                    {coverPhotoPreview ? <img src={coverPhotoPreview} alt="C" className="w-full h-full object-cover opacity-60" /> : <div className="flex h-full items-center justify-center opacity-20"><UploadCloud size={40}/></div>}
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>
                <div className="bg-zinc-950/80 p-8 rounded-[3rem] border border-amber-500/20 text-zinc-400 text-xs italic">
                  <h3 className="text-xl font-bold flex items-center gap-3 mb-6 text-zinc-100"><ShieldAlert className="text-amber-500/70"/> Protocolos</h3>
                  <textarea {...register('cancellation_policy')} rows={6} className="w-full bg-transparent outline-none resize-none" placeholder="Reglas..." />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'staff' && (
            <motion.div key="stf" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-zinc-900/40 p-10 rounded-[3rem] border border-white/5 space-y-8">
                <h3 className="text-xl font-bold flex items-center gap-3"><Palette className="text-indigo-400"/> Marca</h3>
                <div className="bg-zinc-950 p-8 rounded-[2rem] flex gap-6 items-center">
                  <div className="size-20 rounded-3xl shadow-2xl" style={{ backgroundColor: primaryColor }} />
                  <input {...register('primary_color')} className="flex-1 p-4 bg-zinc-900 border border-white/10 rounded-xl text-xl font-bold text-indigo-400 text-center" />
                </div>
              </div>
              <div className="bg-zinc-900/40 p-10 rounded-[3rem] border border-white/5 flex flex-col">
                <h3 className="text-xl font-bold flex items-center gap-3 mb-8"><Users className="text-sky-400"/> Equipo</h3>
                <div className="bg-zinc-950 p-6 rounded-[2rem] border border-white/5 grid grid-cols-12 gap-4 items-end mb-8">
                  <div className="col-span-7"><input {...register('staff_name')} className="w-full p-4 bg-zinc-900 border border-white/10 rounded-xl" placeholder="Nombre" /></div>
                  <div className="col-span-3"><input {...register('staff_pin')} maxLength={4} className="w-full p-4 bg-zinc-900 border border-white/10 rounded-xl font-mono text-center" placeholder="PIN" /></div>
                  <div className="col-span-2"><button type="button" onClick={handleCreateStaff} className="w-full bg-indigo-600 h-[56px] rounded-xl flex items-center justify-center"><Check size={24}/></button></div>
                </div>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {localStaff.map((p) => (
                    <div key={p.id} className="flex justify-between items-center p-5 bg-zinc-950/80 border border-white/5 rounded-3xl hover:bg-zinc-950 transition-all">
                      <div className="flex items-center gap-4"><div className="size-10 rounded-xl bg-zinc-800 flex items-center justify-center text-xs font-bold">{p.name.charAt(0)}</div><div><p className="font-bold">{p.name}</p><p className="text-[10px] opacity-50 uppercase tracking-tighter">{p.role}</p></div></div>
                      <button type="button" onClick={() => handleDeleteStaff(p.id)} className="p-3 text-zinc-700 hover:text-rose-400 hover:bg-rose-500/10 rounded-2xl"><Trash2 size={20}/></button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      <section className="mt-24 pt-12 border-t border-red-500/20">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-red-500/10 rounded-2xl text-red-500"><AlertOctagon size={28}/></div>
          <div><h3 className="text-red-500 font-bold text-2xl leading-none">Zona de Peligro</h3><p className="text-white/20 text-xs mt-1 uppercase tracking-widest font-bold">GTM Tools & Factory Reset</p></div>
        </div>
        <div className="bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 rounded-[3.5rem] p-12 flex flex-col lg:flex-row items-center justify-between gap-10 transition-all hover:bg-red-500/[0.12]">
          <div className="max-w-2xl text-center lg:text-left"><h4 className="text-white font-bold text-2xl mb-3">Ejecutar Clean Slate</h4><p className="text-white/50 text-sm leading-relaxed italic">Borra irrevocablemente el Ledger financiero y las habitaciones para transicionar de demostración a operación real.</p></div>
          <button type="button" onClick={handleCleanSlate} disabled={isCleaning} className="w-full lg:w-auto min-w-[300px] px-12 py-6 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-[2rem] font-bold transition-all duration-500 border border-red-500/30 flex items-center justify-center gap-4 shadow-2xl disabled:opacity-30">
            {isCleaning ? <RefreshCcw className="animate-spin" size={24}/> : <Trash2 size={24}/>}
            <span className="uppercase tracking-tighter text-xl">{isCleaning ? "Purgando..." : "Resetear y Wizard"}</span>
          </button>
        </div>
      </section>

      <div className="fixed bottom-10 left-0 right-0 px-8 z-50 pointer-events-none">
        <div className="max-w-7xl mx-auto flex justify-center lg:justify-end">
          <button form="master-settings-form" type="submit" disabled={isSaving || isCleaning} className="pointer-events-auto bg-indigo-600 hover:bg-indigo-500 text-white px-12 py-6 rounded-[2.5rem] font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4 disabled:opacity-50 ring-1 ring-white/20">
            {isSaving ? <RefreshCcw className="animate-spin" size={24}/> : <Save size={24}/>}
            <span className="text-lg uppercase tracking-tight">Sincronizar Bóveda</span>
          </button>
        </div>
      </div>
    </div>
  );
}