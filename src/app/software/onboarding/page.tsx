'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, UploadCloud, Plus, Trash2, Loader2, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import WompiButton from '@/components/payments/WompiButton';

interface RoomTemplate {
  id: string;
  name: string;
  price: number;
}

export default function PremiumOnboardingWizard() {
  const router = useRouter();
  const supabase = createClient();
  
  // --- MÁQUINA DE ESTADOS REFORZADA ---
  const [step, setStep] = useState(1);
  const [hotelId, setHotelId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- PAYLOADS DE INFRAESTRUCTURA ---
  const [hotelName, setHotelName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [rooms, setRooms] = useState<RoomTemplate[]>([
    { id: crypto.randomUUID(), name: 'Domo Glamping VIP', price: 350000 }
  ]);

  // 1. RESOLUCIÓN DE CONTEXTO DETERMINISTA (Identidad por UUID)
  useEffect(() => {
    async function fetchContext() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          router.push('/login');
          return;
        }

        // 🚀 CORRECCIÓN FORENSE: Filtrado por user_id (UUID)
        const { data: staff, error: staffError } = await supabase
          .from('staff')
          .select('hotel_id')
          .eq('user_id', user.id) 
          .maybeSingle();

        if (staffError || !staff) {
          console.error("Identity Bridge Failure:", staffError);
          setError("No se detectó un hotel vinculado a tu ID de usuario. Contacta a soporte.");
        } else {
          setHotelId(staff.hotel_id);
        }
      } catch (err) {
        setError("Error crítico de conexión con el nodo central.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchContext();
  }, [supabase, router]);

  // 2. GESTIÓN DE MEMORIA (GC)
  useEffect(() => {
    return () => { if (logoPreview) URL.revokeObjectURL(logoPreview); };
  }, [logoPreview]);

  // --- CONTROLADORES OPERATIVOS ---
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const addRoom = () => setRooms([...rooms, { id: crypto.randomUUID(), name: '', price: 0 }]);
  const removeRoom = (id: string) => { if (rooms.length > 1) setRooms(rooms.filter(r => r.id !== id)); };
  const updateRoom = (id: string, field: keyof RoomTemplate, value: any) => {
    setRooms(rooms.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  // --- COMPILADOR DE APROVISIONAMIENTO (ATOMIC DML) ---
  const executeProvisioning = async (transactionId: string) => {
    if (!hotelId) return;
    setIsLoading(true);
    try {
      let logoUrl = null;
      
      if (logoFile) {
        const filePath = `${hotelId}/logo-${Date.now()}.${logoFile.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('hotel-assets').upload(filePath, logoFile);
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('hotel-assets').getPublicUrl(filePath);
          logoUrl = publicUrl;
        }
      }

      await supabase.from('hotels').update({ 
        name: hotelName,
        ...(logoUrl && { logo_url: logoUrl }),
        status: 'active' 
      }).eq('id', hotelId);

      const roomsPayload = rooms.map(r => ({
        hotel_id: hotelId,
        name: r.name,
        price: r.price,
        status: 'available'
      }));

      const { error: roomsError } = await supabase.from('rooms').insert(roomsPayload);
      if (roomsError) throw roomsError;

      router.refresh();
      router.push('/dashboard');
    } catch (error: any) {
      console.error('🚨 PROVISIONING_ERROR:', error.message);
      alert("Fallo en la inyección: " + error.message);
      setStep(3);
      setIsLoading(false);
    }
  };

  // --- RENDERIZADO DE ESTADOS CRÍTICOS ---
  if (isLoading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center space-y-6">
      <Loader2 className="animate-spin text-indigo-500 size-16" />
      <p className="text-zinc-500 font-mono text-xs uppercase tracking-[0.3em] animate-pulse">Sincronizando Identidad</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="text-rose-500 size-20 mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]" />
      <h2 className="text-white font-bold text-3xl mb-3">Anomalía de Identidad</h2>
      <p className="text-zinc-500 max-w-sm mb-10 leading-relaxed">{error}</p>
      <button onClick={() => window.location.reload()} className="px-10 py-4 bg-zinc-900 border border-white/10 rounded-2xl text-white font-bold hover:bg-white/5 transition-all">
        Reintentar Sincronización
      </button>
    </div>
  );

  const slideVariants = {
    enter: { x: 40, opacity: 0 },
    center: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } },
    exit: { x: -40, opacity: 0, transition: { duration: 0.2 } }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex flex-col justify-center py-12 px-4 font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-5%] w-[60%] h-[60%] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none" />
      
      <div className="max-w-2xl w-full mx-auto relative z-10">
        <div className="text-center mb-16">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-20 h-20 bg-zinc-900/80 border border-white/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
            <Building2 className="text-indigo-400" size={38} />
          </motion.div>
          <h2 className="text-4xl font-bold tracking-tight text-white mb-3 uppercase tracking-widest text-center">Configura tu Propiedad</h2>
          <p className="text-zinc-500 text-sm italic font-lora text-center">Iniciando inyección de topología orgánica.</p>
        </div>

        <div className="bg-zinc-900/40 backdrop-blur-3xl border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.8)] rounded-[3rem] p-10 md:p-14 relative overflow-hidden ring-1 ring-inset ring-white/5">
          <AnimatePresence mode="wait">
            
            {step === 1 && (
              <motion.div key="step1" variants={slideVariants} initial="enter" animate="center" exit="exit" className="space-y-10">
                <div className="border-b border-white/5 pb-6">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-3"><Building2 size={24} className="text-indigo-400"/> Identidad Visual</h3>
                </div>
                <div className="space-y-8">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-3 ml-2">Nombre Comercial</label>
                    <input type="text" value={hotelName} onChange={(e) => setHotelName(e.target.value)} placeholder="Ej: Villa Secret Stay" className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all" />
                  </div>
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-white/10 rounded-3xl hover:border-indigo-500/40 cursor-pointer relative overflow-hidden transition-all group">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="max-h-full p-6 object-contain" />
                    ) : (
                      <div className="text-center space-y-3">
                        <UploadCloud className="mx-auto text-zinc-600 group-hover:text-indigo-400" size={32} />
                        <p className="text-xs font-bold text-zinc-600 uppercase">Subir Logo</p>
                      </div>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  </label>
                </div>
                <button onClick={() => setStep(2)} disabled={hotelName.length < 3} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-5 rounded-[1.5rem] flex items-center justify-center gap-3 transition-all uppercase tracking-tighter disabled:opacity-30">
                  Continuar: Inventario <ArrowRight size={20} />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" variants={slideVariants} initial="enter" animate="center" exit="exit" className="space-y-10 text-left">
                <div className="border-b border-white/5 pb-6">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-3"><CheckCircle2 size={24} className="text-emerald-400"/> Unidades de Alojamiento</h3>
                </div>
                <div className="space-y-5 max-h-[42vh] overflow-y-auto pr-3 custom-scrollbar">
                  {rooms.map((room) => (
                    <div key={room.id} className="flex gap-4 items-start bg-black/40 p-6 rounded-[2rem] border border-white/5 group">
                      <div className="flex-1 space-y-4">
                        <input type="text" value={room.name} onChange={(e) => updateRoom(room.id, 'name', e.target.value)} placeholder="Nombre" className="w-full bg-transparent border-b border-white/10 text-white outline-none focus:border-emerald-500 font-bold text-lg" />
                        <div className="flex items-center gap-2 text-emerald-400 font-mono">
                          <span className="text-xs">$</span>
                          <input type="number" value={room.price || ''} onChange={(e) => updateRoom(room.id, 'price', Number(e.target.value))} placeholder="Precio" className="w-full bg-transparent outline-none text-sm" />
                        </div>
                      </div>
                      <button onClick={() => removeRoom(room.id)} disabled={rooms.length === 1} className="p-3 text-zinc-700 hover:text-rose-500 mt-4"><Trash2 size={20} /></button>
                    </div>
                  ))}
                </div>
                <button onClick={addRoom} className="w-full border border-dashed border-white/10 text-zinc-600 hover:text-zinc-300 py-4 rounded-2xl flex items-center justify-center gap-3 text-xs font-bold uppercase transition-all"><Plus size={18} /> Añadir Otra</button>
                <div className="flex gap-4">
                  <button onClick={() => setStep(1)} className="w-1/3 border border-white/10 text-zinc-600 py-5 rounded-[1.5rem] font-bold uppercase text-xs hover:bg-white/5 transition-all">Atrás</button>
                  <button onClick={() => setStep(3)} disabled={rooms.some(r => !r.name || r.price <= 0)} className="w-2/3 bg-indigo-600 text-white font-bold py-5 rounded-[1.5rem] uppercase tracking-tighter shadow-2xl shadow-indigo-600/20">Activar Bóveda</button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" variants={slideVariants} initial="enter" animate="center" exit="exit" className="space-y-10 text-center">
                <h3 className="text-3xl font-bold text-white uppercase tracking-tight">Activación de Nodo</h3>
                <p className="text-zinc-500 text-sm italic font-lora"> Tokeniza un medio de pago para habilitar producción. <br/> <span className="text-emerald-400 font-bold">90 Días Gratis</span> aplicados automáticamente.</p>
                
                <div className="bg-black/60 p-8 rounded-[2.5rem] border border-white/5 text-left space-y-4">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Inquilino</p>
                    <p className="text-white font-bold text-xl">{hotelName}</p>
                    <p className="text-indigo-400 font-mono text-xs uppercase tracking-tighter">{rooms.length} Unidades en cola</p>
                </div>

                <WompiButton 
                  amount={89900} 
                  reference={`ONB-${hotelId}-${Date.now()}`}
                  publicKey={process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || 'pub_test_Q5yS9j9vD177N68494Yy637R9Y6606vH'}
                  isSubscription={true}
                  onSuccess={(txId) => { setStep(4); executeProvisioning(txId); }}
                />
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" variants={slideVariants} initial="enter" animate="center" className="py-20 text-center space-y-8">
                <Loader2 size={60} className="animate-spin text-indigo-500 mx-auto drop-shadow-[0_0_15px_rgba(99,102,241,0.4)]" />
                <h3 className="text-2xl font-bold text-white uppercase tracking-[0.2em]">Compilando Nodo</h3>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}