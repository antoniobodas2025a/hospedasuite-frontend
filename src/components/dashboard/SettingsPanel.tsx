'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, MessageCircle, ShieldAlert, Wifi, 
  Coffee, Car, Waves, Building, CreditCard, UploadCloud, 
  Users, Palette, Trash2, KeyRound, Globe, Check, Plus,
  AlertOctagon, RefreshCcw, TrendingUp, Clock, Eye
} from 'lucide-react';
import { saveSettingsAction, updateHotelProfileAction, uploadOptimizedImageAction } from '@/app/actions/settings';
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
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(initialData?.main_image_url || null);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>(initialData?.gallery_urls || []);
  const [localStaff, setLocalStaff] = useState(initialStaff);
  
  const router = useRouter();
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
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await uploadOptimizedImageAction(formData, 'covers');
      if (!result.success || !result.url) throw new Error(result.error || 'Sin URL');
      setValue('cover_photo_url', result.url);
      setCoverPhotoPreview(result.url);
    } catch (error: any) {
      alert('Error al subir imagen: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMainImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await uploadOptimizedImageAction(formData, 'hero');
      if (!result.success || !result.url) throw new Error(result.error || 'Sin URL');
      setValue('main_image_url', result.url);
      setMainImagePreview(result.url);
    } catch (error: any) {
      alert('Error al subir imagen (Hero): ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGalleryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setIsSaving(true);
    try {
      const newUrls: string[] = [...galleryPreviews];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        const result = await uploadOptimizedImageAction(formData, 'gallery');
        if (!result.success || !result.url) throw new Error(result.error || 'Sin URL');
        newUrls.push(result.url);
      }
      setGalleryPreviews(newUrls);
      setValue('gallery_urls', newUrls);
    } catch (error: any) {
      alert('Error al subir galería: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const removeGalleryImage = (index: number) => {
    const updated = galleryPreviews.filter((_, i) => i !== index);
    setGalleryPreviews(updated);
    setValue('gallery_urls', updated);
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
            <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={cn("flex-1 px-8 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border", activeTab === tab.id ? "bg-indigo-600 text-white border-indigo-400 shadow-lg" : "bg-transparent text-zinc-500 border-transparent hover:text-zinc-300")}>
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
                {/* HERO IMAGE — La foto principal del hotel */}
                <div className="bg-zinc-900/40 p-8 rounded-[3rem] border border-white/5">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-3"><UploadCloud className="text-indigo-400" /> Foto Hero</h3>
                  <p className="text-[10px] text-zinc-500 mb-4 uppercase tracking-widest">Imagen principal del hotel en la página pública</p>
                  <div className="relative w-full h-48 bg-zinc-950 rounded-3xl border-2 border-dashed border-white/10 overflow-hidden group">
                    {mainImagePreview ? <img src={mainImagePreview} alt="Hero" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" /> : <div className="flex flex-col h-full items-center justify-center opacity-20"><UploadCloud size={40}/><span className="text-[9px] mt-2 font-bold uppercase">Click para subir</span></div>}
                    <input type="file" accept="image/*" onChange={handleMainImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>

                {/* COVER PHOTO — Vista secundaria */}
                <div className="bg-zinc-900/40 p-8 rounded-[3rem] border border-white/5">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-3"><UploadCloud className="text-sky-400" /> Foto Secundaria</h3>
                  <div className="relative w-full h-40 bg-zinc-950 rounded-3xl border-2 border-dashed border-white/10 overflow-hidden group">
                    {coverPhotoPreview ? <img src={coverPhotoPreview} alt="C" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" /> : <div className="flex h-full items-center justify-center opacity-20"><UploadCloud size={40}/></div>}
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>

                {/* GALLERY — Múltiples fotos del hotel */}
                <div className="bg-zinc-900/40 p-8 rounded-[3rem] border border-white/5">
                  <h3 className="text-xl font-bold mb-2 flex items-center gap-3"><UploadCloud className="text-emerald-400" /> Galeria del Hotel</h3>
                  <p className="text-[10px] text-zinc-500 mb-4 uppercase tracking-widest">{galleryPreviews.length}/8 fotos — Historial visual</p>
                  {galleryPreviews.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {galleryPreviews.map((url, i) => (
                        <div key={i} className="relative h-24 rounded-xl overflow-hidden border border-white/10 group">
                          <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeGalleryImage(i)} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Trash2 className="size-4 text-rose-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {galleryPreviews.length < 8 && (
                    <label className="flex flex-col items-center justify-center w-full h-20 bg-zinc-950 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group">
                      <Plus className="text-zinc-600 group-hover:text-emerald-400 mb-1" size={18} />
                      <span className="text-[9px] text-zinc-500 font-bold uppercase">Agregar fotos</span>
                      <input type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="hidden" />
                    </label>
                  )}
                </div>

                {/* RECENT ACTIVITY — Social proof control */}
                <div className="bg-zinc-900/40 p-8 rounded-[3rem] border border-white/5 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold flex items-center gap-3"><TrendingUp className="text-amber-400" /> Actividad Reciente</h3>
                    <button
                      type="button"
                      onClick={() => setValue('show_recent_activity', !watch('show_recent_activity'))}
                      className={cn(
                        "relative w-12 h-7 rounded-full transition-all",
                        watch('show_recent_activity') ? "bg-emerald-500" : "bg-zinc-700"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0.5 size-6 rounded-full bg-white shadow transition-all",
                        watch('show_recent_activity') ? "left-5" : "left-0.5"
                      )} />
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Indicadores de urgencia social en la pagina publica</p>
                  
                  {watch('show_recent_activity') && (
                    <div className="space-y-3">
                      {(watch('recent_activity_messages') || [
                        { icon: 'TrendingUp', text: '3 reservas en las ultimas 24 horas', color: 'text-emerald-600' },
                        { icon: 'Clock', text: '2 personas estan viendo esta propiedad ahora', color: 'text-amber-600' },
                      ]).map((msg: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-zinc-950/50 rounded-2xl border border-white/5">
                          <div className="size-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                            {msg.icon === 'TrendingUp' ? <TrendingUp size={14} className="text-emerald-400" /> : <Clock size={14} className="text-amber-400" />}
                          </div>
                          <input
                            value={msg.text}
                            onChange={(e) => {
                              const msgs = [...(watch('recent_activity_messages') || [])];
                              msgs[i] = { ...msg, text: e.target.value };
                              setValue('recent_activity_messages', msgs);
                            }}
                            className="flex-1 bg-transparent text-xs text-zinc-300 outline-none"
                            placeholder="Mensaje de actividad..."
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const msgs = (watch('recent_activity_messages') || []).filter((_: any, idx: number) => idx !== i);
                              setValue('recent_activity_messages', msgs);
                            }}
                            className="p-1 text-zinc-600 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const msgs = [...(watch('recent_activity_messages') || []), { icon: 'TrendingUp', text: '', color: 'text-emerald-600' }];
                          setValue('recent_activity_messages', msgs);
                        }}
                        className="flex items-center gap-2 text-xs text-zinc-500 hover:text-emerald-400 transition-colors"
                      >
                        <Plus size={14} /> Agregar mensaje
                      </button>
                    </div>
                  )}
                </div>

                {/* SEO — Meta tags y Open Graph */}
                <div className="bg-zinc-900/40 p-8 rounded-[3rem] border border-white/5 space-y-6">
                  <h3 className="text-xl font-bold flex items-center gap-3"><Globe className="text-sky-400" /> SEO y Redes Sociales</h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Como aparece tu propiedad en Google y al compartir en redes</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 block">Meta Title</label>
                      <input
                        {...register('seo_meta_title')}
                        placeholder="Ej: Hotel Los Andes | Reserva Oficial en Mendoza"
                        className="w-full p-4 bg-zinc-950 border border-white/10 rounded-2xl text-sm"
                      />
                      <p className="text-[9px] text-zinc-600 mt-1">{(watch('seo_meta_title') || '').length}/60 caracteres recomendados</p>
                    </div>
                    
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 block">Meta Description</label>
                      <textarea
                        {...register('seo_meta_description')}
                        rows={3}
                        placeholder="Ej: Disfruta de la mejor experiencia en Mendoza. Piscina, desayuno incluido y vistas panoramicas."
                        className="w-full p-4 bg-zinc-950 border border-white/10 rounded-2xl text-sm resize-none"
                      />
                      <p className="text-[9px] text-zinc-600 mt-1">{(watch('seo_meta_description') || '').length}/160 caracteres recomendados</p>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 block">OG Image URL</label>
                      <input
                        {...register('seo_og_image_url')}
                        placeholder="https://..."
                        className="w-full p-4 bg-zinc-950 border border-white/10 rounded-2xl text-xs"
                      />
                      <p className="text-[9px] text-zinc-600 mt-1">Imagen que aparece al compartir en WhatsApp, Facebook, etc.</p>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 block">Canonical URL</label>
                      <input
                        {...register('seo_canonical_url')}
                        placeholder="https://tuhotel.com/hotel/slug"
                        className="w-full p-4 bg-zinc-950 border border-white/10 rounded-2xl text-xs"
                      />
                    </div>
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