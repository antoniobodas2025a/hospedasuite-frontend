import React, { useState, useEffect, useId } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import {
  motion,
  useScroll,
  useMotionValueEvent,
  AnimatePresence, // Necesario para animación de pasos
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
  Building2,
  Smartphone,
  Server,
  FileText,
  ArrowLeft, // Icono para volver atrás
  User,
  Mail,
} from 'lucide-react';
import SalesAgent from '../components/SalesAgent';

const LandingPage = () => {
  const { city_slug } = useParams();

  const cityName = city_slug
    ? city_slug
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : 'Colombia';

  // ==========================================
  // 🔒 LÓGICA DE NEGOCIO & ESTADOS
  // ==========================================
  const [launchData, setLaunchData] = useState({ total: 12, taken: 0 });
  const [spotsTaken, setSpotsTaken] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formStatus, setFormStatus] = useState('idle');

  // 🟢 NUEVO: Control de Pasos del Formulario
  const [formStep, setFormStep] = useState(1);

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

  // ---------------------------------------------------------
  // BLOQUE REPARADO: LÓGICA DE DATOS + WARM START (BLINDADO)
  // ---------------------------------------------------------
  useEffect(() => {
    const fetchLaunchData = async () => {
      try {
        // Defensa: Si city_slug no está definido, usamos el default
        const targetCity =
          typeof city_slug !== 'undefined' ? city_slug : 'villa-de-leyva';

        const { data } = await supabase
          .from('launch_control')
          .select('total_spots, spots_taken')
          .eq('city_slug', targetCity)
          .maybeSingle();

        // ESTRATEGIA DE MARKETING: WARM START
        // Inyectamos 3 fundadores "offline" para validación social
        const OFFLINE_FOUNDERS = 3;
        const DEFAULT_TOTAL = 12;

        const realTaken = data ? data.spots_taken : 0;
        const realTotal = data ? data.total_spots : DEFAULT_TOTAL;

        // Calculamos visual con tope máximo para no romper la UI (nunca > 12)
        const visualTaken = Math.min(realTaken + OFFLINE_FOUNDERS, realTotal);

        setLaunchData({ total: realTotal, taken: visualTaken });
        setSpotsTaken(visualTaken);
      } catch (error) {
        console.error('Error crítico recuperando datos:', error);
        // Fallback en caso de error total: mostrar 3/12
        setSpotsTaken(3);
      }
    };

    fetchLaunchData();
  }, []); // Array de dependencias vacío para correr solo al montaje

  // ---------------------------------------------------------
  // SUBSCRIPCIÓN REALTIME (CORREGIDA PARA WARM START)
  // ---------------------------------------------------------
  useEffect(() => {
    const channel = supabase
      .channel('launch-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'launch_control' },
        (payload) => {
          // Si entra una venta real, sumamos los 3 offline para mantener la ilusión
          const OFFLINE_FOUNDERS = 3;
          const newRealTaken = payload.new.spots_taken || 0;
          setSpotsTaken(Math.min(newRealTaken + OFFLINE_FOUNDERS, 12));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const TOTAL_SPOTS = launchData.total;
  const spotsLeft = Math.max(0, TOTAL_SPOTS - spotsTaken);
  const isWaitlist = spotsTaken >= TOTAL_SPOTS;
  const progressPercent = Math.min((spotsTaken / TOTAL_SPOTS) * 100, 100);

  // 🟢 NUEVO: Lógica de avance de paso (Validación Parcial)
  // 🟢 Lógica de avance de paso (Validación Saneada)
  const handleNextStep = (e) => {
    e.preventDefault();

    // 1. Saneamiento: Eliminamos todo lo que NO sea un número
    const cleanPhone = formData.phone.replace(/\D/g, '');

    // 2. Validar Nombre
    if (formData.ownerName.trim().length < 3) {
      alert('Por favor ingresa tu nombre completo.');
      return;
    }

    // 3. Validación Robusta: Acepta 10 dígitos (local) o 12 (con 57)
    const isValidPhone =
      /^3\d{9}$/.test(cleanPhone) || /^573\d{9}$/.test(cleanPhone);

    if (!isValidPhone) {
      alert(
        'Ingresa un WhatsApp válido (3XX... o 573XX...) sin espacios ni símbolos.'
      );
      return;
    }

    // Si pasa, avanzamos
    setFormStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData._honey) {
      setFormStatus('success');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('leads').insert([
        {
          full_name: formData.ownerName,
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
            plan_interest: formData.rooms <= 12 ? 'PRO' : 'GROWTH',
          },
        },
      ]);

      if (!error && formData.phone) {
        const welcomeMsg = `¡Hola Socio Fundador! 🌟 ${
          formData.ownerName
        }, hemos reservado tu Beca de Implementación para el hotel *${
          formData.hotelName
        }* en ${cityName}. Tu código de prioridad es: FUNDADOR-${Math.floor(
          Math.random() * 1000
        )}. Un consultor te contactará en breve.`;

        // 🛡️ LLAMADA SEGURA A BACKEND (Edge Function)
        // Ya no usamos fetch directo ni exponemos la API Key
        const { error: functionError } = await supabase.functions.invoke(
          'send-whatsapp',
          {
            body: {
              phone: formData.phone.replace(/\D/g, ''), // Enviamos número limpio
              message: welcomeMsg,
            },
          }
        );

        if (functionError) {
          console.error(
            'Error enviando WhatsApp (Edge Function):',
            functionError
          );
          // No detenemos el flujo porque el lead ya se guardó en la BD
        }
      }

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

  return (
    <div className='min-h-screen text-slate-900 selection:bg-cyan-500/30 selection:text-cyan-900 overflow-x-hidden relative bg-[#F8FAFC]'>
      <Helmet>
        <title>Convocatoria Socios Fundadores | HospedaSuite {cityName}</title>
        <meta
          name='theme-color'
          content='#010512'
        />
        <meta
          name='description'
          content={`Aplica a la Beca de Implementación Tecnológica para Hoteles en ${cityName}. Solo 12 Cupos para Socios Fundadores.`}
        />
        <meta
          property='og:title'
          content={`Beca Socio Fundador: Tecnología Hotelera en ${cityName}`}
        />
      </Helmet>

      <div className='fixed inset-0 z-0 pointer-events-none overflow-hidden'>
        <div className='hidden md:block absolute top-[-10%] left-[10%] w-[700px] h-[700px] bg-cyan-500/10 rounded-full blur-[120px]' />
        <div className='hidden md:block absolute top-[5%] right-[-5%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]' />
      </div>

      <motion.nav
        variants={{
          visible: { y: 0, opacity: 1 },
          hidden: { y: '-100%', opacity: 0 },
        }}
        animate={isNavHidden ? 'hidden' : 'visible'}
        className='fixed top-0 w-full z-50 tech-nav h-auto py-4 shadow-2xl'
      >
        <div className='max-w-7xl mx-auto px-6 h-full flex items-center justify-between'>
          <div className='flex items-center h-full py-2'>
            <img
              src='/logo.png'
              alt='HospedaSuite Logo'
              className='h-36 w-auto object-contain logo-fusion'
              width='200'
              height='80'
            />
          </div>
          <div className='flex items-center gap-4'>
            <div className='hidden md:flex items-center gap-2 px-4 py-1.5 rounded bg-[#0a1020] border border-slate-700 text-cyan-400 text-[11px] font-bold tracking-widest uppercase'>
              <span className='relative flex h-2 w-2'>
                <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75'></span>
                <span className='relative inline-flex rounded-full h-2 w-2 bg-cyan-500'></span>
              </span>
              Convocatoria Activa: {cityName}
            </div>
          </div>
        </div>
      </motion.nav>

      <main className='relative z-10 pt-52 pb-20'>
        {/* --- HERO SECTION PERSUASIVO --- */}
        <div className='max-w-5xl mx-auto px-6 text-center mb-20'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className='inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold uppercase tracking-widest mb-8 shadow-sm cursor-default'>
              <Star
                size={12}
                fill='currentColor'
                className='text-amber-500'
              />
              Iniciativa de Modernización Turística
            </div>

            <h1 className='text-5xl md:text-6xl lg:text-7xl font-serif-display font-bold text-slate-900 mb-6 leading-[1.1] tracking-tight'>
              Se Buscan 12{' '}
              <span className='text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-cyan-500 to-blue-600'>
                Socios Fundadores
              </span>{' '}
              <br className='hidden lg:block' />
              en {cityName}.
            </h1>

            {/* P: Explica la oferta real: Tecnología a cambio de feedback, sin rodeos */}
            <p className='text-lg text-slate-700 max-w-2xl mx-auto mb-10 leading-relaxed font-light'>
              Active su{' '}
              <strong>
                Subvención de Lanzamiento (Primer Mes 100% Bonificado).
              </strong>
              .
              <br />
              Automatice sus reportes legales (SIRE/TRA) y eleve el estándar de
              su hotel antes de que la normativa se endurezca.
              <span className='block mt-4 text-sm font-medium text-slate-500 bg-slate-50 py-1 px-3 rounded-lg inline-block border border-slate-200'>
                🔒 Únase al grupo exclusivo que está blindando su operación hoy.
              </span>
            </p>
          </motion.div>

          {/* STATUS CARD (ESCASEZ) */}
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
                  <h3 className='font-bold text-slate-800'>
                    CONVOCATORIA CERRADA
                  </h3>
                  <p className='text-sm text-slate-600'>
                    Hemos alcanzado los 12 Socios Fundadores.
                  </p>
                </div>
              ) : (
                <>
                  <div className='flex justify-between items-end mb-3'>
                    <span className='text-[10px] font-extrabold text-slate-500 uppercase tracking-widest'>
                      Cupos Fundadores
                    </span>
                    <span className='text-sm font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-100'>
                      {spotsTaken} / {TOTAL_SPOTS} ASIGNADOS
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
                        Solo quedan{' '}
                        <strong className='text-cyan-700'>
                          {spotsLeft} Becas Disponibles
                        </strong>{' '}
                        hoy.
                      </span>
                    ) : (
                      'Validando últimas postulaciones...'
                    )}
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </div>

        <section className='max-w-6xl mx-auto px-6 mb-24'>
          <div className='grid md:grid-cols-4 gap-6'>
            <FeatureCard
              icon={
                <ShieldCheck
                  size={28}
                  className='text-cyan-500'
                />
              }
              title='Blindaje Legal'
              desc='Cumplimiento automático de normativa SIRE y Ley de Habeas Data.'
            />
            <FeatureCard
              icon={
                <Zap
                  size={28}
                  className='text-amber-500'
                />
              }
              title='Cero Costo Setup'
              desc='Beca del 100% en la implementación y configuración inicial.'
            />
            <FeatureCard
              icon={
                <Clock
                  size={28}
                  className='text-blue-600'
                />
              }
              title='Ahorro de Tiempo'
              desc='Check-in digital en 30 segundos. Adiós al papel.'
            />
            <FeatureCard
              icon={
                <FileText
                  size={28}
                  className='text-indigo-500'
                />
              }
              title='Soporte Prioritario'
              desc='Canal directo exclusivo para Socios Fundadores.'
            />
          </div>
        </section>

        <section className='bg-white border-y border-slate-200 py-20 px-6 shadow-sm relative overflow-hidden'>
          <div className='absolute right-0 top-0 w-1/3 h-full bg-slate-50 skew-x-12 z-0 opacity-50'></div>
          <div className='max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-start relative z-10'>
            {/* Left Column: Beneficios */}
            <div className='space-y-8 sticky top-24'>
              <div>
                <h2 className='text-3xl font-serif-display font-bold text-slate-900 mb-2'>
                  Beneficios del Socio Fundador
                </h2>
                <p className='text-slate-600 mb-6'>
                  Al ser seleccionado en el grupo de los 12 primeros en{' '}
                  {cityName}, usted obtiene:
                </p>

                <ul className='space-y-4 mb-8'>
                  {[
                    'Licencia de Software HospedaSuite Elite.',
                    'Configuración y Migración de Datos (Valor: $250k).',
                    'Capacitación Certificada para su equipo.',
                    'Auditoría Legal de su proceso actual.',
                  ].map((item, i) => (
                    <li
                      key={i}
                      className='flex items-center gap-3 text-slate-700 font-medium'
                    >
                      <CheckCircle2
                        size={18}
                        className='text-cyan-500 shrink-0'
                      />{' '}
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className='bg-slate-50/80 backdrop-blur rounded-2xl p-8 border border-slate-200'>
                <div className='flex justify-between items-center mb-6'>
                  <div className='flex flex-col'>
                    <span className='text-slate-700 font-bold text-lg'>
                      Paquete de Implementación
                    </span>
                    <span className='text-[10px] text-rose-500 font-bold uppercase tracking-wider'>
                      Precio Público
                    </span>
                  </div>
                  <span className='text-slate-400 font-black line-through text-3xl decoration-rose-500 decoration-2'>
                    $250.000
                  </span>
                </div>
                <div className='flex justify-between items-center p-6 bg-white border border-cyan-100 rounded-xl shadow-lg shadow-cyan-900/5 relative overflow-hidden group'>
                  <div className='absolute top-0 right-0 bg-cyan-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg z-20'>
                    BECA 100%
                  </div>
                  <div className='relative z-10'>
                    <span className='text-slate-800 font-bold flex items-center gap-2 text-xs uppercase tracking-wider mb-1'>
                      <Server
                        size={14}
                        className='text-cyan-500'
                      />
                      Costo para Fundadores
                    </span>
                    <span className='text-cyan-600 font-black text-4xl tracking-tight'>
                      $0 COP
                    </span>
                  </div>
                </div>
                <p className='text-xs text-slate-500 mt-6 text-center leading-relaxed'>
                  * A cambio de la beca, solicitamos una breve sesión de
                  feedback quincenal para mejorar el producto.
                </p>
              </div>
            </div>

            {/* Right Column: MULTI-STEP FORM (SIN FRICCIÓN) */}
            <div className='bg-white rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-100 p-8 md:p-10 relative overflow-hidden'>
              <div className='absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600'></div>

              {formStatus === 'success' ? (
                <div className='text-center py-12 animate-in fade-in zoom-in duration-500'>
                  <div className='w-20 h-20 bg-cyan-50 text-cyan-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-cyan-100'>
                    <CheckCircle2 size={40} />
                  </div>
                  <h3 className='text-2xl font-serif-display font-bold text-slate-900 mb-2'>
                    ¡Postulación Recibida!
                  </h3>
                  <p className='text-slate-600'>
                    Bienvenido al proceso de selección, futuro Fundador. <br />
                    Lo contactaremos por WhatsApp.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className='relative min-h-[400px]'
                >
                  <div className='mb-6'>
                    <h3 className='text-xl font-bold text-slate-900'>
                      Solicitar Ingreso al Círculo Fundador
                    </h3>
                    <p className='text-sm text-slate-600'>
                      Paso {formStep} de 2:{' '}
                      {formStep === 1
                        ? 'Datos de Contacto'
                        : 'Perfil del Hotel'}
                    </p>
                    {/* Barra de progreso del form */}
                    <div className='w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden'>
                      <motion.div
                        animate={{ width: formStep === 1 ? '50%' : '100%' }}
                        className='h-full bg-cyan-500'
                      />
                    </div>
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
                        <InputGroup
                          label='Su Nombre'
                          icon={<User size={16} />}
                          placeholder='Ej: Juan Pérez'
                          value={formData.ownerName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              ownerName: e.target.value,
                            })
                          }
                        />
                        <InputGroup
                          label='WhatsApp Personal'
                          type='tel'
                          icon={<Smartphone size={16} />}
                          placeholder='300 123 4567'
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                        />

                        <button
                          onClick={handleNextStep}
                          className='w-full py-4 mt-4 rounded-xl font-bold text-lg bg-[#010512] text-white hover:shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 group'
                        >
                          Verificar Elegibilidad{' '}
                          <ChevronRight
                            size={20}
                            className='group-hover:translate-x-1 transition-transform text-cyan-400'
                          />
                        </button>
                        <p className='text-[10px] text-center text-slate-400 mt-4'>
                          🔒 Sus datos están protegidos. Sin compromiso.
                        </p>
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
                        <div className='grid md:grid-cols-2 gap-4'>
                          <InputGroup
                            label='Nombre del Hotel'
                            icon={<Building2 size={16} />}
                            placeholder='Hotel Paraíso'
                            value={formData.hotelName}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                hotelName: e.target.value,
                              })
                            }
                          />
                          <InputGroup
                            label='Email'
                            type='email'
                            icon={<Mail size={16} />}
                            placeholder='admin@hotel.com'
                            value={formData.email}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                email: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div className='grid grid-cols-2 gap-4'>
                          <InputGroup
                            label='N° Habitaciones'
                            type='number'
                            placeholder='10'
                            value={formData.rooms}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                rooms: e.target.value,
                              })
                            }
                          />
                          <div className='space-y-1.5'>
                            <label className='text-[11px] font-bold text-slate-700 uppercase tracking-widest ml-1'>
                              Software
                            </label>
                            <div className='relative'>
                              <select
                                className='w-full p-4 bg-slate-50 border border-slate-300 rounded-xl outline-none font-medium text-sm'
                                value={formData.currentSoftware}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    currentSoftware: e.target.value,
                                  })
                                }
                              >
                                <option value=''>Elegir...</option>
                                <option value='Manual'>
                                  Manual / Cuaderno
                                </option>
                                <option value='Excel'>Excel</option>
                                <option value='Otro'>Otro Software</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* HONEYPOT */}
                        <div className='opacity-0 absolute -z-10 h-0 w-0 overflow-hidden'>
                          <input
                            type='text'
                            name='_honey'
                            value={formData._honey}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                _honey: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div className='flex gap-3 pt-2'>
                          <button
                            type='button'
                            onClick={() => setFormStep(1)}
                            className='p-4 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors'
                          >
                            <ArrowLeft size={20} />
                          </button>
                          <button
                            type='submit'
                            disabled={loading || isWaitlist}
                            className='flex-1 py-4 rounded-xl font-bold text-lg bg-[#010512] text-white hover:shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 relative overflow-hidden group'
                          >
                            {loading ? (
                              <>
                                <Clock className='animate-spin' /> Procesando...
                              </>
                            ) : (
                              <>
                                <div className='cyber-button-glow group-hover:animate-[shimmer_1s_infinite]'></div>
                                <span className='relative z-10'>
                                  Solicitar Beca Fundador
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className='tech-footer py-12 text-center'>
        <div className='h-12 w-auto mx-auto mb-6 flex justify-center opacity-80 hover:opacity-100 transition-opacity'>
          <img
            src='/logo.png'
            alt='Logo'
            className='h-full object-contain logo-fusion'
          />
        </div>
        <p className='text-slate-400 text-sm font-medium'>
          © {new Date().getFullYear()} HospedaSuite Elite. Programa de Socios
          Fundadores.
        </p>
      </footer>
      <SalesAgent />
    </div>
  );
};

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

  // 🟢 GENERACIÓN DE ID ÚNICO AUTOMÁTICO
  const inputId = useId();

  return (
    <div className='space-y-1.5'>
      <label
        htmlFor={inputId} // 🟢 VINCULACIÓN PARTE A
        className={`text-[11px] font-bold uppercase tracking-widest ml-1 transition-colors cursor-pointer ${
          // Agregamos cursor-pointer
          focused ? 'text-cyan-700' : 'text-slate-700'
        }`}
      >
        {label}
      </label>
      <div className='relative group'>
        <input
          id={inputId} // 🟢 VINCULACIÓN PARTE B
          type={type}
          required
          placeholder={placeholder}
          className={`w-full p-4 pl-4 bg-slate-50 border rounded-xl outline-none transition-all duration-200 font-medium text-slate-900 placeholder:text-slate-400 ${
            focused
              ? 'bg-white border-cyan-500 ring-4 ring-cyan-500/10'
              : 'border-slate-300 hover:border-slate-400'
          } ${isValid && !focused ? 'bg-white border-cyan-500/50' : ''}`}
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
    <p className='text-slate-600 text-sm leading-relaxed'>{desc}</p>
  </div>
);

export default LandingPage;
