import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from 'framer-motion';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Wifi,
  ArrowRight,
  Loader,
  CreditCard,
  Coffee,
  Star,
  Tv,
  Wind,
  Mountain,
  Car,
  Utensils,
  PawPrint,
  X,
  Users,
  BedDouble,
  Lock,
  CloudSun,
  ShieldCheck,
  Thermometer,
  Sun,
  CloudRain,
  CloudFog,
  Info,
  Hand, // Icono para indicar gesto
} from 'lucide-react';

// --- ESTILOS GLOBALES ---
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Lato:wght@300;400;700&display=swap');
    body { background-color: #F9F8F6; color: #111111; } 
    .font-display { fontFamily: 'Cinzel', serif; }
    .font-serif { fontFamily: 'Playfair Display', serif; }
    .font-sans { fontFamily: 'Lato', sans-serif; }
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  `}</style>
);

const ROOM_PLACEHOLDER =
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80';
const DEFAULT_HERO =
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2070';

// --- MAPEO DE ICONOS ---
const AMENITY_ICONS = {
  Wifi: Wifi,
  TV: Tv,
  AC: Wind,
  'Agua Caliente': Coffee,
  'Caja Fuerte': Lock,
  Parqueadero: Car,
  Desayuno: Utensils,
  Vista: Mountain,
  'Baño Privado': Star,
  'Pet Friendly': PawPrint,
};

// --- COMPONENTE GALERÍA MOBILE FIRST (SWIPEABLE) ---
const ImageGallery = ({ images, title }) => {
  const scrollRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const gallery = images && images.length > 0 ? images : [ROOM_PLACEHOLDER];

  // Sincronizar índice con el scroll
  const handleScroll = () => {
    if (scrollRef.current) {
      const index = Math.round(
        scrollRef.current.scrollLeft / scrollRef.current.clientWidth
      );
      setCurrentIndex(index);
    }
  };

  const scrollToIndex = (index) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        left: index * scrollRef.current.clientWidth,
        behavior: 'smooth',
      });
    }
  };

  const next = (e) => {
    e?.stopPropagation();
    if (currentIndex < gallery.length - 1) {
      scrollToIndex(currentIndex + 1);
    }
  };

  const prev = (e) => {
    e?.stopPropagation();
    if (currentIndex > 0) {
      scrollToIndex(currentIndex - 1);
    }
  };

  return (
    <div className='relative w-full h-full bg-gray-100 group'>
      {/* Contenedor con Scroll Snap para gesto táctil */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className='w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide'
      >
        {gallery.map((img, idx) => (
          <div
            key={idx}
            className='w-full h-full flex-shrink-0 snap-center relative'
          >
            <img
              src={img}
              alt={`${title} ${idx}`}
              className='w-full h-full object-cover'
              loading={idx === 0 ? 'eager' : 'lazy'}
              decoding='async'
            />
            {/* Gradiente sutil para mejorar lectura de controles */}
            <div className='absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none' />
          </div>
        ))}
      </div>

      {gallery.length > 1 && (
        <>
          {/* Botones de Navegación (Desktop) */}
          <div className='absolute inset-0 flex justify-between items-center p-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none'>
            <button
              onClick={prev}
              className={`p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-black pointer-events-auto transition-all shadow-lg ${
                currentIndex === 0 ? 'opacity-0 invisible' : ''
              }`}
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={next}
              className={`p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-black pointer-events-auto transition-all shadow-lg ${
                currentIndex === gallery.length - 1 ? 'opacity-0 invisible' : ''
              }`}
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Indicadores (Dots) */}
          <div className='absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10'>
            {gallery.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  scrollToIndex(idx);
                }}
                className={`h-2 rounded-full transition-all shadow-sm ${
                  idx === currentIndex
                    ? 'bg-white w-6'
                    : 'bg-white/50 w-2 hover:bg-white/80'
                }`}
              />
            ))}
          </div>

          {/* Indicador visual de Swipe (Solo visible brevemente en móvil o hover) */}
          <div className='absolute bottom-10 left-1/2 -translate-x-1/2 md:hidden pointer-events-none opacity-60 text-white text-[10px] flex items-center gap-1 bg-black/20 px-2 py-1 rounded-full backdrop-blur-sm'>
            <Hand
              size={10}
              className='animate-pulse'
            />{' '}
            Desliza
          </div>
        </>
      )}
    </div>
  );
};

// --- WIDGET DE CLIMA ---
const WeatherWidget = ({ location }) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!location) {
      setLoading(false);
      return;
    }
    const timer = setTimeout(() => {
      const fetchWeather = async () => {
        try {
          let query = location
            .toLowerCase()
            .replace('vía', 'via')
            .split(',')[0]
            .split(' via ')[0]
            .trim();
          let geoRes = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
              query
            )}&count=1&language=es&format=json`
          );
          let geoData = await geoRes.json();
          if (!geoData.results || geoData.results.length === 0) {
            geoRes = await fetch(
              `https://geocoding-api.open-meteo.com/v1/search?name=Colombia&count=1&language=es&format=json`
            );
            geoData = await geoRes.json();
          }
          if (geoData.results && geoData.results.length > 0) {
            const { latitude, longitude } = geoData.results[0];
            const weatherRes = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
            );
            const weatherData = await weatherRes.json();
            setWeather(weatherData.current_weather);
          }
        } catch (error) {
          console.warn('Error widget clima:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchWeather();
    }, 1500);
    return () => clearTimeout(timer);
  }, [location]);

  const getWeatherIcon = (code) => {
    if (code === 0)
      return (
        <Sun
          size={18}
          className='text-yellow-400 animate-spin-slow'
        />
      );
    if (code >= 1 && code <= 3)
      return (
        <CloudSun
          size={18}
          className='text-yellow-200'
        />
      );
    if (code >= 45 && code <= 48)
      return (
        <CloudFog
          size={18}
          className='text-gray-300'
        />
      );
    if (code >= 51)
      return (
        <CloudRain
          size={18}
          className='text-blue-300'
        />
      );
    return (
      <Thermometer
        size={18}
        className='text-white'
      />
    );
  };

  const getTemperatureText = (temp) => {
    if (temp >= 25) return 'Clima Cálido';
    if (temp >= 18) return 'Clima Perfecto';
    if (temp >= 10) return 'Fresco & Acogedor';
    return 'Frío de Montaña';
  };

  if (loading)
    return (
      <div className='bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 flex items-center gap-2 text-white/70'>
        <Loader
          size={14}
          className='animate-spin'
        />
        <span className='text-xs'>Cargando...</span>
      </div>
    );

  if (!weather) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className='bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 flex items-center gap-3 text-white shadow-lg cursor-default hover:bg-white/20 transition-colors'
    >
      <div className='flex items-center gap-2'>
        {getWeatherIcon(weather.weathercode)}
        <span className='text-sm font-bold'>
          {Math.round(weather.temperature)}°C
        </span>
      </div>
      <div className='w-px h-4 bg-white/20'></div>
      <div className='text-xs font-medium opacity-90'>
        {getTemperatureText(weather.temperature)}
      </div>
    </motion.div>
  );
};

