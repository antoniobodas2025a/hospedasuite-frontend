import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

import { useParams } from 'react-router-dom';
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from 'framer-motion';
import { supabase } from '../supabaseClient';
import {
  ShieldCheck,
  Zap,
  Lock,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Star,
  Check,
  Building2,
  Smartphone,
  Server,
} from 'lucide-react';
import SalesAgent from '../components/SalesAgent';

// --- ESTILOS VISUALES (COLOR ACTUALIZADO: #010512 + MEJOR CONTRASTE) ---
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap');
    html { scroll-behavior: smooth; }
    
    :root {
      --font-sans: 'Inter', sans-serif;
      --font-serif: 'Playfair Display', serif;
      --color-cyan: #06b6d4;
      --deep-midnight: #010512;
    }
    
    body { 
      font-family: var(--font-sans); 
      background-color: #F8FAFC;
    }
    
    .font-serif-display { font-family: var(--font-serif); }
    
    /* Animación del botón */
    @keyframes shimmer {
      0% { transform: translateX(-150%); }
      100% { transform: translateX(150%); }
    }
    
    .cyber-button-glow {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.4), transparent);
      transform: skewX(-20deg);
    }

    /* HEADER CON EL COLOR DEEP MIDNIGHT BLUE */
    .tech-nav {
      background-color: var(--deep-midnight); 
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    /* FOOTER CON EL MISMO COLOR */
    .tech-footer {
      background-color: var(--deep-midnight);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    /* LOGO FUSION: Mantiene el hack para integrar la imagen */
    .logo-fusion {
      mix-blend-mode: lighten; 
      filter: contrast(1.2) brightness(1.1); 
    }
  `}</style>
);

const LandingPage = () => {
  const { city_slug } = useParams();

  // 1. DECLARACIÓN CORRECTA (Ámbito Superior)
  const targetCity = city_slug ? city_slug.toLowerCase() : 'villa-de-leyva';

  // Formatear el nombre de la ciudad (ej: villa-de-leyva -> Villa De Leyva)
  const cityName = city_slug
    ? city_slug
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : 'Colombia';

  // ==========================================
  // 🔒 LÓGICA DE NEGOCIO (INMUTABLE)
  // ==========================================
  const [launchData, setLaunchData] = useState({ total: 12, taken: 0 });
  const [spotsTaken, setSpotsTaken] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formStatus, setFormStatus] = useState('idle');
  const [formData, setFormData] = useState({
    ownerName: '',
    hotelName: '',
    email: '',
    phone: '',
    rooms: '',
    currentSoftware: '',
  });

  // 👇 NUEVA LÓGICA DE SCROLL
  const [isNavHidden, setIsNavHidden] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    // Si estamos en el tope (menos de 100px), MOSTRAR.
    // Si bajamos más de 100px, OCULTAR.
    if (latest < 100) {
      setIsNavHidden(false);
    } else {
      setIsNavHidden(true);
    }
  });

  useEffect(() => {
    const fetchLaunchData = async () => {
      try {
        const { data } = await supabase
          .from('launch_control')
          .select('total_spots, spots_taken')
          .eq('city_slug', targetCity) // 👈 USA LA VARIABLE SUPERIOR
          .single();

        if (data) {
          setLaunchData({ total: data.total_spots, taken: data.spots_taken });
          setSpotsTaken(data.spots_taken);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };
    fetchLaunchData();

    // 2. ELIMINADA LA REDECLARACIÓN DUPLICADA AQUÍ QUE ROMPÍA EL CÓDIGO

    const channel = supabase
      .channel('launch-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'launch_control',
          filter: `city_slug=eq.${targetCity}`, // 👈 USA LA VARIABLE SUPERIOR
        },
        (payload) => {
          setSpotsTaken(payload.new.spots_taken);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [targetCity]); // 👈 3. AGREGADA DEPENDENCIA PARA CAMBIOS DE CIUDAD

  const TOTAL_SPOTS = launchData.total;
  const spotsLeft = Math.max(0, TOTAL_SPOTS - spotsTaken);
  const isWaitlist = spotsTaken >= TOTAL_SPOTS;
  const progressPercent = Math.min((spotsTaken / TOTAL_SPOTS) * 100, 100);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('leads').insert([
        {
          full_name: formData.ownerName,

          // --- INICIO DE CÓDIGO NUEVO ---
          hotel_name: formData.hotelName,
          phone: formData.phone,
          email: formData.email,
          city_interest: cityName,
          metadata: {
            rooms: formData.rooms,
            software: formData.currentSoftware,
            status: 'APPLYING_FOUNDER',
            source_url: window.location.href,
            user_agent: navigator.userAgent,
            // Segmentación Automática 2.0 basada en tamaño
            plan_interest:
              formData.rooms <= 3
                ? 'NANO'
                : formData.rooms <= 12
                ? 'PRO'
                : formData.rooms <= 30
                ? 'GROWTH'
                : 'CORPORATE',
          },
        },
      ]);

      // GROWTH HACK: Disparar mensaje de bienvenida automático (Evolution API)
      if (!error && formData.phone) {
        const welcomeMsg = `¡Hola ${formData.ownerName}! 🌟 Gracias por postular a *HospedaSuite Elite* para el hotel *${formData.hotelName}*. Hemos recibido tu solicitud para el programa de Fundadores en ${cityName}. Un consultor validará tu perfil pronto.`;

        fetch('https://api.hospedasuite.com/message/sendText/MainBot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_EVOLUTION_API_KEY,
          },
          body: JSON.stringify({
            number: formData.phone.replace(/\D/g, ''),
            textMessage: { text: welcomeMsg },
          }),
        }).catch((e) => console.log('Bot ocupado, se contactará manual.'));
      }
      // --- FIN DE CÓDIGO NUEVO ---

      if (error) throw error;
      setTimeout(() => {
        setFormStatus('success');
        setLoading(false);
      }, 1500);
    } catch (err) {
      console.error(err);
      setFormStatus('error');
      setLoading(false);
    }
  };

  // ==========================================
  // 🎨 UI FINAL (CONTRASTE MEJORADO)
  // ==========================================

  return (
    <div className='min-h-screen text-slate-900 selection:bg-cyan-500/30 selection:text-cyan-900 overflow-x-hidden relative bg-[#F8FAFC]'>
      <GlobalStyles />
      <Helmet>
        <title>HospedaSuite Elite | Tecnología de Blindaje Hotelero</title>
        <meta
          name='theme-color'
          content='#010512'
        />
      </Helmet>

      {/* --- BACKGROUND GLOWS --- */}
      <div className='fixed inset-0 z-0 pointer-events-none overflow-hidden'>
        <div className='absolute top-[-10%] left-[10%] w-[700px] h-[700px] bg-cyan-500/10 rounded-full blur-[120px]' />
        <div className='absolute top-[5%] right-[-5%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]' />
      </div>

      {/* --- BARRA SUPERIOR (ANIMADA) --- */}
      <motion.nav
        variants={{
          visible: { y: 0, opacity: 1 },
          hidden: { y: '-100%', opacity: 0 },
        }}
        animate={isNavHidden ? 'hidden' : 'visible'}
        transition={{
          duration: 0.5,
          ease: [0.25, 0.1, 0.25, 1], // Curva Bézier
        }}
        className='fixed top-0 w-full z-50 tech-nav h-auto py-4 shadow-2xl transition-shadow duration-300'
      >
        <div className='max-w-7xl mx-auto px-6 h-full flex items-center justify-between'>
          {/* LOGO FUSIONADO */}
          <div className='flex items-center h-full py-2'>
            <img
              src='/logo.png'
              alt='HospedaSuite Logo'
              className='h-36 w-auto object-contain logo-fusion'
            />
          </div>

          <div className='flex items-center gap-4'>
            {/* Etiqueta Villa de Leyva */}
            <div className='hidden md:flex items-center gap-2 px-4 py-1.5 rounded bg-[#0a1020] border border-slate-700 text-cyan-400 text-[11px] font-bold tracking-widest uppercase'>
              <span className='relative flex h-2 w-2'>
                <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75'></span>
                <span className='relative inline-flex rounded-full h-2 w-2 bg-cyan-500'></span>
              </span>
              Villa de Leyva
            </div>
          </div>
        </div>
      </motion.nav>

      <main className='relative z-10 pt-52 pb-20'>
        {/* --- HERO SECTION --- */}
        <div className='max-w-5xl mx-auto px-6 text-center mb-20'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className='inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-cyan-200 text-cyan-700 text-[11px] font-bold uppercase tracking-widest mb-8 shadow-sm cursor-default'>
              <Star
                size={12}
                fill='currentColor'
                className='text-cyan-500'
              />
              Acceso Exclusivo Fundadores
            </div>

            <h1 className='text-5xl md:text-6xl lg:text-7xl font-serif-display font-bold text-slate-900 mb-6 leading-[1.1] tracking-tight'>
              Blindaje Legal y Automatización <br className='hidden lg:block' />
              <span className='text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-cyan-500 to-blue-600'>
                para Hoteles de Élite.
              </span>
            </h1>

            {/* Contraste mejorado: text-slate-600 -> text-slate-700 */}
            <p className='text-lg text-slate-700 max-w-2xl mx-auto mb-10 leading-relaxed font-light'>
              Automatice su reporte{' '}
              <strong className='text-slate-900 font-semibold'>SIRE</strong> y
              capture su{' '}
              <strong className='text-slate-900 font-semibold'>
                Tarjeta de Registro (TRA)
              </strong>{' '}
              sin intervención manual. La seguridad de un banco, en su
              recepción.
            </p>
          </motion.div>

          {/* STATUS CARD */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className='max-w-md mx-auto bg-white rounded-2xl p-1 shadow-2xl shadow-cyan-900/10 border border-slate-200 relative'
          >
            <div className='absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent'></div>

            <div className='bg-white rounded-xl p-6'>
              {isWaitlist ? (
                <div className='text-center'>
                  <div className='flex justify-center text-amber-500 mb-2'>
                    <AlertTriangle />
                  </div>
                  <h3 className='font-bold text-slate-800'>CUPOS AGOTADOS</h3>
                  <p className='text-sm text-slate-600'>
                    {' '}
                    {/* slate-500 -> 600 */}
                    Lista de espera activa.
                  </p>
                </div>
              ) : (
                <>
                  <div className='flex justify-between items-end mb-3'>
                    {/* Contraste: text-slate-400 -> text-slate-500 */}
                    <span className='text-[10px] font-extrabold text-slate-500 uppercase tracking-widest'>
                      Estado del Sistema
                    </span>
                    <span className='text-sm font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-100'>
                      {spotsTaken} / {TOTAL_SPOTS} ACTIVADOS
                    </span>
                  </div>

                  <div className='h-3 bg-slate-100 rounded-full overflow-hidden mb-4 shadow-inner'>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 1.5, ease: 'easeOut' }}
                      className={`h-full relative ${
                        progressPercent > 80
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                          : 'bg-gradient-to-r from-blue-600 to-cyan-400'
                      }`}
                    >
                      <div className='absolute top-0 right-0 bottom-0 w-full bg-gradient-to-l from-white/30 to-transparent' />
                    </motion.div>
                  </div>

                  <p className='text-xs text-slate-600 flex items-center justify-center gap-2 font-medium'>
                    {spotsLeft > 0 ? (
                      <span>
                        Quedan{' '}
                        <strong className='text-cyan-700'>
                          {spotsLeft} cupos
                        </strong>{' '}
                        con Beca de Implementación.
                      </span>
                    ) : (
                      'Procesando últimas solicitudes...'
                    )}
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </div>

        {/* --- FEATURES GRID --- */}
        <section className='max-w-6xl mx-auto px-6 mb-24'>
          <div className='grid md:grid-cols-3 gap-6'>
            <FeatureCard
              icon={
                <ShieldCheck
                  size={28}
                  className='text-cyan-500'
                />
              }
              title='SIRE Automático'
              desc='Conexión encriptada con Migración Colombia. Cero errores humanos.'
            />
            <FeatureCard
              icon={
                <Lock
                  size={28}
                  className='text-blue-600'
                />
              }
              title='Blindaje Ley 1581'
              desc='Recolección de Habeas Data firmada digitalmente.'
            />
            <FeatureCard
              icon={
                <Zap
                  size={28}
                  className='text-amber-500'
                />
              }
              title='Check-in Veloz'
              desc='Proceso de 30 segundos. Recepción libre de papel.'
            />
          </div>
        </section>

        {/* --- PRICING & FORM SECTION --- */}
        <section className='bg-white border-y border-slate-200 py-20 px-6 shadow-sm relative overflow-hidden'>
          <div className='absolute right-0 top-0 w-1/3 h-full bg-slate-50 skew-x-12 z-0 opacity-50'></div>

          <div className='max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-start relative z-10'>
            {/* Left Column: Pricing */}
            <div className='space-y-8 sticky top-24'>
              <div>
                <h2 className='text-3xl font-serif-display font-bold text-slate-900 mb-2'></h2>
                <p className='text-slate-600 mb-6'>
                  Tecnología blindada para cada etapa de su hotel en {cityName}.
                </p>

                {/* TABLA DE PLANES 2.0: Segmentación Estratégica */}
                <div className='grid grid-cols-2 gap-4 mb-8'>
                  {[
                    { name: 'NANO', price: '49.900', feat: '1-3 Hab. / Legal' },
                    { name: 'PRO', price: '99.900', feat: '4-12 Hab. / SIRE' },
                    {
                      name: 'GROWTH',
                      price: '159.900',
                      feat: '13-30 Hab. / Bot',
                    },
                    {
                      name: 'CORP',
                      price: '249.900',
                      feat: '31+ Hab. / Audit',
                    },
                  ].map((p) => (
                    <div
                      key={p.name}
                      className='p-3 bg-white border border-slate-100 rounded-lg shadow-sm hover:border-cyan-200 transition-colors'
                    >
                      <div className='text-[10px] font-bold text-cyan-600 tracking-tighter'>
                        {p.name}
                      </div>
                      <div className='text-sm font-black text-slate-800'>
                        ${p.price}
                      </div>
                      <div className='text-[9px] text-slate-500 leading-tight'>
                        {p.feat}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className='bg-slate-50/80 backdrop-blur rounded-2xl p-8 border border-slate-200'>
                {/* 👇 MODIFICADO: PRECIO TACHADO PROTAGONISTA 👇 */}
                <div className='flex justify-between items-center mb-6'>
                  <div className='flex flex-col'>
                    <span className='text-slate-700 font-bold text-lg'>
                      Setup(configuración) + Licencia Mes 1
                    </span>
                    <span className='text-[10px] text-rose-500 font-bold uppercase tracking-wider'>
                      Precio Estándar
                    </span>
                  </div>
                  <span className='text-slate-400 font-black line-through text-3xl decoration-rose-500 decoration-2'>
                    $250.000
                  </span>
                </div>
                {/* 👆 FIN MODIFICACIÓN 👆 */}

                <div className='flex justify-between items-center p-6 bg-white border border-cyan-100 rounded-xl shadow-lg shadow-cyan-900/5 relative overflow-hidden group'>
                  <div className='absolute top-0 right-0 bg-cyan-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg z-20'>
                    BECA 100%
                  </div>
                  <div className='absolute inset-0 bg-gradient-to-r from-cyan-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500'></div>
                  <div className='relative z-10'>
                    <span className='text-slate-800 font-bold flex items-center gap-2 text-xs uppercase tracking-wider mb-1'>
                      <Server
                        size={14}
                        className='text-cyan-500'
                      />
                      Programa Fundador
                    </span>
                    <span className='text-cyan-600 font-black text-4xl tracking-tight'>
                      $0 COP
                    </span>
                  </div>
                </div>
                {/* slate-400 -> 500 */}
                <p className='text-xs text-slate-500 mt-6 text-center leading-relaxed'>
                  * A cambio de esta tecnología sin costo, solicitamos 15
                  minutos de feedback quincenal.
                </p>
              </div>
            </div>

            {/* Right Column: Form */}
            <div className='bg-white rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-100 p-8 md:p-10 relative overflow-hidden'>
              <div className='absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600'></div>

              {formStatus === 'success' ? (
                <div className='text-center py-12 animate-in fade-in zoom-in duration-500'>
                  <div className='w-20 h-20 bg-cyan-50 text-cyan-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-cyan-100'>
                    <CheckCircle2 size={40} />
                  </div>
                  <h3 className='text-2xl font-serif-display font-bold text-slate-900 mb-2'>
                    Solicitud Encriptada
                  </h3>
                  <p className='text-slate-600'>
                    Un consultor validará su ingreso en breve.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className='space-y-6'
                >
                  <div className='mb-6'>
                    <h3 className='text-xl font-bold text-slate-900'>
                      Postulación
                    </h3>
                    <p className='text-sm text-slate-600'>
                      Complete los datos para activar la beca.
                    </p>
                  </div>

                  <div className='grid md:grid-cols-2 gap-5'>
                    <InputGroup
                      label='Propietario'
                      placeholder='Nombre completo'
                      value={formData.ownerName}
                      onChange={(e) =>
                        setFormData({ ...formData, ownerName: e.target.value })
                      }
                    />
                    <InputGroup
                      label='Hotel'
                      placeholder='Nombre del Hotel'
                      icon={<Building2 size={16} />}
                      value={formData.hotelName}
                      onChange={(e) =>
                        setFormData({ ...formData, hotelName: e.target.value })
                      }
                    />
                  </div>

                  <div className='grid md:grid-cols-2 gap-5'>
                    <InputGroup
                      label='Email'
                      type='email'
                      placeholder='correo@hotel.com'
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                    <InputGroup
                      label='WhatsApp'
                      type='tel'
                      placeholder='300 123 4567'
                      icon={<Smartphone size={16} />}
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>

                  <InputGroup
                    label='Habitaciones'
                    type='number'
                    placeholder='Ej. 10'
                    value={formData.rooms}
                    onChange={(e) =>
                      setFormData({ ...formData, rooms: e.target.value })
                    }
                  />

                  <div className='space-y-1.5'>
                    <label className='text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1'>
                      Software Actual
                    </label>
                    <div className='relative'>
                      <select
                        className='w-full p-4 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all font-medium text-slate-900 appearance-none'
                        value={formData.currentSoftware}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            currentSoftware: e.target.value,
                          })
                        }
                      >
                        <option value=''>Seleccionar...</option>
                        <option value='Excel/Cuaderno'>Excel / Cuaderno</option>
                        <option value='Lobby'>Lobby PMS</option>
                        <option value='Booking'>Solo Booking.com</option>
                        <option value='Otro'>Otro</option>
                      </select>
                      <ChevronRight
                        className='absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none'
                        size={18}
                      />
                    </div>
                  </div>

                  <button
                    type='submit'
                    disabled={loading || isWaitlist}
                    className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-cyan-500/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 relative overflow-hidden group ${
                      isWaitlist
                        ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                        : 'bg-[#010512] text-white border border-slate-800'
                    }`}
                  >
                    {loading ? (
                      <>
                        <Clock className='animate-spin' /> Encriptando...
                      </>
                    ) : isWaitlist ? (
                      'Unirse a Lista de Espera'
                    ) : (
                      <>
                        <div className='cyber-button-glow group-hover:animate-[shimmer_1s_infinite]'></div>
                        <span className='relative z-10 flex items-center gap-2'>
                          Postular a Beca Fundador{' '}
                          <ChevronRight
                            size={20}
                            className='group-hover:translate-x-1 transition-transform text-cyan-400'
                          />
                        </span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className='tech-footer py-12 text-center'>
        {/* LOGO EN EL FOOTER */}
        <div className='h-12 w-auto mx-auto mb-6 flex justify-center opacity-80 hover:opacity-100 transition-opacity'>
          <img
            src='/logo.png'
            alt='Logo'
            className='h-full object-contain logo-fusion'
          />
        </div>
        {/* text-slate-400 se ve mejor (más claro) sobre fondo negro que el slate-500 */}
        <p className='text-slate-400 text-sm font-medium'>
          © {new Date().getFullYear()} HospedaSuite Elite. Villa de Leyva.
        </p>
      </footer>
      <SalesAgent />
    </div>
  );
};

// --- COMPONENTES AUXILIARES ---

const InputGroup = ({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  icon,
}) => {
  const [focused, setFocused] = useState(false);
  const isValid = value && value.length > 2;

  return (
    <div className='space-y-1.5'>
      <label
        className={`text-[11px] font-bold uppercase tracking-widest ml-1 transition-colors ${
          focused ? 'text-cyan-700' : 'text-slate-700' // Label más oscuro por defecto para legibilidad
        }`}
      >
        {label}
      </label>
      <div className='relative group'>
        <input
          type={type}
          required
          placeholder={placeholder}
          // Border-slate-300 para mejor definición, placeholder-slate-500 para mejor lectura
          className={`w-full p-4 pl-4 bg-slate-50 border rounded-xl outline-none transition-all duration-200 font-medium text-slate-900 placeholder:text-slate-500
                    ${
                      focused
                        ? 'bg-white border-cyan-500 ring-4 ring-cyan-500/10'
                        : 'border-slate-300 hover:border-slate-400'
                    }
                    ${
                      isValid && !focused ? 'bg-white border-cyan-500/50' : ''
                    }`}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <div className='absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-all'>
          {isValid ? (
            <CheckCircle2
              className='text-cyan-500 animate-in zoom-in'
              size={18}
            />
          ) : (
            icon
          )}
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <div className='p-6 bg-white rounded-2xl border border-slate-100 hover:border-cyan-200 hover:shadow-xl hover:shadow-cyan-500/5 transition-all duration-300 group'>
    <div className='w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-slate-600 shadow-sm border border-slate-100'>
      {icon}
    </div>
    <h3 className='font-bold text-slate-900 text-lg mb-2 group-hover:text-cyan-700 transition-colors'>
      {title}
    </h3>
    {/* slate-500 -> 600 para mejor lectura en tarjetas */}
    <p className='text-slate-600 text-sm leading-relaxed'>{desc}</p>
  </div>
);

export default LandingPage;
