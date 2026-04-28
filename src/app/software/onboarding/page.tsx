'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, UploadCloud, Plus, Trash2, Loader2, ArrowRight, 
  CheckCircle2, AlertCircle, Wifi, Wind, Bath, Tv, Coffee, 
  Image as ImageIcon, CalendarDays
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import WompiButton from '@/components/payments/WompiButton';

// 📅 LIBRERÍAS DE CALENDARIO (TIER-1)
import { DayPicker, DateRange } from 'react-day-picker';
import { es } from 'date-fns/locale';
import 'react-day-picker/dist/style.css'; 

// --- DICCIONARIO DE AMENITIES ---
const AMENITY_OPTIONS = [
  { id: 'wifi', label: 'Wi-Fi 6', icon: Wifi },
  { id: 'ac', label: 'Climatización', icon: Wind },
  { id: 'jacuzzi', label: 'Jacuzzi', icon: Bath },
  { id: 'tv', label: 'Smart TV', icon: Tv },
  { id: 'minibar', label: 'Minibar', icon: Coffee }
];

interface RoomTemplate {
  id: string;
  name: string;
  price: number;
  description: string;
  amenities: string[];
  imageFiles: File[];
  imagePreviews: string[];
  availability: DateRange | undefined;
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
  const [rooms, setRooms] = useState<RoomTemplate[]>([{ 
    id: crypto.randomUUID(), 
    name: 'Domo Glamping VIP', 
    price: 350000,
    description: '',
    amenities: [],
    imageFiles: [],
    imagePreviews: [],
    availability: undefined
  }]);