const BookingPage = () => {
  const { hotelId } = useParams();
  const [searchParams] = useSearchParams();
  const containerRef = useRef(null);
  const { scrollY } = useScroll();
  const yHero = useTransform(scrollY, [0, 500], [0, 200]);
  const opacityHero = useTransform(scrollY, [0, 300], [1, 0]);

  const [step, setStep] = useState(1);
  const [hotel, setHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [origin, setOrigin] = useState('direct');
  const [paymentOption, setPaymentOption] = useState('deposit');

  const [dates, setDates] = useState({
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
  });
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [viewingRoom, setViewingRoom] = useState(null);
  const [guest, setGuest] = useState({
    fullName: '',
    docNumber: '',
    email: '',
    phone: '',
    guestsCount: 1,
    comments: '',
  });

  useEffect(() => {
    const utmSource = searchParams.get('origen');
    if (utmSource) {
      setOrigin(utmSource);
      console.log('🏁 Origen detectado:', utmSource);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchHotelData = async () => {
      try {
        if (!hotelId) return;
        const [hotelRes, roomsRes] = await Promise.all([
          supabase.from('hotels').select('*').eq('id', hotelId).single(),
          supabase.from('rooms').select('*').eq('hotel_id', hotelId),
        ]);
        if (hotelRes.data) {
          setHotel(hotelRes.data);
          if (roomsRes.data) setRooms(roomsRes.data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchHotelData();
  }, [hotelId]);

  const checkAvailability = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(dates.checkIn) < today) return alert('⚠️ Fecha pasada.');
    if (new Date(dates.checkOut) <= new Date(dates.checkIn))
      return alert('⚠️ Salida debe ser después de llegada.');

    setProcessing(true);
    try {
      const { data: busy } = await supabase
        .from('bookings')
        .select('room_id')
        .eq('hotel_id', hotel.id)
        .neq('status', 'cancelled')
        .lt('check_in', dates.checkOut)
        .gt('check_out', dates.checkIn);

      const busyIds = busy?.map((b) => b.room_id) || [];
      const { data: all } = await supabase
        .from('rooms')
        .select('*')
        .eq('hotel_id', hotel.id);

      const available = all.filter(
        (r) => !busyIds.includes(r.id) && r.status !== 'maintenance'
      );

      if (available.length === 0) alert('😔 Sin disponibilidad.');
      else {
        setRooms(available);
        setStep(2);
      }
    } catch (e) {
      alert('Error de conexión.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    const maxCap = selectedRoom.capacity || 2;
    if (parseInt(guest.guestsCount) > maxCap)
      return alert(`⚠️ Máximo ${maxCap} personas.`);

    setProcessing(true);
    try {
      const { data: gData, error: gError } = await supabase
        .from('guests')
        .insert([
          {
            full_name: guest.fullName,
            doc_number: guest.docNumber,
            email: guest.email,
            phone: guest.phone,
            nationality: 'COL',
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
      const multiplier = selectedRoom.is_price_per_person
        ? parseInt(guest.guestsCount)
        : 1;
      const totalRoomPrice = (selectedRoom.price || 0) * nights * multiplier;

      const amountPaid =
        paymentOption === 'full' ? totalRoomPrice : totalRoomPrice / 2;
      const balanceDue = totalRoomPrice - amountPaid;

      const { error: bError } = await supabase.from('bookings').insert([
        {
          hotel_id: hotel.id,
          room_id: selectedRoom.id,
          guest_id: gData.id,
          check_in: dates.checkIn,
          check_out: dates.checkOut,
          total_price: totalRoomPrice,
          status: 'confirmed',
          notes: `Pax: ${guest.guestsCount}. Origen: ${origin}. Pago: ${
            paymentOption === 'full' ? '100%' : '50%'
          }. Saldo Pendiente: $${balanceDue}. Notas: ${guest.comments}`,
        },
      ]);

      if (bError) throw bError;
      setStep(4);
    } catch (e) {
      alert(e.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading)
    return (
      <div className='h-screen flex items-center justify-center'>
        <Loader className='animate-spin' />
      </div>
    );

  const totalNights = Math.max(
    1,
    Math.ceil((new Date(dates.checkOut) - new Date(dates.checkIn)) / 86400000)
  );
  const totalCost =
    (selectedRoom?.price || 0) *
    totalNights *
    (selectedRoom?.is_price_per_person ? parseInt(guest.guestsCount) || 1 : 1);
  const amountToPay = paymentOption === 'full' ? totalCost : totalCost / 2;
  const balanceDue = totalCost - amountToPay;

  return (
    <div
      ref={containerRef}
      className='min-h-screen bg-[#F9F8F6] font-sans text-[#111] pb-20'
    >
      <GlobalStyles />

      {/* HERO SECTION */}
      <div className='relative h-[65vh] bg-black overflow-hidden'>
        <motion.div
          style={{ y: yHero, opacity: opacityHero }}
          className='absolute inset-0'
        >
          <div className='absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#F9F8F6] z-10' />
          <img
            src={hotel?.main_image_url || DEFAULT_HERO}
            className='w-full h-full object-cover opacity-90'
            alt='Hotel Hero'
            fetchpriority='high'
          />
        </motion.div>

        <div className='absolute top-6 left-6 z-20'>
          <div className='flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-white border border-white/20 shadow-lg'>
            <ShieldCheck
              size={16}
              className='text-emerald-400'
            />
            <span className='text-xs font-bold tracking-wider'>
              GARANTÍA OFICIAL
            </span>
          </div>
        </div>

        <div className='absolute top-6 right-6 z-20'>
          <WeatherWidget location={hotel?.location} />
        </div>

        <div className='absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-6 pt-10 text-white'>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <span className='inline-block mb-4 text-[10px] font-bold tracking-[0.4em] uppercase opacity-80 border-b border-white/30 pb-1'>
              RESERVA DIRECTA
            </span>
            <h1 className='text-5xl md:text-8xl font-serif mb-4 drop-shadow-2xl'>
              {hotel?.name}
            </h1>
            {hotel?.tagline && (
              <p className='text-lg md:text-2xl font-light italic font-serif text-white/90 mb-6 tracking-wide'>
                "{hotel.tagline}"
              </p>
            )}
            <div className='flex gap-2 text-sm justify-center items-center opacity-80'>
              <MapPin size={16} /> {hotel?.location || 'Colombia'}
            </div>
          </motion.div>
        </div>
      </div>

      <div className='max-w-6xl mx-auto px-4 md:px-6 -mt-20 relative z-30'>
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className='bg-white rounded-[2.5rem] shadow-2xl p-6 md:p-12 border border-gray-100'
        >
          <AnimatePresence mode='wait'>
            {/* STEP 1: FECHAS */}
            {step === 1 && (
              <motion.div
                key='step1'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className='text-center max-w-2xl mx-auto'
              >
                <h2 className='text-3xl font-serif mb-8'>
                  Tu Escapada Inicia Aquí
                </h2>
                <div className='grid md:grid-cols-2 gap-6 mb-8'>
                  {['Llegada', 'Salida'].map((l, i) => (
                    <div
                      key={l}
                      className='text-left border-b py-2 group focus-within:border-black transition-colors'
                    >
                      <label className='text-[10px] font-bold uppercase text-gray-400 block mb-1'>
                        {l}
                      </label>
                      <input
                        type='date'
                        className='w-full font-serif text-2xl outline-none bg-transparent cursor-pointer'
                        value={i === 0 ? dates.checkIn : dates.checkOut}
                        onChange={(e) =>
                          setDates({
                            ...dates,
                            [i === 0 ? 'checkIn' : 'checkOut']: e.target.value,
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={checkAvailability}
                  disabled={processing}
                  className='bg-black text-white px-10 py-4 rounded-full font-bold text-xs tracking-widest hover:scale-105 transition-transform flex items-center gap-3 mx-auto shadow-lg shadow-black/20'
                >
                  {processing ? (
                    <Loader className='animate-spin' />
                  ) : (
                    <>
                      VER DISPONIBILIDAD <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {/* STEP 2: HABITACIONES */}
            {step === 2 && (
              <motion.div
                key='step2'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <button
                  onClick={() => setStep(1)}
                  className='mb-6 text-xs font-bold text-gray-400 flex items-center gap-1 hover:text-black'
                >
                  <ChevronLeft size={14} /> VOLVER AL CALENDARIO
                </button>
                <div className='grid gap-8'>
                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      onClick={() => setSelectedRoom(room)}
                      className={`cursor-pointer rounded-3xl overflow-hidden border transition-all ${
                        selectedRoom?.id === room.id
                          ? 'border-black ring-1 ring-black shadow-2xl'
                          : 'border-gray-100 hover:shadow-xl'
                      }`}
                    >
                      <div className='grid md:grid-cols-2 h-full'>
                        <div className='h-64 md:h-auto relative bg-gray-100'>
                          <img
                            src={
                              room.images?.[0] ||
                              room.image_url ||
                              ROOM_PLACEHOLDER
                            }
                            className='w-full h-full object-cover'
                            alt={room.name}
                            loading='lazy'
                            decoding='async'
                          />
                          <span className='absolute top-4 left-4 bg-white/90 px-3 py-1 rounded-full text-[10px] font-bold uppercase'>
                            {room.size ? `${room.size}m²` : 'Suite'}
                          </span>
                        </div>
                        <div className='p-8 flex flex-col justify-center'>
                          <div className='flex justify-between items-start mb-2'>
                            <h3 className='font-serif text-2xl'>{room.name}</h3>
                            <div className='text-right'>
                              <span className='block text-xl font-bold'>
                                ${(room.price || 0).toLocaleString()}
                              </span>
                              <span className='text-[10px] uppercase font-bold text-gray-400'>
                                {room.is_price_per_person
                                  ? '/Persona'
                                  : '/Noche'}
                              </span>
                            </div>
                          </div>
                          <div className='flex gap-3 mb-6 text-xs font-bold text-gray-500'>
                            <span className='bg-gray-50 px-3 py-1.5 rounded-lg flex gap-1'>
                              <Users size={12} /> {room.capacity} Pax
                            </span>
                            <span className='bg-gray-50 px-3 py-1.5 rounded-lg flex gap-1'>
                              <BedDouble size={12} /> {room.beds}
                            </span>
                          </div>
                          <p className='text-sm text-gray-500 line-clamp-2 mb-6'>
                            {room.description || 'Experiencia de lujo.'}
                          </p>
                          <div className='flex justify-between items-center mt-auto'>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingRoom(room);
                              }}
                              className='text-xs font-bold underline'
                            >
                              VER GALERÍA
                            </button>
                            {selectedRoom?.id === room.id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStep(3);
                                }}
                                className='bg-black text-white px-8 py-3 rounded-xl text-xs font-bold'
                              >
                                CONTINUAR
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 3: DATOS Y PAGO (CON BLINDAJE LEGAL) */}
            {step === 3 && (
              <motion.div
                key='step3'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <button
                  onClick={() => setStep(2)}
                  className='mb-6 text-xs font-bold text-gray-400 flex items-center gap-1'
                >
                  <ChevronLeft size={14} /> VOLVER
                </button>
                <div className='grid md:grid-cols-12 gap-10'>
                  <div className='md:col-span-7 space-y-8'>
                    <h2 className='text-3xl font-serif'>Datos de Reserva</h2>
                    {[
                      { l: 'Nombre Completo', k: 'fullName', t: 'text' },
                      { l: 'Documento ID', k: 'docNumber', t: 'text' },
                      { l: 'Teléfono', k: 'phone', t: 'tel' },
                      { l: 'Email', k: 'email', t: 'email' },
                    ].map((f) => (
                      <div key={f.k}>
                        <label className='text-[10px] font-bold uppercase text-gray-400'>
                          {f.l}
                        </label>
                        <input
                          type={f.t}
                          className='w-full border-b py-2 outline-none font-serif text-lg bg-transparent'
                          value={guest[f.k]}
                          onChange={(e) =>
                            setGuest({ ...guest, [f.k]: e.target.value })
                          }
                          required
                        />
                      </div>
                    ))}
                    <div className='flex gap-4'>
                      <div className='flex-1'>
                        <label className='text-[10px] font-bold uppercase text-gray-400'>
                          Huéspedes
                        </label>
                        <input
                          type='number'
                          min='1'
                          max={selectedRoom.capacity}
                          className='w-full border-b py-2 outline-none font-serif text-lg bg-transparent'
                          value={guest.guestsCount}
                          onChange={(e) =>
                            setGuest({ ...guest, guestsCount: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label className='text-[10px] font-bold uppercase text-gray-400'>
                        Peticiones
                      </label>
                      <textarea
                        className='w-full border-b py-2 outline-none bg-transparent resize-none'
                        value={guest.comments}
                        onChange={(e) =>
                          setGuest({ ...guest, comments: e.target.value })
                        }
                      />
                    </div>

                    <div className='pt-6'>
                      <h3 className='text-lg font-serif mb-4'>
                        Opciones de Pago
                      </h3>
                      <div className='grid grid-cols-2 gap-4'>
                        <div
                          onClick={() => setPaymentOption('deposit')}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            paymentOption === 'deposit'
                              ? 'border-black bg-gray-50'
                              : 'border-gray-100'
                          }`}
                        >
                          <div className='flex items-center gap-2 mb-2'>
                            <div
                              className={`w-4 h-4 rounded-full border border-black ${
                                paymentOption === 'deposit'
                                  ? 'bg-black'
                                  : 'bg-transparent'
                              }`}
                            />
                            <span className='font-bold text-sm'>
                              Abonar 50%
                            </span>
                          </div>
                          <p className='text-xs text-gray-500'>
                            Asegura tu reserva y paga el resto en el hotel.
                          </p>
                        </div>
                        <div
                          onClick={() => setPaymentOption('full')}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            paymentOption === 'full'
                              ? 'border-black bg-gray-50'
                              : 'border-gray-100'
                          }`}
                        >
                          <div className='flex items-center gap-2 mb-2'>
                            <div
                              className={`w-4 h-4 rounded-full border border-black ${
                                paymentOption === 'full'
                                  ? 'bg-black'
                                  : 'bg-transparent'
                              }`}
                            />
                            <span className='font-bold text-sm'>
                              Pagar 100%
                            </span>
                          </div>
                          <p className='text-xs text-gray-500'>
                            Deja todo listo y olvídate de pagos al llegar.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className='pt-6'>
                      <label className='flex items-start gap-3 cursor-pointer p-4 border rounded-xl hover:bg-gray-50'>
                        <input
                          type='checkbox'
                          required
                          className='mt-1'
                        />
                        <div className='text-xs text-gray-500'>
                          <p className='mb-2'>
                            Acepto los{' '}
                            <b className='text-black'>Términos y Condiciones</b>{' '}
                            y la Política de Privacidad.
                          </p>
                          <p className='text-[10px] text-gray-400 leading-tight'>
                            <strong>Mandato de Gestión de Cobro:</strong>{' '}
                            Autorizo a HospedaSuite a recaudar el pago en nombre
                            de <b>{hotel.name}</b>. Entiendo que HospedaSuite
                            actúa como intermediario tecnológico y que la
                            factura final será emitida por el hotel.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className='md:col-span-5'>
                    <div className='bg-[#111] text-white p-8 rounded-3xl sticky top-8 shadow-2xl'>
                      <h3 className='font-display text-lg mb-6 border-b border-white/20 pb-4'>
                        RESUMEN
                      </h3>
                      <div className='space-y-3 text-sm text-gray-400 mb-8'>
                        <div className='flex justify-between'>
                          <span>Entrada</span>{' '}
                          <span className='text-white'>{dates.checkIn}</span>
                        </div>
                        <div className='flex justify-between'>
                          <span>Salida</span>{' '}
                          <span className='text-white'>{dates.checkOut}</span>
                        </div>
                        <div className='flex justify-between'>
                          <span>Noches</span>{' '}
                          <span className='text-white'>{totalNights}</span>
                        </div>
                        <div className='pt-4 text-white font-serif text-lg italic'>
                          {selectedRoom.name}
                        </div>
                      </div>
                      <div className='flex justify-between items-end mb-8 pt-4 border-t border-white/20'>
                        <span className='text-xs font-bold uppercase text-gray-500'>
                          A Pagar Hoy (
                          {paymentOption === 'full' ? '100%' : '50%'})
                        </span>
                        <span className='text-4xl font-serif text-emerald-400'>
                          ${amountToPay.toLocaleString()}
                        </span>
                      </div>
                      {balanceDue > 0 && (
                        <div className='mb-6 p-3 bg-red-900/30 border border-red-500/30 rounded-lg flex justify-between items-center'>
                          <span className='text-xs text-red-300 uppercase font-bold'>
                            Saldo Pendiente
                          </span>
                          <span className='text-lg font-bold text-red-300'>
                            ${balanceDue.toLocaleString()}
                          </span>
                        </div>
                      )}
                      <button
                        onClick={handleCreateBooking}
                        disabled={processing}
                        className='w-full bg-white text-black py-4 rounded-xl font-bold text-xs tracking-widest hover:bg-gray-200'
                      >
                        {processing ? 'CONFIRMANDO...' : 'IR A PAGAR'}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: CONFIRMACIÓN (CON SEMÁFORO GIGANTE) */}
            {step === 4 && (
              <motion.div
                key='step4'
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className='text-center py-12'
              >
                <div className='inline-flex p-4 bg-green-50 text-green-600 rounded-full mb-6 ring-8 ring-green-50/50'>
                  <Check size={40} />
                </div>
                <h2 className='text-4xl md:text-5xl font-serif mb-4'>
                  ¡Reserva Confirmada!
                </h2>
                <p className='text-gray-500 text-lg mb-10'>
                  Código:{' '}
                  <b className='text-black'>
                    #{Math.floor(1000 + Math.random() * 9000)}
                  </b>
                </p>

                <div className='max-w-md mx-auto bg-white border p-8 rounded-3xl shadow-xl mb-8 relative overflow-hidden'>
                  {/* SEMÁFORO VISUAL */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-2 ${
                      balanceDue > 0 ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
                  />

                  <div className='flex justify-between items-center mb-6 border-b pb-6'>
                    <div className='text-left'>
                      <p className='text-[10px] font-bold uppercase text-gray-400'>
                        TOTAL RESERVA
                      </p>
                      <p className='text-xl font-bold'>
                        ${totalCost.toLocaleString()}
                      </p>
                    </div>
                    <div className='text-right'>
                      <p className='text-[10px] font-bold uppercase text-gray-400'>
                        PAGADO HOY
                      </p>
                      <p className='text-xl font-bold text-emerald-600'>
                        ${amountToPay.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* 🔥 SEMÁFORO DE TEXTO EXACTO SOLICITADO */}
                  {balanceDue > 0 ? (
                    <div className='bg-red-50 p-4 rounded-xl border border-red-100 flex items-center gap-4'>
                      <div className='bg-red-100 p-2 rounded-full text-red-600'>
                        <Info size={20} />
                      </div>
                      <div className='text-left'>
                        <p className='text-xs font-bold text-red-600 uppercase mb-1'>
                          🔴 PENDIENTE DE PAGO
                        </p>
                        <p className='text-2xl font-bold text-red-700'>
                          ${balanceDue.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className='bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center gap-4'>
                      <div className='bg-emerald-100 p-2 rounded-full text-emerald-600'>
                        <Check size={20} />
                      </div>
                      <div className='text-left'>
                        <p className='text-xs font-bold text-emerald-600 uppercase mb-1'>
                          🟢 PAGADO TOTALMENTE
                        </p>
                        <p className='text-xs text-gray-500'>
                          No debes pagar nada al llegar.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className='mt-8 pt-6 border-t'>
                    <p className='text-[10px] font-bold uppercase text-gray-400 mb-4'>
                      COMPLETAR PAGO AHORA
                    </p>
                    <button
                      onClick={() =>
                        window.open(
                          `https://wa.me/${
                            hotel?.phone
                          }?text=Hola, envío comprobante de reserva por valor de $${amountToPay.toLocaleString()} (${
                            paymentOption === 'full' ? 'Total' : '50%'
                          }).`,
                          '_blank'
                        )
                      }
                      className='w-full bg-[#25D366] text-white px-8 py-4 rounded-full font-bold text-sm shadow-lg hover:bg-[#128C7E] flex items-center justify-center gap-2'
                    >
                      <CreditCard size={16} /> Enviar Comprobante WhatsApp
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* MODAL GALERÍA (SWIPEABLE) */}
      <AnimatePresence>
        {viewingRoom && (
          <div
            className='fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md'
            onClick={() => setViewingRoom(null)}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className='bg-white w-full max-w-5xl h-[85vh] rounded-[2rem] overflow-hidden flex flex-col md:flex-row relative shadow-2xl'
            >
              <button
                onClick={() => setViewingRoom(null)}
                className='absolute top-4 right-4 z-20 bg-white/50 p-2 rounded-full hover:bg-black hover:text-white transition-colors'
              >
                <X size={20} />
              </button>
              <div className='md:w-3/5 h-1/2 md:h-full bg-gray-100'>
                <ImageGallery
                  images={
                    viewingRoom.images && viewingRoom.images.length > 0
                      ? viewingRoom.images
                      : [viewingRoom.image_url]
                  }
                  title={viewingRoom.name}
                />
              </div>
              <div className='md:w-2/5 p-8 md:p-10 overflow-y-auto bg-white'>
                <h2 className='font-serif text-3xl mb-2'>{viewingRoom.name}</h2>
                <div className='text-2xl font-bold mb-6'>
                  ${(viewingRoom.price || 0).toLocaleString()}{' '}
                  <span className='text-xs font-normal text-gray-500'>
                    / Noche
                  </span>
                </div>
                <p className='text-sm text-gray-600 mb-8 leading-relaxed'>
                  {viewingRoom.description || 'Sin descripción.'}
                </p>
                <h3 className='text-xs font-bold uppercase mb-4'>
                  Comodidades
                </h3>
                <div className='grid grid-cols-2 gap-3 mb-8'>
                  {(viewingRoom.amenities || []).map((a) => {
                    const I = AMENITY_ICONS[a] || Star;
                    return (
                      <div
                        key={a}
                        className='flex gap-2 text-xs bg-gray-50 p-2 rounded-lg text-gray-600'
                      >
                        <I size={14} /> {a}
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => {
                    setSelectedRoom(viewingRoom);
                    setViewingRoom(null);
                    setStep(3);
                  }}
                  className='w-full bg-black text-white py-4 rounded-xl font-bold text-xs tracking-widest'
                >
                  RESERVAR AHORA
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BookingPage;
