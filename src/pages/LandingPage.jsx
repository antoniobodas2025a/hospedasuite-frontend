import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useLocation } from 'react-router-dom'; // Agregado useLocation para UTMs
import {
  motion,
  useScroll,
  useMotionValueEvent,
  AnimatePresence,
} from 'framer-motion';
import { supabase } from '../supabaseClient';
import {
  CheckCircle2,
  Clock,
  ChevronRight,
  Star,
  Smartphone,
  ArrowLeft,
  User,
  MapPin,
  Gift,
  Mic,
  Globe,
  Lock,
  Zap,
  Share2,
  LayoutGrid,
  Percent,
  Building2,
  TrendingUp,
} from 'lucide-react';
import SalesAgent from '../components/SalesAgent';

// ==========================================
// 🎨 DISEÑO MAC 2026: Minimalismo & Cristal
// ==========================================

const LogoMinimal = () => (
  <div className='flex items-center gap-2.5'>
    <div className='w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20'>
      <Building2
        className='text-white w-5 h-5'
        strokeWidth={2.5}
      />
    </div>
    <span className='font-bold text-xl tracking-tight text-slate-900'>
      Hospeda<span className='text-slate-500'>Suite</span>
    </span>
  </div>
);

// Tarjeta Estándar (Fondo Claro)
const BentoCard = ({ children, className = '' }) => (
  <div
    className={`bg-white/80 backdrop-blur-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2.5rem] ${className}`}
  >
    {children}
  </div>
);

const GlassCard = BentoCard;

// Tarjeta Oscura (Alto Contraste para Plan Pro)
const BentoCardDark = ({ children, className = '' }) => (
  <div
    className={`bg-[#0f172a] text-white border border-slate-800 shadow-2xl shadow-blue-900/20 rounded-[2.5rem] ${className}`}
  >
    {children}
  </div>
);

const DarkCard = BentoCardDark;

