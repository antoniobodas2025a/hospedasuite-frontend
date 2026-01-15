import React, { useState, useEffect, useId } from 'react';
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
  ShieldCheck,
  Zap,
  CheckCircle2,
  Clock,
  ChevronRight,
  Star,
  Smartphone,
  ArrowLeft,
  User,
  Mail,
  Building2,
  MapPin,
  Gift,
  Mic,
  Sparkles,
  ScanBarcode,
  ShoppingBag,
  Globe,
  Lock,
  HeartHandshake, // Nuevo icono para cercanía
  Coffee, // Nuevo icono para tranquilidad
} from 'lucide-react';
import SalesAgent from '../components/SalesAgent';
import logoHospeda from '../assets/logo.png';

// ==========================================
// 🎨 ESTILOS & COMPONENTES VISUALES
// ==========================================
const GlassCard = ({ children, className = '' }) => (
  <div
    className={`bg-white/70 backdrop-blur-xl border border-white/40 shadow-2xl shadow-indigo-500/10 rounded-[2.5rem] ${className}`}
  >
    {children}
  </div>
);

const Badge = ({ icon: Icon, text, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors[color]}`}
    >
      {Icon && <Icon size={12} />}
      {text}
    </span>
  );
};

const LandingPage = () => {
  const { city_slug } = useParams();

  const cleanCitySlug = city_slug
    ? decodeURIComponent(city_slug).replace(/['"]+/g, '').trim().toLowerCase()
    : 'Boyacá';

  const cityName = cleanCitySlug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // ==========================================
  // 🔒 LÓGICA DE NEGOCIO
  // ==========================================
  const [launchData, setLaunchData] = useState({ total: 12, taken: 0 });
  const [spotsTaken, setSpotsTaken] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formStatus, setFormStatus] = useState('idle');
  const [formStep, setFormStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState('PRO_AI');

  const [formData, setFormData] = useState({
    ownerName: '',
    hotelName: '',
    email: '',
    phone: '',
    rooms: '',
    currentSoftware: '',
    _honey: '',
  });

  const [isNavHidden, setIsNavHidden] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setIsNavHidden(latest > 100);
  });

  // CARGA DE CUPOS
  useEffect(() => {
    const fetchLaunchData = async () => {
      try {
        const { data, error } = await supabase
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
  const isWaitlist = spotsTaken >= launchData.total;
  const progressPercent = Math.min((spotsTaken / launchData.total) * 100, 100);

  const scrollToForm = (plan) => {
    setSelectedPlan(plan);
    const element = document.getElementById('activation-form');
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (formData.ownerName.trim().length < 3) {
      alert('Por favor dinos cómo te llamas.');
      return;
    }
    if (cleanPhone.length < 7) {
      alert('Necesitamos un WhatsApp válido para enviarte el acceso.');
      return;
    }
    setFormStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData._honey) return;

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
            status: 'PROMO_APPLICANT', // Cambiado status interno
            source_url: window.location.href,
            plan_interest: selectedPlan,
            offer_claimed: '1_MONTH_FREE_FRIENDS',
          },
        },
      ]);

      if (!error) {
        const welcomeMsg = `👋 *Hola ${formData.ownerName}*, te saluda el equipo de HospedaSuite.\n\nVimos que quieres modernizar tu hotel en ${cityName} con el Mes de Regalo.\n\nYa separamos tu cupo. Un compañero te escribirá en breve para configurar tu cuenta.`;

        await supabase.functions.invoke('send-whatsapp', {
          body: {
            phone: formData.phone.replace(/\D/g, ''),
            message: welcomeMsg,
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
      alert('Algo salió mal. Por favor intenta de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen text-slate-900 font-sans selection:bg-indigo-500/30 bg-[#F8FAFC] overflow-x-hidden'>
      <Helmet>
        <title>Mes de Regalo | HospedaSuite {cityName}</title>
      </Helmet>

      {/* BACKGROUND FX */}
      <div className='fixed inset-0 z-0 pointer-events-none'>
        <div className='absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-cyan-400/10 rounded-full blur-[120px] animate-blob' />
        <div className='absolute top-[10%] right-[-10%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] animate-blob animation-delay-2000' />
      </div>

      {/* NAVBAR */}
      <motion.nav
        animate={isNavHidden ? { y: -100 } : { y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className='fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none'
      >
        <div className='pointer-events-auto group flex items-center gap-6 pl-4 pr-6 py-3 rounded-full bg-[#0f172a]/90 backdrop-blur-2xl border border-white/10 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] hover:scale-[1.02] transition-all duration-300 ease-out'>
          <div className='relative h-10 w-32 flex items-center justify-center overflow-hidden'>
            <img
              src={logoHospeda}
              alt='HospedaSuite AI'
              className='h-full w-full object-contain mix-blend-screen scale-110 opacity-90'
            />
            <div className='absolute inset-0 bg-cyan-500/20 blur-xl opacity-50 mix-blend-overlay' />
          </div>
          <div className='h-8 w-[1px] bg-gradient-to-b from-transparent via-white/20 to-transparent' />
          <div className='flex flex-col leading-tight'>
            <span className='text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-0.5'>
              Zona
            </span>
            <div className='flex items-center gap-1.5 text-xs font-bold text-white tracking-wide'>
              <MapPin
                size={12}
                className='text-cyan-400'
              />
              {cityName}
            </div>
          </div>
        </div>
      </motion.nav>

      <main className='relative z-10 pt-32 pb-20 px-6'>
        {/* ========================================================
            1. HERO: LENGUAJE CERCANO Y DIRECTO
           ======================================================== */}
        <div className='max-w-5xl mx-auto text-center mb-24'>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Badge
              icon={HeartHandshake}
              text='Tecnología Amigable'
              color='purple'
            />

            <h1 className='text-5xl md:text-7xl font-serif font-bold text-slate-900 mt-6 mb-6 leading-[1.1] tracking-tight'>
              Maneja tu hotel <br />
              <span className='text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500'>
                sin perder la cabeza
              </span>
            </h1>

            <p className='text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed font-light'>
              Olvídate de las tablas de Excel, las multas por el SIRE y el caos
              en recepción.
              <br />
              Te regalamos <strong>1 Mes de Prueba</strong> para que veas cómo
              tu hotel puede funcionar solo.
            </p>

            {/* STATUS DE ESCASEZ */}
            <div className='inline-flex items-center gap-4 bg-white p-2 pr-6 rounded-full shadow-lg border border-slate-100 mb-12'>
              <div className='relative w-12 h-12 flex items-center justify-center'>
                <svg className='transform -rotate-90 w-12 h-12'>
                  <circle
                    cx='24'
                    cy='24'
                    r='20'
                    stroke='#f1f5f9'
                    strokeWidth='4'
                    fill='transparent'
                  />
                  <circle
                    cx='24'
                    cy='24'
                    r='20'
                    stroke='#8b5cf6'
                    strokeWidth='4'
                    fill='transparent'
                    strokeDasharray={125.6}
                    strokeDashoffset={125.6 - (progressPercent / 100) * 125.6}
                  />
                </svg>
                <span className='absolute text-[10px] font-bold text-purple-700'>
                  {spotsLeft}
                </span>
              </div>
              <div className='text-left'>
                <p className='text-[10px] font-bold text-slate-400 uppercase tracking-wider'>
                  Cupos Disponibles
                </p>
                <p className='text-sm font-bold text-slate-800'>
                  Para hoteles en {cityName}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ========================================================
            2. DOLORES REALES (LENGUAJE NATURAL)
           ======================================================== */}
        <section className='max-w-6xl mx-auto mb-32'>
          <div className='grid md:grid-cols-2 gap-8 items-center'>
            {/* EL DOLOR */}
            <div className='p-8 rounded-[2.5rem] bg-slate-100 border border-slate-200 opacity-80 scale-95 hover:scale-100 transition-transform duration-500'>
              <div className='flex items-center gap-3 mb-6 opacity-60'>
                <Coffee size={32} />
                <h3 className='text-2xl font-serif font-bold'>
                  Lo que te quita el sueño
                </h3>
              </div>
              <ul className='space-y-4 text-slate-600 font-medium'>
                <li className='flex gap-3 items-center'>
                  <span className='text-red-400 text-xl'>•</span> "¿Llené bien
                  el reporte de Migración Colombia?"
                </li>
                <li className='flex gap-3 items-center'>
                  <span className='text-red-400 text-xl'>•</span> Vender la
                  misma habitación en Booking y Airbnb.
                </li>
                <li className='flex gap-3 items-center'>
                  <span className='text-red-400 text-xl'>•</span> Estar pegado
                  al WhatsApp respondiendo precios.
                </li>
                <li className='flex gap-3 items-center'>
                  <span className='text-red-400 text-xl'>•</span> Cuentas que no
                  cuadran a fin de mes.
                </li>
              </ul>
            </div>

            {/* LA SOLUCIÓN */}
            <GlassCard className='p-10 relative overflow-hidden group'>
              <div className='absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-full blur-3xl -z-10 group-hover:scale-150 transition-transform duration-700' />

              <div className='flex items-center gap-3 mb-6'>
                <div className='p-3 bg-slate-900 rounded-2xl text-white'>
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className='text-2xl font-serif font-bold text-slate-900'>
                    La tranquilidad de HospedaSuite
                  </h3>
                  <p className='text-xs font-bold text-purple-600 uppercase tracking-widest'>
                    Tu nuevo mejor empleado
                  </p>
                </div>
              </div>

              <ul className='space-y-5'>
                <li className='flex gap-4 items-center'>
                  <div className='bg-purple-100 p-2 rounded-full text-purple-600'>
                    <Mic size={18} />
                  </div>
                  <span className='font-bold text-slate-800'>
                    Le hablas y él hace las reservas por ti.
                  </span>
                </li>
                <li className='flex gap-4 items-center'>
                  <div className='bg-blue-100 p-2 rounded-full text-blue-600'>
                    <ScanBarcode size={18} />
                  </div>
                  <span className='font-bold text-slate-800'>
                    Escanea cédulas y evita multas del SIRE.
                  </span>
                </li>
                <li className='flex gap-4 items-center'>
                  <div className='bg-emerald-100 p-2 rounded-full text-emerald-600'>
                    <Globe size={18} />
                  </div>
                  <span className='font-bold text-slate-800'>
                    Tu propia página web para no pagar comisiones.
                  </span>
                </li>
              </ul>
            </GlassCard>
          </div>
        </section>

        {/* ========================================================
            3. CASOS DE USO
           ======================================================== */}
        <section className='max-w-5xl mx-auto mb-32'>
          <h2 className='text-3xl font-serif font-bold text-center mb-12'>
            Pensado para negocios como el tuyo
          </h2>
          <div className='grid md:grid-cols-3 gap-6'>
            {[
              {
                title: 'Glampings',
                desc: 'Maneja todo desde el celular mientras recorres el terreno.',
                icon: Smartphone,
              },
              {
                title: 'Hoteles Boutique',
                desc: 'Dale a tus huéspedes una atención VIP, rápida y sin papeles.',
                icon: Star,
              },
              {
                title: 'Hostales y Posadas',
                desc: 'Control total de la caja, aunque tú no estés presente.',
                icon: User,
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className='bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg transition-all'
              >
                <item.icon
                  className='mb-4 text-slate-400'
                  size={32}
                />
                <h3 className='font-bold text-lg mb-2'>{item.title}</h3>
                <p className='text-sm text-slate-500 leading-relaxed'>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================
            4. OFERTA ESPECIAL (NO "FOUNDER", SINO "AYUDA")
           ======================================================== */}
        <section
          className='max-w-6xl mx-auto mb-32'
          id='pricing'
        >
          <div className='text-center mb-16'>
            <Badge
              icon={Gift}
              text='Beca de Digitalización'
              color='amber'
            />
            <h2 className='text-4xl md:text-5xl font-serif font-bold text-slate-900 mt-4'>
              Nosotros lo configuramos por ti
            </h2>
            <p className='text-slate-500 mt-4 max-w-2xl mx-auto'>
              Sabemos que no tienes tiempo. Por eso, para estas{' '}
              <strong>12 Becas en {cityName}</strong>, nuestro equipo sube tus
              habitaciones y tarifas. <br />
              <span className='text-purple-600 font-bold'>
                Te lo entregamos listo para trabajar.
              </span>
            </p>
          </div>

          <div className='grid md:grid-cols-3 gap-6 items-center'>
            {/* PLAN NANO IA */}
            <div className='p-8 rounded-[2.5rem] bg-white border border-slate-200 relative group hover:border-blue-300 transition-all'>
              <h3 className='text-xl font-bold text-slate-900 mb-1'>Básico</h3>
              <p className='text-xs font-bold text-slate-400 uppercase'>
                1 a 3 habitaciones
              </p>
              <p>Ideal para empezar</p>
              <div className='my-6'>
                <span className='text-4xl font-serif font-bold'>$69.900</span>
                <span className='text-sm text-slate-400'>/mes</span>
                <p className='text-xs font-bold text-green-600 mt-2 bg-green-50 inline-block px-2 py-1 rounded'>
                  PRIMER MES REGALADO ($0)
                </p>
              </div>
              <ul className='space-y-3 mb-8 text-sm text-slate-600'>
                <li className='flex gap-2'>
                  <CheckCircle2
                    size={16}
                    className='text-blue-500'
                  />
                  Asistente de Voz
                </li>
                <li className='flex gap-2'>
                  <CheckCircle2
                    size={16}
                    className='text-blue-500'
                  />
                  Calendario Ordenado
                </li>
                <li className='flex gap-2'>
                  <CheckCircle2
                    size={16}
                    className='text-blue-500'
                  />
                  Reportes SIRE Fáciles
                </li>
              </ul>
              <button
                onClick={() => scrollToForm('NANO_AI')}
                className='w-full py-4 rounded-2xl border border-slate-200 font-bold hover:bg-slate-50'
              >
                Probar este
              </button>
            </div>

            {/* PLAN PRO IA (DESTACADO) */}
            <div className='p-8 rounded-[2.5rem] bg-[#0f172a] text-white relative shadow-2xl shadow-purple-900/30 transform md:scale-110 z-10'>
              <div className='absolute top-0 right-0 bg-gradient-to-l from-purple-600 to-blue-600 text-white text-[10px] font-bold px-4 py-1 rounded-bl-2xl rounded-tr-2xl'>
                RECOMENDADO
              </div>
              <h3 className='text-2xl font-bold mb-1'>Profesional</h3>
              <p className='text-xs font-bold text-slate-400 uppercase'>
                4 a 12 habitaciones
              </p>
              <p>El que todo lo hace</p>
              <div className='my-6'>
                <span className='text-5xl font-serif font-bold'>$139.900</span>
                <span className='text-sm text-slate-400'>/mes</span>
                <p className='text-xs font-bold text-purple-400 mt-2 bg-white/10 inline-block px-2 py-1 rounded'>
                  PRIMER MES GRATIS ($0)
                </p>
              </div>
              <ul className='space-y-4 mb-8 text-sm font-medium text-slate-300'>
                <li className='flex gap-3 items-center text-white'>
                  <Star
                    size={16}
                    className='text-amber-400'
                  />
                  Configuración hecha por nosotros
                </li>
                <li className='flex gap-3'>
                  <Mic
                    size={16}
                    className='text-purple-400'
                  />
                  IA que entiende tus notas de voz
                </li>
                <li className='flex gap-3'>
                  <ScanBarcode
                    size={16}
                    className='text-cyan-400'
                  />
                  Escáner rápido de documentos
                </li>
                <li className='flex gap-3'>
                  <Globe
                    size={16}
                    className='text-blue-400'
                  />
                  Página web incluida
                </li>
              </ul>
              <button
                onClick={() => scrollToForm('PRO_AI')}
                className='w-full py-4 rounded-2xl bg-white text-slate-900 font-bold hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-shadow'
              >
                Quiero mi Mes Gratis
              </button>
            </div>

            {/* PLAN GROWTH IA */}
            <div className='p-8 rounded-[2.5rem] bg-white border border-slate-200 relative group hover:border-blue-300 transition-all'>
              <h3 className='text-xl font-bold text-slate-900 mb-1'>
                Empresarial
              </h3>
              <p className='text-xs font-bold text-slate-400 uppercase'>
                13 a 30 habitaciones
              </p>
              <p>Para crecer sin límites</p>
              <div className='my-6'>
                <span className='text-4xl font-serif font-bold'>$219.900</span>
                <span className='text-sm text-slate-400'>/mes</span>
                <p className='text-xs font-bold text-green-600 mt-2 bg-green-50 inline-block px-2 py-1 rounded'>
                  PRIMER MES REGALADO ($0)
                </p>
              </div>
              <ul className='space-y-3 mb-8 text-sm text-slate-600'>
                <li className='flex gap-2'>
                  <Star
                    size={16}
                    className='text-amber-500'
                  />
                  Soporte Prioritario
                </li>
                <li className='flex gap-2'>
                  <CheckCircle2
                    size={16}
                    className='text-blue-500'
                  />
                  Cuentas para tus empleados
                </li>
                <li className='flex gap-2'>
                  <CheckCircle2
                    size={16}
                    className='text-blue-500'
                  />
                  Herramientas de Marketing
                </li>
              </ul>
              <button
                onClick={() => scrollToForm('GROWTH_AI')}
                className='w-full py-4 rounded-2xl border border-slate-200 font-bold hover:bg-slate-50'
              >
                Ver opción Grande
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================
            5. FORMULARIO AMIGABLE
           ======================================================== */}
        <section
          id='activation-form'
          className='max-w-3xl mx-auto'
        >
          <GlassCard className='overflow-hidden relative'>
            {/* Barra de Progreso */}
            <div className='h-1.5 w-full bg-slate-100'>
              <motion.div
                className='h-full bg-gradient-to-r from-blue-600 to-purple-600'
                animate={{ width: formStep === 1 ? '50%' : '100%' }}
              />
            </div>

            <div className='p-8 md:p-12'>
              <div className='text-center mb-10'>
                <h3 className='text-3xl font-serif font-bold text-slate-900'>
                  Vamos a modernizar tu hotel
                </h3>
                <p className='text-slate-500 mt-2 flex items-center justify-center gap-2'>
                  <Lock size={14} />
                  {spotsLeft > 0
                    ? `Solo nos quedan ${spotsLeft} becas en ${cityName}`
                    : 'Lista de espera activada'}
                </p>
              </div>

              {formStatus === 'success' ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className='text-center py-10'
                >
                  <div className='w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6'>
                    <CheckCircle2
                      size={48}
                      className='text-green-600'
                    />
                  </div>
                  <h3 className='text-2xl font-bold text-slate-900'>
                    ¡Listo! Solicitud Enviada.
                  </h3>
                  <p className='text-slate-600 mt-2 mb-6'>
                    Ya reservamos tu mes gratis.
                    <br />
                    Revisa tu WhatsApp, te hablaremos por ahí.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <AnimatePresence mode='wait'>
                    {formStep === 1 && (
                      <motion.div
                        key='step1'
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className='space-y-6'
                      >
                        <div className='space-y-2'>
                          <label className='text-xs font-bold uppercase text-slate-400 ml-2'>
                            ¿Cómo te llamas?
                          </label>
                          <div className='relative'>
                            <User
                              className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400'
                              size={20}
                            />
                            <input
                              type='text'
                              required
                              placeholder='Ej: Carlos Gomez'
                              className='w-full p-4 pl-12 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-purple-500/20 font-medium text-lg'
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

                        <div className='space-y-2'>
                          <label className='text-xs font-bold uppercase text-slate-400 ml-2'>
                            Tu WhatsApp (Para enviarte el acceso)
                          </label>
                          <div className='relative'>
                            <Smartphone
                              className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400'
                              size={20}
                            />
                            <input
                              type='tel'
                              required
                              placeholder='300 123 4567'
                              className='w-full p-4 pl-12 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-purple-500/20 font-medium text-lg'
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
                          className='w-full py-5 rounded-2xl bg-slate-900 text-white font-bold text-lg shadow-xl shadow-slate-900/10 flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform'
                        >
                          Verificar mi Cupo <ChevronRight size={20} />
                        </button>
                      </motion.div>
                    )}

                    {formStep === 2 && (
                      <motion.div
                        key='step2'
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className='space-y-6'
                      >
                        <div className='grid grid-cols-2 gap-4'>
                          <div className='space-y-1'>
                            <label className='text-[10px] font-bold uppercase text-slate-400 ml-2'>
                              Nombre del Hotel
                            </label>
                            <input
                              type='text'
                              required
                              className='w-full p-4 bg-slate-50 rounded-2xl border-none font-medium'
                              value={formData.hotelName}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  hotelName: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className='space-y-1'>
                            <label className='text-[10px] font-bold uppercase text-slate-400 ml-2'>
                              Correo Electrónico
                            </label>
                            <input
                              type='email'
                              required
                              className='w-full p-4 bg-slate-50 rounded-2xl border-none font-medium'
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

                        <div className='grid grid-cols-2 gap-4'>
                          <div className='space-y-1'>
                            <label className='text-[10px] font-bold uppercase text-slate-400 ml-2'>
                              Nro. Habitaciones
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
                          <div className='space-y-1'>
                            <label className='text-[10px] font-bold uppercase text-slate-400 ml-2'>
                              ¿Cómo manejas reservas hoy?
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
                              <option value='Software'>
                                Uso otro Software
                              </option>
                            </select>
                          </div>
                        </div>

                        {/* Honeypot oculto */}
                        <input
                          type='text'
                          name='_honey'
                          value={formData._honey}
                          onChange={(e) =>
                            setFormData({ ...formData, _honey: e.target.value })
                          }
                          className='hidden'
                        />

                        <div className='flex gap-3 pt-4'>
                          <button
                            type='button'
                            onClick={() => setFormStep(1)}
                            className='p-4 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50'
                          >
                            <ArrowLeft size={24} />
                          </button>
                          <button
                            type='submit'
                            disabled={loading || isWaitlist}
                            className='flex-1 py-5 rounded-2xl bg-gradient-to-r from-purple-700 to-blue-600 text-white font-bold text-lg shadow-xl shadow-purple-500/20 hover:shadow-purple-500/40 transition-all flex items-center justify-center gap-2'
                          >
                            {loading ? (
                              <Clock className='animate-spin' />
                            ) : (
                              'Activar mi Mes Gratis'
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
          <p className='text-center text-xs text-slate-400 mt-6'>
            Tranquilo, tus datos están seguros y no pedimos tarjeta de crédito.
          </p>
        </section>
      </main>

      <SalesAgent />
    </div>
  );
};

export default LandingPage;
