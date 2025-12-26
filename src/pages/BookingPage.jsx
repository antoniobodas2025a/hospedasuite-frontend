import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from 'framer-motion';
import SignatureCanvas from 'react-signature-canvas';
import {
  Calendar,
  Check,
  ChevronLeft,
  MapPin,
  Wifi,
  Coffee,
  Star,
  ArrowRight,
  Loader,
  Eraser,
  CreditCard,
} from 'lucide-react';

// --- ESTILOS GLOBALES ---
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Lato:wght@300;400;700&display=swap');
    body { background-color: #F9F8F6; color: #111111; } 
    .font-display { fontFamily: 'Cinzel', serif; }
    .font-serif { fontFamily: 'Playfair Display', serif; }
    .font-sans { fontFamily: 'Lato', sans-serif; }
  `}</style>
);

const ROOM_PLACEHOLDER =
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80';

// --- ANIMACIONES FRAMER ---
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 40, damping: 20 },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const BookingPage = () => {
  // 👇 CORRECCIÓN: Usamos hotelId en lugar de hotelSlug
  const { hotelId } = useParams();
  const sigPad = useRef({});
  const containerRef = useRef(null);

  // Parallax Hero
  const { scrollY } = useScroll();
  const yHero = useTransform(scrollY, [0, 500], [0, 200]);
  const opacityHero = useTransform(scrollY, [0, 300], [1, 0]);

  // --- ESTADOS ---
  const [step, setStep] = useState(1);
  const [hotel, setHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [dates, setDates] = useState({
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
  });
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [guest, setGuest] = useState({
    fullName: '',
    docNumber: '',
    email: '',
    phone: '',
  });

  // --- LOGICA CORREGIDA ---
  useEffect(() => {
    const fetchHotelData = async () => {
      try {
        if (!hotelId) return; // Validación extra

        // Buscamos por ID explícito
        const { data: h } = await supabase
          .from('hotels')
          .select('*')
          .eq('id', hotelId)
          .single();

        if (h) {
          setHotel(h);
          const { data: r } = await supabase
            .from('rooms')
            .select('*')
            .eq('hotel_id', h.id);
          if (r) setRooms(r);
        }
      } catch (error) {
        console.error('Error cargando hotel:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHotelData();
  }, [hotelId]); // Dependencia corregida a hotelId

  const clearSig = () => sigPad.current.clear();

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    if (sigPad.current.isEmpty())
      return alert('La firma es requerida para confirmar.');

    setProcessing(true);
    try {
      const signatureBlob = await new Promise((resolve) =>
        sigPad.current.getCanvas().toBlob(resolve, 'image/png')
      );
      const fileName = `sig-${Date.now()}.png`;
      const { error: upErr } = await supabase.storage
        .from('signatures')
        .upload(fileName, signatureBlob);

      let publicUrl = null;
      if (!upErr) {
        const { data } = supabase.storage
          .from('signatures')
          .getPublicUrl(fileName);
        publicUrl = data.publicUrl;
      }

      const { data: gData, error: gError } = await supabase
        .from('guests')
        .insert([
          {
            full_name: guest.fullName,
            doc_number: guest.docNumber,
            email: guest.email,
            phone: guest.phone,
            nationality: 'COL',
            signature_url: publicUrl,
          },
        ])
        .select()
        .single();

      if (gError) throw gError;

      const nights = Math.max(
        1,
        Math.ceil(
          (new Date(dates.checkOut) - new Date(dates.checkIn)) / 86400000
        )
      );

      const { error: bError } = await supabase.from('bookings').insert([
        {
          hotel_id: hotel.id,
          room_id: selectedRoom.id,
          guest_id: gData.id,
          check_in: dates.checkIn,
          check_out: dates.checkOut,
          total_price: (selectedRoom.price || 0) * nights,
          status: 'confirmed',
        },
      ]);

      if (bError) throw bError;
      setStep(4);
    } catch (error) {
      alert(error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading)
    return (
      <div className='h-screen flex items-center justify-center bg-[#F9F8F6]'>
        <Loader className='animate-spin text-black' />
      </div>
    );

  const totalNights = Math.max(
    1,
    Math.ceil((new Date(dates.checkOut) - new Date(dates.checkIn)) / 86400000)
  );
  const totalCost = (selectedRoom?.price || 0) * totalNights;

  // INDICADOR DE PASOS (Contrastado)
  const StepIndicator = () => (
    <div className='flex justify-center items-center gap-4 mb-12 text-[11px] font-display tracking-[0.2em] text-gray-400 font-bold'>
      <span
        className={
          step >= 1
            ? 'text-black border-b-2 border-black pb-1 transition-all'
            : ''
        }
      >
        FECHAS
      </span>
      <span className='w-8 h-[1px] bg-gray-300' />
      <span
        className={
          step >= 2
            ? 'text-black border-b-2 border-black pb-1 transition-all'
            : ''
        }
      >
        ESTANCIA
      </span>
      <span className='w-8 h-[1px] bg-gray-300' />
      <span
        className={
          step >= 3
            ? 'text-black border-b-2 border-black pb-1 transition-all'
            : ''
        }
      >
        DATOS
      </span>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className='min-h-screen bg-[#F9F8F6] font-sans text-[#111111] selection:bg-black selection:text-white pb-20'
    >
      <GlobalStyles />

      {/* --- HERO PARALLAX --- */}
      <div className='relative h-[60vh] overflow-hidden bg-black'>
        <motion.div
          style={{ y: yHero, opacity: opacityHero }}
          className='absolute inset-0'
        >
          <div className='absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-[#F9F8F6] z-10' />
          <img
            src='https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2070&auto=format&fit=crop'
            className='w-full h-full object-cover opacity-90'
            alt='Luxury Hotel'
          />
        </motion.div>

        <div className='absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-6 mt-10'>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <span className='inline-block py-1 px-3 border border-white/40 bg-black/10 rounded-full text-white text-[10px] tracking-[0.3em] font-display backdrop-blur-md mb-6 font-bold shadow-sm'>
              THE COLLECTION
            </span>
            <h1 className='text-5xl md:text-7xl font-serif text-white mb-4 drop-shadow-md'>
              {hotel?.name}
            </h1>
            <div className='flex items-center justify-center gap-2 text-white/90 font-medium tracking-wide text-sm drop-shadow-sm'>
              <MapPin size={16} /> {hotel?.location || 'Colombia'}
            </div>
          </motion.div>
        </div>
      </div>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <div className='max-w-5xl mx-auto px-6 -mt-20 relative z-30'>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className='bg-white rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] p-8 md:p-16 border border-gray-200'
        >
          {step < 4 && <StepIndicator />}

          <AnimatePresence mode='wait'>
            {/* PASO 1: SELECCIÓN DE FECHAS */}
            {step === 1 && (
              <motion.div
                key='step1'
                variants={staggerContainer}
                initial='hidden'
                animate='visible'
                exit={{ opacity: 0, y: -20 }}
              >
                <motion.h2
                  variants={fadeInUp}
                  className='text-4xl font-serif text-center mb-3 text-black'
                >
                  Bienvenido
                </motion.h2>
                <motion.p
                  variants={fadeInUp}
                  className='text-center text-gray-600 mb-12 font-light text-lg'
                >
                  Selecciona las fechas para tu escapada.
                </motion.p>

                <div className='grid md:grid-cols-2 gap-10 mb-14'>
                  {['Llegada', 'Salida'].map((label, i) => (
                    <motion.div
                      variants={fadeInUp}
                      key={label}
                      className='group relative'
                    >
                      <label className='text-[11px] font-bold tracking-widest text-gray-500 uppercase mb-2 block'>
                        {label}
                      </label>
                      <div className='border-b-2 border-gray-300 group-focus-within:border-black transition-colors py-4 flex items-center gap-4'>
                        <Calendar
                          className='text-gray-500 group-focus-within:text-black transition-colors'
                          size={22}
                        />
                        <input
                          type='date'
                          className='w-full bg-transparent outline-none font-serif text-3xl text-gray-900 cursor-pointer'
                          value={i === 0 ? dates.checkIn : dates.checkOut}
                          onChange={(e) =>
                            setDates({
                              ...dates,
                              [i === 0 ? 'checkIn' : 'checkOut']:
                                e.target.value,
                            })
                          }
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  variants={fadeInUp}
                  className='flex justify-center'
                >
                  <button
                    onClick={() => setStep(2)}
                    className='bg-[#111] text-white px-12 py-5 rounded-full font-bold text-xs tracking-[0.2em] hover:bg-black hover:scale-105 transition-all shadow-xl flex items-center gap-4 group'
                  >
                    VER DISPONIBILIDAD{' '}
                    <ArrowRight
                      size={16}
                      className='group-hover:translate-x-1 transition-transform'
                    />
                  </button>
                </motion.div>
              </motion.div>
            )}

            {/* PASO 2: HABITACIONES */}
            {step === 2 && (
              <motion.div
                key='step2'
                variants={staggerContainer}
                initial='hidden'
                animate='visible'
                exit={{ opacity: 0 }}
              >
                <motion.button
                  onClick={() => setStep(1)}
                  className='mb-8 flex items-center text-xs font-bold tracking-widest text-gray-500 hover:text-black transition-colors'
                >
                  <ChevronLeft
                    size={16}
                    className='mr-1'
                  />{' '}
                  VOLVER
                </motion.button>

                <motion.h2
                  variants={fadeInUp}
                  className='text-3xl font-serif mb-10 text-black'
                >
                  Tu Santuario
                </motion.h2>

                <div className='grid gap-12'>
                  {rooms.map((room) => (
                    <motion.div
                      key={room.id}
                      variants={fadeInUp}
                      layoutId={`room-${room.id}`}
                      onClick={() => setSelectedRoom(room)}
                      className={`group cursor-pointer relative overflow-hidden rounded-2xl border ${
                        selectedRoom?.id === room.id
                          ? 'border-black ring-1 ring-black shadow-2xl'
                          : 'border-gray-200 shadow-lg hover:shadow-xl'
                      }`}
                    >
                      <div className='grid md:grid-cols-2 gap-0'>
                        <div className='h-64 md:h-80 overflow-hidden bg-gray-200'>
                          <img
                            src={ROOM_PLACEHOLDER}
                            className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out'
                            alt={room.name}
                          />
                        </div>
                        <div className='p-8 md:p-12 bg-white flex flex-col justify-center'>
                          <div className='flex justify-between items-start mb-4'>
                            <h3 className='font-serif text-2xl md:text-3xl italic text-gray-900'>
                              {room.name}
                            </h3>
                            <div className='text-right'>
                              <span className='block font-display text-xl font-bold text-black'>
                                ${(room.price || 0).toLocaleString()}
                              </span>
                              <span className='text-[10px] text-gray-500 uppercase tracking-widest font-bold'>
                                Por Noche
                              </span>
                            </div>
                          </div>
                          <p className='text-gray-600 font-medium mb-6 line-clamp-3 text-sm leading-relaxed'>
                            Disfruta de una experiencia inigualable con diseño
                            exclusivo, iluminación cálida y todos los servicios
                            para tu confort.
                          </p>
                          <div className='flex gap-5 text-gray-400 mb-8'>
                            <Wifi size={20} /> <Coffee size={20} />{' '}
                            <Star size={20} />
                          </div>

                          <div className='flex items-center justify-between mt-auto pt-4 border-t border-gray-100'>
                            <span className='text-xs font-bold text-black underline decoration-1 underline-offset-4'>
                              VER DETALLES
                            </span>
                            {selectedRoom?.id === room.id ? (
                              <motion.button
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStep(3);
                                }}
                                className='bg-black text-white px-8 py-3 rounded-full text-xs font-bold tracking-widest hover:bg-[#222]'
                              >
                                RESERVAR AHORA
                              </motion.button>
                            ) : (
                              <div className='w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 group-hover:border-black group-hover:text-black transition-colors'>
                                <ArrowRight size={16} />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* PASO 3: DATOS Y FIRMA */}
            {step === 3 && (
              <motion.div
                key='step3'
                variants={staggerContainer}
                initial='hidden'
                animate='visible'
                exit={{ opacity: 0 }}
              >
                <motion.button
                  onClick={() => setStep(2)}
                  className='mb-8 flex items-center text-xs font-bold tracking-widest text-gray-500 hover:text-black transition-colors'
                >
                  <ChevronLeft
                    size={16}
                    className='mr-1'
                  />{' '}
                  CAMBIAR HABITACIÓN
                </motion.button>

                <div className='grid md:grid-cols-12 gap-12'>
                  <div className='md:col-span-7 space-y-10'>
                    <motion.h2
                      variants={fadeInUp}
                      className='text-3xl font-serif text-black'
                    >
                      Datos del Huésped
                    </motion.h2>

                    <motion.div
                      variants={fadeInUp}
                      className='space-y-8'
                    >
                      {[
                        {
                          label: 'Nombre Completo',
                          key: 'fullName',
                          type: 'text',
                          placeholder: 'Ej. Juan Pérez',
                        },
                        {
                          label: 'Documento de Identidad',
                          key: 'docNumber',
                          type: 'text',
                          placeholder: 'C.C. / Pasaporte',
                        },
                        {
                          label: 'Teléfono / WhatsApp',
                          key: 'phone',
                          type: 'tel',
                          placeholder: '300 000 0000',
                        },
                        {
                          label: 'Correo Electrónico',
                          key: 'email',
                          type: 'email',
                          placeholder: 'nombre@email.com',
                        },
                      ].map((field) => (
                        <div
                          key={field.key}
                          className='relative pt-2'
                        >
                          <input
                            type={field.type}
                            required
                            className='w-full bg-transparent border-b-2 border-gray-300 py-3 text-lg text-gray-900 focus:border-black outline-none transition-colors peer placeholder-gray-300 font-serif'
                            placeholder={field.placeholder}
                            value={guest[field.key]}
                            onChange={(e) =>
                              setGuest({
                                ...guest,
                                [field.key]: e.target.value,
                              })
                            }
                          />
                          <label className='absolute left-0 -top-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 peer-focus:text-black transition-colors'>
                            {field.label}
                          </label>
                        </div>
                      ))}
                    </motion.div>

                    <motion.div
                      variants={fadeInUp}
                      className='pt-6'
                    >
                      <div className='flex justify-between items-center mb-4'>
                        <span className='text-[10px] font-bold uppercase tracking-widest text-gray-500'>
                          FIRMA DE ACEPTACIÓN
                        </span>
                        <button
                          onClick={clearSig}
                          className='text-[10px] text-red-500 hover:text-red-700 font-bold flex items-center gap-1 bg-red-50 px-2 py-1 rounded'
                        >
                          <Eraser size={12} /> BORRAR
                        </button>
                      </div>
                      <div className='border border-gray-300 hover:border-gray-500 transition-colors bg-white rounded-lg shadow-inner'>
                        <SignatureCanvas
                          ref={sigPad}
                          penColor='black'
                          canvasProps={{ className: 'w-full h-32' }}
                        />
                      </div>
                      <p className='text-[10px] text-gray-400 mt-2'>
                        Al firmar aceptas los términos y condiciones del hotel.
                      </p>
                    </motion.div>
                  </div>

                  <div className='md:col-span-5'>
                    <motion.div
                      variants={fadeInUp}
                      className='bg-[#111] text-white p-8 rounded-3xl sticky top-8 shadow-2xl ring-1 ring-white/10'
                    >
                      <h3 className='font-display text-xl mb-6 border-b border-white/20 pb-4 tracking-widest'>
                        RESUMEN
                      </h3>

                      <div className='space-y-5 text-sm font-light text-gray-300 mb-10'>
                        <div className='flex justify-between'>
                          <span className='uppercase text-xs font-bold tracking-wider text-gray-500'>
                            Entrada
                          </span>
                          <span className='text-white font-medium text-lg font-serif'>
                            {dates.checkIn}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span className='uppercase text-xs font-bold tracking-wider text-gray-500'>
                            Salida
                          </span>
                          <span className='text-white font-medium text-lg font-serif'>
                            {dates.checkOut}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span className='uppercase text-xs font-bold tracking-wider text-gray-500'>
                            Duración
                          </span>
                          <span className='text-white font-medium'>
                            {totalNights} Noches
                          </span>
                        </div>
                        <div className='flex justify-between items-center pt-6 border-t border-white/10'>
                          <span className='font-serif text-xl italic'>
                            {selectedRoom?.name}
                          </span>
                        </div>
                      </div>

                      <div className='flex justify-between items-end mb-8'>
                        <span className='text-xs tracking-widest uppercase text-gray-500 font-bold'>
                          Total a Pagar
                        </span>
                        <span className='text-4xl font-serif text-white'>
                          ${totalCost.toLocaleString()}
                        </span>
                      </div>

                      <button
                        onClick={handleCreateBooking}
                        disabled={processing}
                        className='w-full bg-white text-black py-4 rounded-xl font-bold tracking-[0.2em] text-xs hover:bg-gray-200 transition-colors disabled:opacity-50 shadow-lg'
                      >
                        {processing ? 'PROCESANDO...' : 'CONFIRMAR RESERVA'}
                      </button>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PASO 4: ÉXITO */}
            {step === 4 && (
              <motion.div
                key='step4'
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className='text-center py-16'
              >
                <div className='inline-block p-6 rounded-full bg-green-50 text-green-700 mb-8 shadow-sm'>
                  <Check
                    size={48}
                    strokeWidth={1.5}
                  />
                </div>
                <h1 className='font-serif text-5xl md:text-6xl mb-6 text-black'>
                  ¡Todo Listo!
                </h1>
                <p className='text-gray-600 mb-12 font-light text-xl'>
                  Tu reserva{' '}
                  <strong className='text-black font-normal'>
                    #{Math.floor(1000 + Math.random() * 9000)}
                  </strong>{' '}
                  ha sido confirmada.
                </p>

                <div className='max-w-md mx-auto bg-white border border-gray-200 p-8 rounded-3xl shadow-xl mb-10'>
                  <p className='text-xs font-bold tracking-[0.2em] text-gray-400 uppercase mb-6 border-b pb-4'>
                    ANTICIPO REQUERIDO
                  </p>
                  <div className='flex justify-center items-center gap-8 mb-6'>
                    {/* QR Placeholder */}
                    <div className='bg-white p-2 rounded-xl shadow-inner border'>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${hotel?.phone}`}
                        alt='QR'
                        className='w-32 h-32 mix-blend-multiply'
                      />
                    </div>
                    <div className='text-left space-y-3'>
                      <div className='flex items-center gap-2 text-sm font-bold text-gray-700'>
                        <CreditCard size={18} /> Nequi / Daviplata
                      </div>
                      <div className='text-2xl font-serif text-black'>
                        {hotel?.phone || '300 000 0000'}
                      </div>
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(hotel?.phone)
                        }
                        className='text-[10px] font-bold text-gray-500 hover:text-black underline decoration-gray-300 underline-offset-4'
                      >
                        COPIAR NÚMERO
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() =>
                    window.open(
                      `https://wa.me/${hotel?.phone}?text=Hola, acabo de reservar. Envío comprobante.`,
                      '_blank'
                    )
                  }
                  className='bg-[#25D366] text-white px-10 py-5 rounded-full font-bold shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 flex items-center gap-3 mx-auto tracking-wide text-sm'
                >
                  ENVIAR COMPROBANTE WHATSAPP
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className='text-center mt-16 opacity-30 text-[10px] font-display tracking-[0.4em] text-black'>
          POWERED BY HOSPEDASUITE
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