const Pill = ({ text, icon: Icon, color = 'dark' }) => {
  const styles = {
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    dark: 'bg-slate-900 text-white border-slate-800 shadow-lg shadow-slate-900/20',
  };
  return (
    <span
      className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border ${
        styles[color] || styles.dark
      }`}
    >
      {Icon && (
        <Icon
          size={14}
          strokeWidth={2.5}
        />
      )}{' '}
      {text}
    </span>
  );
};

const LandingPage = () => {
  const { city_slug } = useParams();
  const location = useLocation(); // Hook para leer URL params (UTMs)

  // --- LÓGICA DE NEGOCIO ---
  const cleanCitySlug = city_slug
    ? decodeURIComponent(city_slug).replace(/['"]+/g, '').trim().toLowerCase()
    : 'Colombia';

  const cityName =
    cleanCitySlug === 'colombia'
      ? 'Tu Ciudad'
      : cleanCitySlug
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

  const [launchData, setLaunchData] = useState({ total: 12, taken: 0 });
  const [spotsTaken, setSpotsTaken] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formStatus, setFormStatus] = useState('idle');
  const [formStep, setFormStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState('PIONERO');
  const [isNavHidden, setIsNavHidden] = useState(false);

  const { scrollY } = useScroll();

  const [formData, setFormData] = useState({
    ownerName: '',
    hotelName: '',
    email: '',
    phone: '',
    rooms: '',
    currentSoftware: '',
    acceptMandate: false,
    _honey: '',
  });

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setIsNavHidden(latest > 100);
  });

  // Función auxiliar para capturar UTMs
  const getUTMParams = () => {
    const params = new URLSearchParams(location.search);
    return {
      utm_source: params.get('utm_source') || 'direct',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_content: params.get('utm_content') || '',
    };
  };

  // Conexión a Supabase (Launch Control)
  useEffect(() => {
    const fetchLaunchData = async () => {
      try {
        const { data } = await supabase
          .from('launch_control')
          .select('total_spots, spots_taken')
          .eq('city_slug', cleanCitySlug)
          .maybeSingle();

        const DEFAULT_TOTAL = 12;
        if (data) {
          setLaunchData({
            total: data.total_spots || DEFAULT_TOTAL,
            taken: data.spots_taken || 0,
          });
          setSpotsTaken(data.spots_taken || 0);
        } else {
          setLaunchData({ total: DEFAULT_TOTAL, taken: 3 });
          setSpotsTaken(3);
        }
      } catch (error) {
        console.error('Error:', error);
        setSpotsTaken(3);
      }
    };
    fetchLaunchData();
  }, [cleanCitySlug]);

  const spotsLeft = Math.max(0, launchData.total - spotsTaken);
  const progressPercent = Math.min((spotsTaken / launchData.total) * 100, 100);

  const scrollToForm = (plan, defaultRooms) => {
    setSelectedPlan(plan);
    if (defaultRooms) {
      setFormData((prev) => ({ ...prev, rooms: defaultRooms }));
    }
    document
      .getElementById('activation-form')
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNextStep = () => {
    if (formData.ownerName.trim().length < 3)
      return alert('Por favor dinos tu nombre completo.');

    const phoneRegex = /^[0-9+\s-]{7,}$/;
    if (!phoneRegex.test(formData.phone))
      return alert('Necesitamos un número de WhatsApp válido.');

    setFormStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData._honey) return;

    if (!formData.acceptMandate)
      return alert('Debes aceptar el acuerdo de gestión para continuar.');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return alert('Por favor ingresa un correo electrónico válido.');
    }

    setLoading(true);
    try {
      // 🛠️ MEJORA: Captura de UTMs para inteligencia de marketing
      const utms = getUTMParams();

      const { error } = await supabase.from('platform_leads').insert([
        {
          full_name: formData.ownerName,
          hotel_name: formData.hotelName,
          phone: formData.phone,
          email: formData.email,
          city_interest: cityName,
          metadata: {
            rooms_range: formData.rooms,
            software: formData.currentSoftware,
            status: 'PROMO_APPLICANT',
            source_url: window.location.href,
            plan_interest: selectedPlan,
            marketing: utms, // Datos de campaña agregados
            offer_claimed:
              selectedPlan === 'SEMILLA' ? 'FREE_TIER' : '3_MONTHS_FREE',
            mandate_accepted: true,
            user_agent: navigator.userAgent,
          },
        },
      ]);

      if (!error) {
        const planMsg =
          selectedPlan === 'SEMILLA'
            ? 'Quiero mi cuenta GRATIS (1-2 Habs).'
            : 'Quiero la oferta PIONEROS (3 Meses Gratis).';

        const message = `Hola, soy ${formData.ownerName} del hotel ${formData.hotelName}. ${planMsg} Mi correo es ${formData.email}.`;

        // 🛠️ FIX CRÍTICO: Redirección segura para móviles (evita bloqueo de pop-ups)
        const whatsappUrl = `https://wa.me/573213795015?text=${encodeURIComponent(message)}`;

        setSpotsTaken((prev) => Math.min(prev + 1, launchData.total));
        setFormStatus('success');

        // Redirección directa en la misma pestaña para garantizar conversión
        setTimeout(() => {
          window.location.href = whatsappUrl;
        }, 1000); // Pequeño delay para mostrar el check verde un instante
      } else {
        throw error;
      }
    } catch (err) {
      console.error('Error registro:', err);
      alert(
        'Hubo un problema guardando tu solicitud. Por favor intenta de nuevo.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-[#F2F4F7] font-sans text-slate-900 overflow-x-hidden selection:bg-slate-200'>
      <Helmet>
        <title>HospedaSuite | Software para Hoteles en {cityName}</title>
      </Helmet>

      {/* --- FONDO AMBIENTAL --- */}
      <div className='fixed inset-0 pointer-events-none overflow-hidden bg-[#F2F4F7]'>
        <div className='absolute top-[-10%] left-[-10%] w-[1200px] h-[1200px] bg-white rounded-full blur-[150px] opacity-60' />
        <div className='absolute top-[20%] right-[-10%] w-[800px] h-[800px] bg-blue-100/40 rounded-full blur-[120px] mix-blend-multiply animate-pulse-slow' />
      </div>

      {/* --- NAVBAR --- */}
      <motion.nav
        animate={isNavHidden ? { y: -100 } : { y: 0 }}
        className='fixed top-6 inset-x-0 z-50 flex justify-center pointer-events-none px-4'
      >
        <div className='pointer-events-auto flex items-center gap-6 pl-5 pr-6 py-3 rounded-2xl bg-white/90 backdrop-blur-xl border border-white/60 shadow-lg shadow-slate-200/20'>
          <LogoMinimal />
          <div className='h-5 w-px bg-slate-200' />
          <div className='flex items-center gap-2 text-sm font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg'>
            <MapPin
              size={14}
              className='text-slate-900'
            />{' '}
            {cityName}
          </div>
        </div>
      </motion.nav>

      <main className='relative z-10 pt-44 pb-20 px-4 md:px-8 max-w-7xl mx-auto'>
        {/* --- HERO --- */}
        <div className='text-center max-w-4xl mx-auto mb-24'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Pill
              icon={Zap}
              text='Software Hotelero 2026'
              color='dark'
            />
            <h1 className='text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mt-8 mb-8 leading-[1.1]'>
              Gestiona tu hotel <br />
              <span className='text-slate-400'>desde el celular.</span>
            </h1>
            <p className='text-xl md:text-2xl text-slate-600 max-w-2xl mx-auto mb-12 leading-relaxed font-medium'>
              Sin computadores lentos. Sin hojas de cálculo. <br />
              Todo automático, fácil y bonito.
            </p>

            {/* --- CONTADOR DE CUPOS --- */}
            <div className='inline-flex items-center gap-5 bg-white p-3 pr-8 rounded-full shadow-xl shadow-slate-200/50 border border-white/60 mb-12'>
              <div className='relative w-14 h-14 flex items-center justify-center'>
                <svg className='transform -rotate-90 w-14 h-14'>
                  <circle
                    cx='28'
                    cy='28'
                    r='24'
                    stroke='#e2e8f0'
                    strokeWidth='5'
                    fill='transparent'
                  />
                  <circle
                    cx='28'
                    cy='28'
                    r='24'
                    stroke='#0f172a'
                    strokeWidth='5'
                    fill='transparent'
                    strokeDasharray={150.7}
                    strokeDashoffset={150.7 - (progressPercent / 100) * 150.7}
                    className='transition-all duration-1000 ease-out'
                  />
                </svg>
                <span className='absolute text-sm font-bold text-slate-900'>
                  {spotsLeft}
                </span>
              </div>
              <div className='text-left'>
                <p className='text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5'>
                  Cupos Disponibles
                </p>
                <p className='text-base font-bold text-slate-900'>
                  Configuración Gratis en {cityName}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* --- COMISIONES EXPLICADAS --- */}
        <section className='mb-32'>
          <div className='text-center mb-16'>
            <h2 className='text-4xl font-bold mb-6 text-slate-900'>
              Cuentas Claras
            </h2>
            <p className='text-xl text-slate-600 max-w-2xl mx-auto'>
              Un modelo justo donde tú controlas tu dinero.
            </p>
          </div>

          <div className='grid md:grid-cols-2 gap-8 max-w-5xl mx-auto'>
            {/* Tarjeta 0% - Tus Ventas */}
            <GlassCard className='p-10 relative overflow-hidden hover:border-emerald-300 transition-all duration-300 group'>
              <div className='absolute top-0 right-0 p-6 bg-emerald-100 rounded-bl-[2.5rem]'>
                <span className='text-4xl font-bold text-emerald-600 tracking-tighter'>
                  0%
                </span>
              </div>
              <div className='flex items-center gap-5 mb-8'>
                <div className='p-4 bg-emerald-100 rounded-2xl text-emerald-700'>
                  <Share2
                    size={28}
                    strokeWidth={2}
                  />
                </div>
                <div>
                  <h3 className='text-2xl font-bold text-slate-900'>
                    Venta Directa
                  </h3>
                  <p className='text-sm font-bold text-emerald-600 uppercase tracking-wider mt-1'>
                    Tus Clientes
                  </p>
                </div>
              </div>
              <p className='text-lg text-slate-600 mb-8 leading-relaxed font-medium'>
                Si el cliente te escribe por <b>WhatsApp, Instagram</b> o llega
                a tu recepción, es mérito tuyo. <br />
                <span className='text-emerald-600 font-bold'>
                  No te cobramos nada.
                </span>
              </p>
            </GlassCard>

            {/* Tarjeta 10% - Nuestras Ventas */}
            <GlassCard className='p-10 relative overflow-hidden hover:border-blue-300 transition-all duration-300 group'>
              <div className='absolute top-0 right-0 p-6 bg-blue-100 rounded-bl-[2.5rem]'>
                <span className='text-4xl font-bold text-blue-600 tracking-tighter'>
                  10%
                </span>
              </div>
              <div className='flex items-center gap-5 mb-8'>
                <div className='p-4 bg-blue-100 rounded-2xl text-blue-700'>
                  <Globe
                    size={28}
                    strokeWidth={2}
                  />
                </div>
                <div>
                  <h3 className='text-2xl font-bold text-slate-900'>
                    Ventas Web
                  </h3>
                  <p className='text-sm font-bold text-blue-600 uppercase tracking-wider mt-1'>
                    Nuestros Clientes
                  </p>
                </div>
              </div>
              <p className='text-lg text-slate-600 mb-8 leading-relaxed font-medium'>
                Si el cliente reserva a través de <b>HospedaSuite.com</b>,
                nosotros hicimos la venta. <br />
                <span className='text-blue-600 font-bold'>
                  Solo el 10%
                </span>{' '}
                (Booking cobra hasta 25%).
              </p>
            </GlassCard>
          </div>
        </section>

        {/* --- FUNCIONES REALES --- */}
        <section className='mb-32'>
          <div className='grid md:grid-cols-3 gap-6 auto-rows-[minmax(240px,auto)]'>
            <GlassCard className='md:col-span-2 p-10 flex flex-col justify-between overflow-hidden relative group'>
              <div className='relative z-10'>
                <Pill
                  text='Tranquilidad Total'
                  icon={LayoutGrid}
                  color='purple'
                />
                <h3 className='text-3xl font-bold mt-6 mb-4 text-slate-900'>
                  Adiós a las Reservas Dobles
                </h3>
                <p className='text-lg text-slate-600 max-w-md font-medium'>
                  Si te reservan en Booking o Airbnb{' '}
                  <span className='text-slate-900 font-bold'>
                    nosotros bloqueamos esa fecha al instante.
                  </span>
                  {/* 🛠️ MEJORA DE COPY: Apelando al miedo financiero/reputacional */}
                  <span className='block mt-3 text-purple-700 font-bold bg-purple-50 p-2 rounded-lg inline-block'>
                    Evita multas y malas reseñas.
                  </span>
                </p>
              </div>
              <div className='absolute right-[-20px] bottom-[-20px] w-72 h-72 bg-purple-100 rounded-full blur-3xl opacity-60 group-hover:scale-110 transition-transform duration-700' />
            </GlassCard>

            <GlassCard className='p-8 flex flex-col justify-between hover:bg-white/90 transition-colors'>
              <Pill
                text='Productividad' // Más preciso que "Asistente IA"
                icon={Mic}
                color='blue'
              />
              <div>
                <h3 className='text-2xl font-bold mt-4 mb-2 text-slate-900'>
                  Dictado de Reservas
                </h3>
                <p className='text-base text-slate-600'>
                  Dicta los datos y el sistema llena el formulario por ti.
                  <br />
                  <span className='font-bold text-slate-800'>
                    Registra huéspedes en segundos.
                  </span>
                </p>
              </div>
            </GlassCard>

            <GlassCard className='p-8 flex flex-col justify-between hover:bg-white/90 transition-colors'>
              <Pill
                text='Restaurante'
                icon={TrendingUp}
                color='green'
              />
              <div>
                <h3 className='text-2xl font-bold mt-4 mb-2 text-slate-900'>
                  Menú Digital
                </h3>
                <p className='text-base text-slate-600'>
                  Tus huéspedes piden comida desde su celular escaneando un
                  código QR.
                </p>
              </div>
            </GlassCard>

            <GlassCard className='p-8 flex flex-col justify-between hover:bg-white/90 transition-colors'>
              <Pill
                text='Recepción'
                icon={Smartphone}
                color='blue'
              />
              <div>
                <h3 className='text-2xl font-bold mt-4 mb-2 text-slate-900'>
                  Check-in Rápido
                </h3>
                <p className='text-base text-slate-600'>
                  Escanea la cédula con tu cámara. Sin digitar nada. Rápido y
                  legal.
                </p>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* --- PRECIOS --- */}
        <section
          id='pricing'
          className='mb-32'
        >
          <div className='text-center mb-16'>
            <h2 className='text-4xl font-bold mb-6 text-slate-900'>
              Precios Transparentes
            </h2>
            <p className='text-xl text-slate-600'>Crece con nosotros.</p>
          </div>

          <div className='grid md:grid-cols-3 gap-8'>
            {/* PLAN SEMILLA */}
            <GlassCard className='p-10 flex flex-col h-full hover:border-slate-300 transition-colors'>
              <div className='mb-6'>
                <span className='text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-3 py-1 rounded-full'>
                  Pequeño
                </span>
              </div>
              <div className='flex items-baseline gap-1 mb-6'>
                <span className='text-5xl font-bold text-slate-900 tracking-tight'>
                  $29.900
                </span>
                <span className='text-slate-500 font-medium'>/mes</span>
              </div>
              <p className='text-base text-slate-600 mb-8 font-medium'>
                Perfecto para casas o apartamentos.
              </p>
              <ul className='space-y-4 mb-10 text-sm font-bold text-slate-700 flex-1'>
                <li className='flex gap-3'>
                  <CheckCircle2
                    size={18}
                    className='text-slate-900'
                  />
                  1 - 2 Habitaciones
                </li>
                <li className='flex gap-3'>
                  <CheckCircle2
                    size={18}
                    className='text-slate-900'
                  />
                  Registro Rápido
                </li>
                <li className='flex gap-3'>
                  <CheckCircle2
                    size={18}
                    className='text-slate-900'
                  />
                  Reportes Legales
                </li>
              </ul>
              <button
                onClick={() => scrollToForm('SEMILLA', '1-2')}
                className='w-full py-4 rounded-2xl bg-slate-100 text-slate-900 font-bold hover:bg-slate-200 transition-colors text-sm uppercase tracking-wide'
              >
                Elegir Gratis
              </button>
            </GlassCard>

            {/* PLAN PIONERO */}
            <DarkCard className='p-10 flex flex-col h-full relative transform md:-translate-y-6'>
              <div className='absolute top-0 right-0 bg-blue-600 text-[10px] font-bold px-4 py-1.5 rounded-bl-2xl uppercase tracking-wider'>
                Oferta Pioneros
              </div>
              <div className='mb-6'>
                <span className='text-xs font-bold uppercase tracking-wider text-blue-300 bg-blue-900/30 px-3 py-1 rounded-full'>
                  Hotel / Hostal
                </span>
              </div>
              <div className='flex items-baseline gap-1 mb-6'>
                <span className='text-6xl font-bold tracking-tight text-white'>
                  $89.900
                </span>
                <span className='text-slate-400 font-medium'>/mes</span>
              </div>
              <p className='text-base text-slate-300 mb-8 font-medium'>
                Control total para tu negocio.
              </p>
              <ul className='space-y-4 mb-10 text-sm font-bold text-slate-200 flex-1'>
                <li className='flex gap-3'>
                  <Star
                    size={18}
                    className='text-yellow-400'
                  />
                  3 - 12 Habitaciones
                </li>
                <li className='flex gap-3'>
                  <CheckCircle2
                    size={18}
                    className='text-blue-400'
                  />
                  Sincronización OTA
                </li>
                <li className='flex gap-3'>
                  <CheckCircle2
                    size={18}
                    className='text-blue-400'
                  />
                  Ayuda Prioritaria
                </li>
                <li className='flex gap-3 text-emerald-400 bg-emerald-900/30 p-2 rounded-lg justify-center mt-4'>
                  <Gift size={18} /> 3 Meses GRATIS
                </li>
              </ul>
              <button
                onClick={() => scrollToForm('PIONERO', '3-12')}
                className='w-full py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-colors text-sm uppercase tracking-wide shadow-lg shadow-blue-600/30'
              >
                Reclamar Oferta
              </button>
              {/* 🛠️ MEJORA DE CONVERSIÓN: Reductor de fricción */}
              <p className='text-center text-[10px] text-slate-400 mt-3 uppercase tracking-wider font-bold'>
                No requiere tarjeta de crédito
              </p>
            </DarkCard>

            {/* PLAN EMPRESARIAL */}
            <GlassCard className='p-10 flex flex-col h-full hover:border-slate-300 transition-colors'>
              <div className='mb-6'>
                <span className='text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-3 py-1 rounded-full'>
                  Empresarial
                </span>
              </div>
              <div className='flex items-baseline gap-1 mb-6'>
                <span className='text-5xl font-bold text-slate-900 tracking-tight'>
                  $159.900
                </span>
                <span className='text-slate-500 font-medium'>/mes</span>
              </div>
              <p className='text-base text-slate-600 mb-8 font-medium'>
                Para hoteles con alto volumen.
              </p>
              <ul className='space-y-4 mb-10 text-sm font-bold text-slate-700 flex-1'>
                <li className='flex gap-3'>
                  <Zap
                    size={18}
                    className='text-purple-600'
                  />
                  13+ Habitaciones
                </li>
                <li className='flex gap-3'>
                  <CheckCircle2
                    size={18}
                    className='text-purple-600'
                  />
                  Múltiples Usuarios
                </li>
                <li className='flex gap-3'>
                  <CheckCircle2
                    size={18}
                    className='text-purple-600'
                  />
                  Auditoría de Cambios
                </li>
              </ul>
              <button
                onClick={() => scrollToForm('EMPRESARIAL', '13+')}
                className='w-full py-4 rounded-2xl bg-slate-100 text-slate-900 font-bold hover:bg-slate-200 transition-colors text-sm uppercase tracking-wide'
              >
                Contactar Ventas
              </button>
            </GlassCard>
          </div>
        </section>

        {/* --- FORMULARIO --- */}
        <section
          id='activation-form'
          className='max-w-2xl mx-auto mb-20'
        >
          <GlassCard className='overflow-hidden border-white/80'>
            <div className='h-1.5 w-full bg-slate-100'>
              <motion.div
                className='h-full bg-slate-900'
                animate={{ width: formStep === 1 ? '50%' : '100%' }}
              />
            </div>

            <div className='p-10 md:p-14'>
              {formStatus === 'success' ? (
                <div className='text-center py-10'>
                  <div className='w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner'>
                    <CheckCircle2 size={48} />
                  </div>
                  <h3 className='text-3xl font-bold text-slate-900 mb-4'>
                    ¡Solicitud Recibida!
                  </h3>
                  <p className='text-lg text-slate-600 font-medium'>
                    Redirigiendo a WhatsApp para activar tu cuenta...
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className='text-center mb-10'>
                    <h3 className='text-3xl font-bold text-slate-900 mb-2'>
                      {selectedPlan === 'SEMILLA'
                        ? 'Crea tu Cuenta Gratis'
                        : 'Activa tu Promoción'}
                    </h3>
                    <p className='text-sm font-bold text-slate-500 flex items-center justify-center gap-2 bg-slate-100 py-2 px-4 rounded-full w-fit mx-auto'>
                      <Lock size={14} /> {spotsLeft} cupos restantes en{' '}
                      {cityName}
                    </p>
                  </div>

                  <AnimatePresence mode='wait'>
                    {formStep === 1 && (
                      <motion.div
                        key='step1'
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className='space-y-5'
                      >
                        {/* INPUTS STEP 1 (Mantienen funcionalidad) */}
                        <div>
                          <label className='text-xs font-bold uppercase text-slate-500 ml-1 mb-1 block'>
                            Tu Nombre
                          </label>
                          <div className='relative'>
                            <User
                              className='absolute left-4 top-4 text-slate-400'
                              size={20}
                            />
                            <input
                              type='text'
                              required
                              className='w-full pl-12 p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-slate-900 font-medium text-lg'
                              placeholder='Ej: Carlos Ruiz'
                              value={formData.ownerName}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  ownerName: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <label className='text-xs font-bold uppercase text-slate-500 ml-1 mb-1 block'>
                            WhatsApp
                          </label>
                          <div className='relative'>
                            <Smartphone
                              className='absolute left-4 top-4 text-slate-400'
                              size={20}
                            />
                            <input
                              type='tel'
                              required
                              className='w-full pl-12 p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-slate-900 font-medium text-lg'
                              placeholder='300 123 4567'
                              value={formData.phone}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  phone: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                        <button
                          type='button'
                          onClick={handleNextStep}
                          className='w-full py-5 bg-slate-900 text-white font-bold text-lg rounded-2xl mt-4 flex items-center justify-center gap-3 hover:bg-slate-800 shadow-xl shadow-slate-900/20 transition-all'
                        >
                          Siguiente <ChevronRight size={20} />
                        </button>
                      </motion.div>
                    )}

                    {formStep === 2 && (
                      <motion.div
                        key='step2'
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className='space-y-5'
                      >
                        {/* INPUTS STEP 2 */}
                        <div className='grid grid-cols-2 gap-5'>
                          <div>
                            <label className='text-[10px] font-bold uppercase text-slate-500 mb-1 block'>
                              Nombre del Hotel
                            </label>
                            <input
                              type='text'
                              required
                              className='w-full p-4 bg-slate-50 rounded-2xl border-none font-medium'
                              placeholder='Hotel Paraíso'
                              value={formData.hotelName}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  hotelName: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className='text-[10px] font-bold uppercase text-slate-500 mb-1 block'>
                              Correo Electrónico
                            </label>
                            <input
                              type='email'
                              required
                              className='w-full p-4 bg-slate-50 rounded-2xl border-none font-medium'
                              placeholder='correo@'
                              value={formData.email}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  email: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                        <div className='grid grid-cols-2 gap-5'>
                          <div>
                            <label className='text-[10px] font-bold uppercase text-slate-500 mb-1 block'>
                              Habitaciones
                            </label>
                            <input
                              type='number'
                              required
                              min='1'
                              className='w-full p-4 bg-slate-50 rounded-2xl border-none font-medium'
                              value={formData.rooms}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  rooms: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className='text-[10px] font-bold uppercase text-slate-500 mb-1 block'>
                              ¿Cómo reservas hoy?
                            </label>
                            <select
                              className='w-full p-4 bg-slate-50 rounded-2xl border-none font-medium appearance-none'
                              value={formData.currentSoftware}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  currentSoftware: e.target.value,
                                })
                              }
                            >
                              <option value=''>Elegir...</option>
                              <option value='Manual'>Cuaderno / Excel</option>
                              <option value='Software'>Otro Software</option>
                            </select>
                          </div>
                        </div>

                        {/* BLINDAJE LEGAL */}
                        <div className='bg-slate-50 p-4 rounded-2xl border border-slate-200'>
                          <label className='flex items-start gap-3 cursor-pointer'>
                            <input
                              type='checkbox'
                              required
                              className='mt-1 w-5 h-5 text-slate-900 rounded border-gray-300 focus:ring-slate-900'
                              checked={formData.acceptMandate}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  acceptMandate: e.target.checked,
                                })
                              }
                            />
                            <div className='text-xs text-slate-600 leading-relaxed font-medium'>
                              <span className='font-bold text-slate-900 block mb-1'>
                                Acuerdo de Servicio
                              </span>
                              "Autorizo a HospedaSuite a gestionar cobros en mi
                              nombre cuando aplique. Entiendo que actúan solo
                              como plataforma tecnológica."
                            </div>
                          </label>
                        </div>

                        <input
                          type='text'
                          className='hidden'
                          value={formData._honey}
                          onChange={(e) =>
                            setFormData({ ...formData, _honey: e.target.value })
                          }
                        />

                        <div className='flex gap-4 pt-2'>
                          <button
                            type='button'
                            onClick={() => setFormStep(1)}
                            className='p-4 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors'
                          >
                            <ArrowLeft size={24} />
                          </button>
                          <button
                            type='submit'
                            disabled={loading}
                            className='flex-1 py-4 bg-slate-900 text-white font-bold text-lg rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-800 shadow-xl shadow-slate-900/20 transition-all'
                          >
                            {loading ? (
                              <Clock className='animate-spin' />
                            ) : (
                              'Finalizar Registro'
                            )}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>
              )}
            </div>
          </GlassCard>
        </section>
      </main>
      <SalesAgent />
    </div>
  );
};

export default LandingPage;
