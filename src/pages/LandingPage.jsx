import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
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
  ScanBarcode,
  Globe,
  Lock,
  Zap,
  TrendingUp,
  Share2,
  LayoutGrid,
  Percent,
  Building2,
  MessageCircle,
} from 'lucide-react';
import SalesAgent from '../components/SalesAgent';

// ==========================================
// 🎨 DISEÑO MAC 2026 (ACCESIBLE & MINIMALISTA)
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

// Tarjeta Oscura (Alto Contraste para Plan Pro)
const BentoCardDark = ({ children, className = '' }) => (
  <div
    className={`bg-[#0f172a] text-white border border-slate-800 shadow-2xl shadow-blue-900/20 rounded-[2.5rem] ${className}`}
  >
    {children}
  </div>
);

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

  // --- LÓGICA DE NEGOCIO ORIGINAL (INTACTA) ---
  const cleanCitySlug = city_slug
    ? decodeURIComponent(city_slug).replace(/['"]+/g, '').trim().toLowerCase()
    : 'Colombia';

  const cityName = cleanCitySlug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const [launchData, setLaunchData] = useState({ total: 12, taken: 0 });
  const [spotsTaken, setSpotsTaken] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formStatus, setFormStatus] = useState('idle');
  const [formStep, setFormStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState('PRO_AI');
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

  const scrollToForm = (plan) => {
    setSelectedPlan(plan);
    document
      .getElementById('activation-form')
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNextStep = () => {
    if (formData.ownerName.length < 3)
      return alert('Por favor dinos tu nombre.');
    if (formData.phone.length < 7)
      return alert('Necesitamos un WhatsApp válido.');
    setFormStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData._honey) return; // Anti-spam check

    // Validación Legal
    if (!formData.acceptMandate)
      return alert('Debes aceptar el acuerdo de gestión para continuar.');

    setLoading(true);
    try {
      const { error } = await supabase.from('platform_leads').insert([
        {
          full_name: formData.ownerName,
          hotel_name: formData.hotelName,
          phone: formData.phone,
          email: formData.email,
          city_interest: cityName,
          metadata: {
            rooms: formData.rooms,
            software: formData.currentSoftware,
            status: 'PROMO_APPLICANT',
            source_url: window.location.href,
            plan_interest: selectedPlan,
            offer_claimed: '1_MONTH_FREE_FRIENDS',
            mandate_accepted: true,
          },
        },
      ]);

      if (!error) {
        // Notificación WhatsApp
        await supabase.functions.invoke('send-whatsapp', {
          body: {
            phone: formData.phone.replace(/\D/g, ''),
            message: `👋 Hola ${formData.ownerName}, bienvenido a HospedaSuite. Hemos reservado tu cupo en ${cityName}. Un agente te contactará pronto para la configuración.`,
          },
        });

        setSpotsTaken((prev) => Math.min(prev + 1, launchData.total));
        setTimeout(() => {
          setFormStatus('success');
          setLoading(false);
        }, 1500);
      } else {
        throw error;
      }
    } catch (err) {
      console.error(err);
      alert('Error guardando solicitud. Intenta de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-[#F2F4F7] font-sans text-slate-900 overflow-x-hidden selection:bg-slate-200'>
      <Helmet>
        <title>HospedaSuite | Software para Hoteles en {cityName}</title>
      </Helmet>

      {/* --- FONDO AMBIENTAL SUAVE --- */}
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
        {/* --- HERO (Encabezado) --- */}
        <div className='text-center max-w-4xl mx-auto mb-24'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Pill
              icon={Zap}
              text='Tecnología Hotelera 2026'
              color='dark'
            />
            <h1 className='text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mt-8 mb-8 leading-[1.1]'>
              Tu Hotel en Autopiloto.
              <br />
              <span className='text-slate-400'>Sin Letra Chiquita.</span>
            </h1>
            <p className='text-xl md:text-2xl text-slate-600 max-w-2xl mx-auto mb-12 leading-relaxed font-medium'>
              Todo lo que necesitas: Reservas, Check-in digital y Cuentas
              claras. La única plataforma que te deja vender directo sin
              cobrarte comisiones.
            </p>

            {/* --- CONTADOR DE CUPOS (Visual y Sencillo) --- */}
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

        {/* --- COMISIONES EXPLICADAS (Sencillo) --- */}
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
            <BentoCard className='p-10 relative overflow-hidden hover:border-emerald-300 transition-all duration-300'>
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
                a tu recepción, es mérito tuyo. No te cobramos nada.
              </p>
              <div className='bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex items-start gap-4'>
                <CheckCircle2
                  size={20}
                  className='text-emerald-600 mt-0.5 flex-shrink-0'
                />
                <div>
                  <p className='text-base font-bold text-emerald-900'>
                    Cero Comisión
                  </p>
                  <p className='text-sm text-emerald-700 mt-1'>
                    El dinero completo es para ti.
                  </p>
                </div>
              </div>
            </BentoCard>

            {/* Tarjeta 10% - Nuestras Ventas */}
            <BentoCard className='p-10 relative overflow-hidden hover:border-blue-300 transition-all duration-300'>
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
                Si el cliente reserva a través de{' '}
                <b>nuestra página web (HospedaSuite)</b>, nosotros hicimos la
                venta por ti.
              </p>
              <div className='bg-blue-50 p-5 rounded-2xl border border-blue-100 flex items-start gap-4'>
                <Percent
                  size={20}
                  className='text-blue-600 mt-0.5 flex-shrink-0'
                />
                <div>
                  <p className='text-base font-bold text-blue-900'>
                    Solo el 10%
                  </p>
                  <p className='text-sm text-blue-700 mt-1'>
                    Mucho menos que otras plataformas (Booking cobra 15-25%).
                  </p>
                </div>
              </div>
            </BentoCard>
          </div>
        </section>

        {/* --- FUNCIONES REALES (Lenguaje Sencillo) --- */}
        <section className='mb-32'>
          <div className='grid md:grid-cols-3 gap-6 auto-rows-[minmax(240px,auto)]'>
            <BentoCard className='md:col-span-2 p-10 flex flex-col justify-between overflow-hidden relative group'>
              <div className='relative z-10'>
                <Pill
                  text='Registro Rápido'
                  icon={Clock}
                  color='purple'
                />
                <h3 className='text-3xl font-bold mt-6 mb-4 text-slate-900'>
                  Check-in en 30 segundos
                </h3>
                <p className='text-lg text-slate-600 max-w-md font-medium'>
                  Escanea la cédula con el celular y listo. Sin papeleo y
                  cumpliendo con la ley.
                </p>
              </div>
              <div className='absolute right-[-20px] bottom-[-20px] w-72 h-72 bg-purple-100 rounded-full blur-3xl opacity-60 group-hover:scale-110 transition-transform duration-700' />
            </BentoCard>

            <BentoCard className='p-8 flex flex-col justify-between hover:bg-white/90 transition-colors'>
              <Pill
                text='Asistente IA'
                icon={Mic}
                color='blue'
              />
              <div>
                <h3 className='text-2xl font-bold mt-4 mb-2 text-slate-900'>
                  Recepcionista Virtual
                </h3>
                <p className='text-base text-slate-600'>
                  Responde preguntas frecuentes por voz 24/7 para que tú
                  descanses.
                </p>
              </div>
            </BentoCard>

            <BentoCard className='p-8 flex flex-col justify-between hover:bg-white/90 transition-colors'>
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
            </BentoCard>

            <BentoCard className='md:col-span-2 p-10 flex flex-col justify-between relative overflow-hidden group'>
              <div className='relative z-10'>
                <Pill
                  text='Reservas'
                  icon={LayoutGrid}
                  color='orange'
                />
                <h3 className='text-3xl font-bold mt-6 mb-4 text-slate-900'>
                  Tu Propia Web de Ventas
                </h3>
                <p className='text-lg text-slate-600 font-medium'>
                  Un enlace elegante para tu Instagram. Muestra tus habitaciones
                  y recibe pagos automáticos.
                </p>
              </div>
              <div className='absolute right-[-20px] bottom-[-20px] w-72 h-72 bg-orange-100 rounded-full blur-3xl opacity-60 group-hover:scale-110 transition-transform duration-700' />
            </BentoCard>
          </div>
        </section>

        {/* --- PRECIOS SIMPLIFICADOS --- */}
        <section
          id='pricing'
          className='mb-32'
        >
          <div className='text-center mb-16'>
            <h2 className='text-4xl font-bold mb-6 text-slate-900'>
              Precios Claros
            </h2>
            <p className='text-xl text-slate-600'>
              Sin contratos amarrados. Cancela cuando quieras.
            </p>
          </div>

          <div className='grid md:grid-cols-3 gap-8'>
            {/* PLAN NANO (Básico) */}
            <BentoCard className='p-10 flex flex-col h-full hover:border-slate-300 transition-colors'>
              <div className='mb-6'>
                <span className='text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-3 py-1 rounded-full'>
                  Básico
                </span>
              </div>
              <div className='flex items-baseline gap-1 mb-6'>
                <span className='text-5xl font-bold text-slate-900 tracking-tight'>
                  $49.900
                </span>
                <span className='text-slate-500 font-medium'>/mes</span>
              </div>
              <p className='text-base text-slate-600 mb-8 font-medium'>
                Para empezar. Más barato que un cuaderno.
              </p>
              <ul className='space-y-4 mb-10 text-sm font-bold text-slate-700 flex-1'>
                <li className='flex gap-3'>
                  <CheckCircle2
                    size={18}
                    className='text-slate-900'
                  />{' '}
                  1 - 3 Habitaciones
                </li>
                <li className='flex gap-3'>
                  <CheckCircle2
                    size={18}
                    className='text-slate-900'
                  />{' '}
                  Sistema de Reservas
                </li>
                <li className='flex gap-3'>
                  <CheckCircle2
                    size={18}
                    className='text-slate-900'
                  />{' '}
                  Registro Rápido
                </li>
              </ul>
              <button
                onClick={() => scrollToForm('NANO_AI')}
                className='w-full py-4 rounded-2xl bg-slate-100 text-slate-900 font-bold hover:bg-slate-200 transition-colors text-sm uppercase tracking-wide'
              >
                Elegir Básico
              </button>
            </BentoCard>

            {/* PLAN PRO (Estándar) - DISEÑO OSCURO CORREGIDO */}
            <BentoCardDark className='p-10 flex flex-col h-full relative transform md:-translate-y-6'>
              <div className='absolute top-0 right-0 bg-blue-600 text-[10px] font-bold px-4 py-1.5 rounded-bl-2xl uppercase tracking-wider'>
                Más Popular
              </div>
              <div className='mb-6'>
                <span className='text-xs font-bold uppercase tracking-wider text-blue-300 bg-blue-900/30 px-3 py-1 rounded-full'>
                  Pro
                </span>
              </div>
              <div className='flex items-baseline gap-1 mb-6'>
                <span className='text-6xl font-bold tracking-tight text-white'>
                  $89.900
                </span>
                <span className='text-slate-400 font-medium'>/mes</span>
              </div>
              <p className='text-base text-slate-300 mb-8 font-medium'>
                Lo que la mayoría de hoteles necesita.
              </p>
              <ul className='space-y-4 mb-10 text-sm font-bold text-slate-200 flex-1'>
                <li className='flex gap-3'>
                  <Star
                    size={18}
                    className='text-yellow-400'
                  />{' '}
                  4 - 12 Habitaciones
                </li>
                <li className='flex gap-3'>
                  <CheckCircle2
                    size={18}
                    className='text-blue-400'
                  />{' '}
                  Pedidos a Cocina
                </li>
                <li className='flex gap-3'>
                  <CheckCircle2
                    size={18}
                    className='text-blue-400'
                  />{' '}
                  Control de Inventario
                </li>
                <li className='flex gap-3'>
                  <CheckCircle2
                    size={18}
                    className='text-blue-400'
                  />{' '}
                  Ayuda Prioritaria
                </li>
              </ul>
              <button
                onClick={() => scrollToForm('PRO_AI')}
                className='w-full py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-colors text-sm uppercase tracking-wide shadow-lg shadow-blue-600/30'
              >
                Prueba Gratis 1 Mes
              </button>
            </BentoCardDark>

            {/* PLAN GROWTH (Empresarial) */}
            <BentoCard className='p-10 flex flex-col h-full hover:border-slate-300 transition-colors'>
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
                Para hoteles con mucho movimiento.
              </p>
              <ul className='space-y-4 mb-10 text-sm font-bold text-slate-700 flex-1'>
                <li className='flex gap-3'>
                  <Zap
                    size={18}
                    className='text-purple-600'
                  />{' '}
                  13 - 30 Habitaciones
                </li>
                <li className='flex gap-3'>
                  <CheckCircle2
                    size={18}
                    className='text-purple-600'
                  />{' '}
                  Varios Usuarios
                </li>
                <li className='flex gap-3'>
                  <CheckCircle2
                    size={18}
                    className='text-purple-600'
                  />{' '}
                  Historial de Cambios
                </li>
                <li className='flex gap-3'>
                  <CheckCircle2
                    size={18}
                    className='text-purple-600'
                  />{' '}
                  Conexión Externa
                </li>
              </ul>
              <button
                onClick={() => scrollToForm('GROWTH_AI')}
                className='w-full py-4 rounded-2xl bg-slate-100 text-slate-900 font-bold hover:bg-slate-200 transition-colors text-sm uppercase tracking-wide'
              >
                Elegir Empresarial
              </button>
            </BentoCard>
          </div>
        </section>

        {/* --- FORMULARIO DE REGISTRO --- */}
        <section
          id='activation-form'
          className='max-w-2xl mx-auto mb-20'
        >
          <BentoCard className='overflow-hidden border-white/80'>
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
                    Revisa tu WhatsApp, te hemos enviado los detalles.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className='text-center mb-10'>
                    <h3 className='text-3xl font-bold text-slate-900 mb-2'>
                      Activa tu Mes de Regalo
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
                              'Activar Cuenta'
                            )}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>
              )}
            </div>
          </BentoCard>
        </section>
      </main>
      <SalesAgent />
    </div>
  );
};

export default LandingPage;