  // 1. RESOLUCIÓN DE CONTEXTO DETERMINISTA (Identidad por UUID)
  useEffect(() => {
    async function fetchContext() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) { router.push('/login'); return; }

        const { data: staff, error: staffError } = await supabase
          .from('staff').select('hotel_id').eq('user_id', user.id).maybeSingle();

        if (staffError || !staff) {
          setError("Anomalía de topología: No se detectó un inquilino vinculado a tu ID.");
        } else {
          setHotelId(staff.hotel_id);
        }
      } catch (err) { 
        setError("Fallo de red en el Edge."); 
      } finally { 
        setIsLoading(false); 
      }
    }
    fetchContext();
  }, [supabase, router]);

  // 2. GESTIÓN DE MEMORIA (Garbage Collection de URLs)
  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      rooms.forEach(r => r.imagePreviews.forEach(url => URL.revokeObjectURL(url)));
    };
  }, [logoPreview, rooms]);

  // --- CONTROLADORES OPERATIVOS ---
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { 
      setLogoFile(file); 
      setLogoPreview(URL.createObjectURL(file)); 
    }
  };

  const handleRoomImages = (roomId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setRooms(rooms.map(r => {
      if (r.id === roomId) {
        const newPreviews = files.map(f => URL.createObjectURL(f));
        return { 
          ...r, 
          imageFiles: [...r.imageFiles, ...files].slice(0, 5), // Límite estricto de 5 fotos
          imagePreviews: [...r.imagePreviews, ...newPreviews].slice(0, 5) 
        };
      }
      return r;
    }));
  };

  const toggleAmenity = (roomId: string, amenityId: string) => {
    setRooms(rooms.map(r => {
      if (r.id === roomId) {
        const has = r.amenities.includes(amenityId);
        return { 
          ...r, 
          amenities: has ? r.amenities.filter(a => a !== amenityId) : [...r.amenities, amenityId] 
        };
      }
      return r;
    }));
  };

  const updateRoom = (id: string, field: keyof RoomTemplate, value: any) => {
    setRooms(rooms.map(r => r.id === id ? { ...r, [field]: value } : r));
  };
  
  const addRoom = () => setRooms([...rooms, { 
    id: crypto.randomUUID(), 
    name: '', 
    price: 0, 
    description: '', 
    amenities: [], 
    imageFiles: [], 
    imagePreviews: [], 
    availability: undefined 
  }]);
  
  const removeRoom = (id: string) => { 
    if (rooms.length > 1) setRooms(rooms.filter(r => r.id !== id)); 
  };

  // --- COMPILADOR DE APROVISIONAMIENTO (ATOMIC DML) ---
  const executeProvisioning = async (transactionId: string) => {
    if (!hotelId) return;
    setIsLoading(true);
    setStep(4); // Forzar pantalla de compilación
    try {
      let logoUrl = null;
      
      // 1. Inyección de Logo Principal
      if (logoFile) {
        const filePath = `${hotelId}/logo-${Date.now()}.${logoFile.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage.from('hotel-assets').upload(filePath, logoFile);
        if (!uploadError) {
          const { data } = supabase.storage.from('hotel-assets').getPublicUrl(filePath);
          logoUrl = data.publicUrl;
        }
      }

      // 2. Actualización de Inquilino
      await supabase.from('hotels').update({ 
        name: hotelName, 
        ...(logoUrl && { logo_url: logoUrl }), 
        status: 'active' 
      }).eq('id', hotelId);

      // 3. Procesamiento en Lote de Habitaciones y Fotos (Parallel Uploads)
      const roomsPayload = await Promise.all(rooms.map(async (room) => {
        let galleryUrls: {url: string}[] = [];
        
        if (room.imageFiles.length > 0) {
          const uploadPromises = room.imageFiles.map(async (file, index) => {
            const path = `${hotelId}/rooms/${room.id}-${Date.now()}-${index}.${file.name.split('.').pop()}`;
            const { error } = await supabase.storage.from('hotel-assets').upload(path, file);
            if (!error) {
              const { data } = supabase.storage.from('hotel-assets').getPublicUrl(path);
              return { url: data.publicUrl };
            }
            return null;
          });
          const results = await Promise.all(uploadPromises);
          galleryUrls = results.filter((r): r is {url: string} => r !== null);
        }

        // 🛡️ CORRECCIÓN FORENSE: Serialización estricta de disponibilidad
        const availabilityRange = room.availability && room.availability.from ? {
          from: room.availability.from.toISOString(),
          to: room.availability.to ? room.availability.to.toISOString() : room.availability.from.toISOString()
        } : null;

        return {
          hotel_id: hotelId,
          name: room.name,
          price: room.price,
          description: room.description,
          amenities: room.amenities,
          gallery: galleryUrls, // JSONB
          availability_range: availabilityRange, // JSONB (Evita pérdida de datos)
          status: 'available'
        };
      }));

      const { error: roomsError } = await supabase.from('rooms').insert(roomsPayload);
      if (roomsError) throw roomsError;

      router.refresh();
      router.push('/dashboard');
    } catch (error: any) {
      console.error('🚨 PROVISIONING_ERROR:', error.message);
      alert("Fallo en la inyección de datos: " + error.message);
      setStep(3);
      setIsLoading(false);
    }
  };

  // --- RENDERIZADO DE SEGURIDAD ---
  if (isLoading && step !== 4) return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center space-y-6">
      <Loader2 className="animate-spin text-indigo-500 size-16" />
      <p className="text-zinc-500 font-mono text-xs uppercase tracking-[0.3em] animate-pulse">Autenticando Nodo</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="text-rose-500 size-20 mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]" />
      <h2 className="text-white font-bold text-3xl mb-3">Anomalía Criptográfica</h2>
      <button onClick={() => window.location.reload()} className="px-10 py-4 bg-zinc-900 border border-white/10 rounded-2xl text-white font-bold hover:bg-white/5 transition-all">Reintentar</button>
    </div>
  );

  const slideVariants = {
    enter: { x: 20, opacity: 0 },
    center: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } },
    exit: { x: -20, opacity: 0, transition: { duration: 0.15 } }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex flex-col justify-center py-12 px-4 font-sans relative overflow-hidden selection:bg-indigo-500/30">
      <div className="fixed top-[-20%] left-[-10%] w-[80%] h-[80%] bg-indigo-600/10 blur-[180px] rounded-full pointer-events-none" />
      
      <div className="max-w-4xl w-full mx-auto relative z-10">
        <div className="text-center mb-12">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-16 h-16 bg-zinc-900/80 border border-white/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
            <Building2 className="text-indigo-400" size={28} />
          </motion.div>
          <h2 className="text-3xl font-black tracking-tight text-white uppercase tracking-widest">HospedaSuite</h2>
          <p className="text-zinc-500 text-sm italic font-lora mt-2">Motor de Aprovisionamiento Tier-1</p>
        </div>

        <div className="bg-zinc-950/40 backdrop-blur-3xl border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.8)] rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden ring-1 ring-inset ring-white/5">
          <AnimatePresence mode="wait">
            
            {/* PASO 1: IDENTIDAD */}
            {step === 1 && (
              <motion.div key="step1" variants={slideVariants} initial="enter" animate="center" exit="exit" className="space-y-10">
                <div className="space-y-8 max-w-xl mx-auto">
                  <h3 className="text-2xl font-bold text-white text-center">Identidad de la Propiedad</h3>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-3 ml-2">Nombre Comercial</label>
                    <input type="text" value={hotelName} onChange={(e) => setHotelName(e.target.value)} placeholder="Ej: Villa Secret Stay" className="w-full bg-black/50 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium text-lg placeholder:text-zinc-700" />
                  </div>
                  <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-white/10 rounded-3xl hover:border-indigo-500/40 hover:bg-indigo-500/5 cursor-pointer relative overflow-hidden transition-all group">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="max-h-full p-6 object-contain drop-shadow-2xl" />
                    ) : (
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                          <UploadCloud className="text-zinc-500 group-hover:text-indigo-400 transition-colors" size={28} />
                        </div>
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Inyectar Logotipo</p>
                      </div>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  </label>
                  <button onClick={() => setStep(2)} disabled={hotelName.length < 3} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-5 rounded-[1.5rem] flex items-center justify-center gap-3 transition-all uppercase tracking-widest text-xs disabled:opacity-20 shadow-lg shadow-indigo-500/20">
                    Construir Inventario <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* PASO 2: INVENTARIO (EL CONSTRUCTOR MAC 2026) */}
            {step === 2 && (
              <motion.div key="step2" variants={slideVariants} initial="enter" animate="center" exit="exit" className="space-y-8">
                <div className="flex justify-between items-end border-b border-white/5 pb-4">
                  <h3 className="text-xl font-bold text-white uppercase tracking-widest">Unidades Base</h3>
                  <button onClick={addRoom} className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-2 uppercase"><Plus size={14}/> Añadir Espacio</button>
                </div>
                
                <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  {rooms.map((room, idx) => (
                    <motion.div layout key={room.id} className="bg-zinc-900/30 p-6 md:p-8 rounded-[2rem] border border-white/5 relative group">
                      <button onClick={() => removeRoom(room.id)} disabled={rooms.length === 1} className="absolute top-6 right-6 text-zinc-600 hover:text-rose-500 transition-colors disabled:opacity-0"><Trash2 size={18}/></button>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Columna Izquierda: Datos Core */}
                        <div className="space-y-6">
                          <div className="space-y-4">
                            <input type="text" value={room.name} onChange={(e) => updateRoom(room.id, 'name', e.target.value)} placeholder={`Espacio ${idx + 1} (Ej: Domo Estelar)`} className="w-full bg-transparent border-b border-white/10 text-white outline-none focus:border-indigo-400 font-black text-2xl placeholder:text-zinc-700 pb-2 transition-colors" />
                            <div className="flex items-center gap-3 text-emerald-400 font-mono bg-emerald-500/10 w-max px-4 py-2 rounded-xl border border-emerald-500/20">
                              <span className="text-sm font-bold">$</span>
                              <input type="number" value={room.price || ''} onChange={(e) => updateRoom(room.id, 'price', Number(e.target.value))} placeholder="Precio/Noche" className="w-32 bg-transparent outline-none text-lg font-bold placeholder:text-emerald-700/50" />
                              <span className="text-xs text-emerald-600 ml-1">COP</span>
                            </div>
                          </div>
                          
                          <textarea value={room.description} onChange={(e) => updateRoom(room.id, 'description', e.target.value)} placeholder="Describe la experiencia única de este espacio..." className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-sm text-zinc-300 outline-none focus:border-indigo-500/50 resize-none h-24 placeholder:text-zinc-700" />
                          
                          <div className="space-y-3">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Comodidades (Amenities)</p>
                            <div className="flex flex-wrap gap-2">
                              {AMENITY_OPTIONS.map(amenity => {
                                const isActive = room.amenities.includes(amenity.id);
                                const Icon = amenity.icon;
                                return (
                                  <button key={amenity.id} onClick={() => toggleAmenity(room.id, amenity.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${isActive ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10'}`}>
                                    <Icon size={14} /> {amenity.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Columna Derecha: Multimedia y Calendario */}
                        <div className="space-y-6 border-t md:border-t-0 md:border-l border-white/5 pt-6 md:pt-0 md:pl-8">
                          
                          {/* Dropzone de Fotos */}
                          <div className="space-y-3">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex justify-between">
                              <span>Galería Visual</span>
                              <span className="text-indigo-400">{room.imagePreviews.length}/5</span>
                            </p>
                            
                            {room.imagePreviews.length > 0 ? (
                              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                {room.imagePreviews.map((src, i) => (
                                  <img key={i} src={src} alt="Room" className="h-20 w-28 object-cover rounded-xl border border-white/10 shrink-0 shadow-lg" />
                                ))}
                                {room.imagePreviews.length < 5 && (
                                  <label className="h-20 w-28 shrink-0 flex items-center justify-center bg-white/5 border border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-white/10 transition-colors">
                                    <Plus className="text-zinc-500" size={20}/>
                                    <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleRoomImages(room.id, e)} />
                                  </label>
                                )}
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center w-full h-32 border border-dashed border-white/10 rounded-2xl hover:border-indigo-500/40 cursor-pointer bg-black/20 group transition-colors">
                                <ImageIcon className="text-zinc-600 group-hover:text-indigo-400 mb-2" size={24} />
                                <span className="text-xs text-zinc-500 font-medium">Subir hasta 5 fotos</span>
                                <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleRoomImages(room.id, e)} />
                              </label>
                            )}
                          </div>

                          {/* DatePicker Haptico */}
                          <div className="space-y-3">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Temporada Inicial (Disponibilidad)</p>
                            <div className="bg-black/40 rounded-2xl border border-white/5 p-4 flex justify-center date-picker-mac">
                              <DayPicker 
                                mode="range" 
                                selected={room.availability} 
                                onSelect={(range) => updateRoom(room.id, 'availability', range)}
                                locale={es}
                                className="text-sm font-sans"
                                modifiersClassNames={{ selected: 'bg-indigo-500 text-white rounded-full' }}
                              />
                            </div>
                          </div>

                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="flex gap-4 pt-4 border-t border-white/5">
                  <button onClick={() => setStep(1)} className="w-1/3 border border-white/10 text-zinc-500 py-5 rounded-[1.5rem] font-bold uppercase tracking-widest text-[10px] hover:bg-white/5 transition-all">Atrás</button>
                  <button onClick={() => setStep(3)} disabled={rooms.some(r => !r.name || r.price <= 0)} className="w-2/3 bg-indigo-600 text-white font-bold py-5 rounded-[1.5rem] uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-600/20 disabled:opacity-20 transition-all">
                    Aprobar Topología
                  </button>
                </div>
              </motion.div>
            )}

            {/* PASO 3: BÓVEDA WOMPI */}
            {step === 3 && (
              <motion.div key="step3" variants={slideVariants} initial="enter" animate="center" exit="exit" className="text-center py-8 space-y-10">
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-white uppercase tracking-widest">Firmar Contrato Inteligente</h3>
                  <p className="text-zinc-500 text-sm italic font-lora">Aprovisionamiento final mediante tokenización.</p>
                </div>
                
                <div className="bg-black/40 p-8 rounded-[2rem] border border-white/5 text-left max-w-sm mx-auto shadow-inner">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-2">Entidad a Desplegar</p>
                    <p className="text-white font-black text-2xl">{hotelName}</p>
                    <div className="flex gap-4 mt-4">
                      <span className="bg-indigo-500/10 text-indigo-400 text-xs px-3 py-1 rounded-lg border border-indigo-500/20 font-mono">{rooms.length} Nodos</span>
                      <span className="bg-emerald-500/10 text-emerald-400 text-xs px-3 py-1 rounded-lg border border-emerald-500/20 font-bold uppercase tracking-wider">Pionero Activo</span>
                    </div>
                </div>

                <div className="max-w-sm mx-auto">
                  <WompiButton 
                    amount={89900} 
                    reference={`ONB-${hotelId}-${Date.now()}`}
                    publicKey={process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || 'pub_test_Q5yS9j9vD177N68494Yy637R9Y6606vH'}
                    isSubscription={true}
                    onSuccess={(txId) => { executeProvisioning(txId); }}
                  />
                </div>
              </motion.div>
            )}

            {/* PASO 4: COMPILANDO (LOADING) */}
            {step === 4 && (
              <motion.div key="step4" variants={slideVariants} initial="enter" animate="center" className="py-24 text-center space-y-8">
                <div className="relative w-24 h-24 mx-auto">
                  <div className="absolute inset-0 border-t-2 border-indigo-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-2 border-r-2 border-emerald-500 rounded-full animate-spin direction-reverse duration-1000"></div>
                  <Building2 className="absolute inset-0 m-auto text-white/50" size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white uppercase tracking-[0.3em]">Compilando Nodo</h3>
                  <p className="text-zinc-500 text-xs font-mono">Inyectando activos multimedia en el Edge...</p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}