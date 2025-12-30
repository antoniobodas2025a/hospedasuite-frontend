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
  AlertTriangle,
  ChevronRight,
  Star,
  Building2,
  Smartphone,
  Server,
  ArrowLeft,
  User,
  Mail,
  Camera,
  UploadCloud,
  FileText,
  MapPin,
  Gift, // Nuevo icono para el beneficio
} from 'lucide-react';
import SalesAgent from '../components/SalesAgent';

const LandingPage = () => {
  const { city_slug } = useParams();

  const cityName = city_slug
    ? city_slug
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : 'Su Zona';

  // ==========================================
  // 🔒 LÓGICA DE NEGOCIO & ESTADOS
  // ==========================================
  const [launchData, setLaunchData] = useState({ total: 12, taken: 0 });
  const [spotsTaken, setSpotsTaken] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formStatus, setFormStatus] = useState('idle');
  const [formStep, setFormStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState('PRO');

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
  // LÓGICA DE ESCASEZ: "CAPACIDAD DE IMPLEMENTACIÓN LOCAL"
  // ---------------------------------------------------------
  useEffect(() => {
    const fetchLaunchData = async () => {
      try {
        const targetCity =
          typeof city_slug !== 'undefined' ? city_slug : 'villa-de-leyva';
        const { data } = await supabase
          .from('launch_control')
          .select('total_spots, spots_taken')
          .eq('city_slug', targetCity)
          .maybeSingle();

        // SIMULACIÓN DE WARM START:
        // "3 hoteles ya están siendo configurados por el equipo en terreno"
        const TEAM_CAPACITY_USED = 3;
        const DEFAULT_TOTAL = 12; // Límite estricto por ciudad/visita

        const realTaken = data ? data.spots_taken : 0;
        const realTotal = data ? data.total_spots : DEFAULT_TOTAL;
        const visualTaken = Math.min(realTaken + TEAM_CAPACITY_USED, realTotal);

        setLaunchData({ total: realTotal, taken: visualTaken });
        setSpotsTaken(visualTaken);
      } catch (error) {
        setSpotsTaken(3);
      }
    };
    fetchLaunchData();
  }, [city_slug]);

  const TOTAL_SPOTS = launchData.total;
  const spotsLeft = Math.max(0, TOTAL_SPOTS - spotsTaken);
  const isWaitlist = spotsTaken >= TOTAL_SPOTS;
  const progressPercent = Math.min((spotsTaken / TOTAL_SPOTS) * 100, 100);

  const scrollToForm = (plan) => {
    setSelectedPlan(plan);
    const element = document.getElementById('activation-form');
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (formData.ownerName.trim().length < 3) {
      alert('Por favor ingresa tu nombre completo.');
      return;
    }
    const isValidPhone =
      /^3\d{9}$/.test(cleanPhone) || /^573\d{9}$/.test(cleanPhone);
    if (!isValidPhone) {
      alert('Ingresa un WhatsApp válido para activar el mes de regalo.');
      return;
    }
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
            status: 'FOUNDER_APPLICANT', // Solicitante Fundador
            source_url: window.location.href,
            plan_interest: selectedPlan,
            offer_claimed: '1_MONTH_FREE', // Registro del beneficio
          },
        },
      ]);

      if (!error && formData.phone) {
        const welcomeMsg = `🎉 *¡Felicidades Socio Fundador!* \n\nHola ${formData.ownerName}, hemos reservado tu cupo de implementación en ${cityName}.\n\n🎁 *Beneficio Activado:* Tu primer mes es GRATIS ($0).\n\nEl ingeniero encargado te escribirá en breve para configurar tu cuenta.`;

        await supabase.functions.invoke('send-whatsapp', {
          body: {
            phone: formData.phone.replace(/\D/g, ''),
            message: welcomeMsg,
          },
        });
      }
      if (!error) {
        // Truco Psicológico: Avanzamos la barra visualmente +1 de inmediato
        setSpotsTaken((prev) => Math.min(prev + 1, launchData.total));
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
        <title>Socios Fundadores | HospedaSuite {cityName}</title>
        <meta
          name='theme-color'
          content='#010512'
        />
      </Helmet>

      {/* Background FX */}
      <div className='fixed inset-0 z-0 pointer-events-none overflow-hidden'>
        <div className='hidden md:block absolute top-[-10%] left-[10%] w-[700px] h-[700px] bg-cyan-500/5 rounded-full blur-[120px]' />
        <div className='hidden md:block absolute top-[5%] right-[-5%] w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px]' />
      </div>

      {/* ========================================================
          NAVBAR: LOGO GRANDE Y PRESENCIA
         ======================================================== */}
      <motion.nav
        variants={{
          visible: { y: 0, opacity: 1 },
          hidden: { y: '-100%', opacity: 0 },
        }}
        animate={isNavHidden ? 'hidden' : 'visible'}
        className='fixed top-0 w-full z-50 tech-nav h-auto py-4 shadow-xl bg-white/95 backdrop-blur-md border-b border-slate-100'
      >
        <div className='max-w-7xl mx-auto px-6 h-full flex items-center justify-between'>
          {/* LOGO MÁS GRANDE */}
          <div className='flex items-center h-full'>
            <img
              src='/logo.png'
              alt='HospedaSuite'
              className='h-16 md:h-20 w-auto object-contain drop-shadow-sm'
            />
          </div>

          <div className='hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-cyan-400 text-[11px] font-bold uppercase tracking-widest shadow-lg shadow-slate-900/20'>
            <MapPin
              size={12}
              className='text-cyan-500'
            />
            Equipo en Zona: {cityName}
          </div>
        </div>
      </motion.nav>

      <main className='relative z-10 pt-40 pb-20'>
        {/* ========================================================
            1. HERO: ESCASEZ LOCAL + BENEFICIO "MES GRATIS"
           ======================================================== */}
        <div className='max-w-4xl mx-auto px-6 text-center mb-16'>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* BADGE DE BENEFICIO EXCLUSIVO */}
            <div className='inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-widest mb-8 shadow-sm cursor-default transform hover:scale-105 transition-transform'>
              <Gift
                size={14}
                className='text-amber-600'
              />
              Oferta Socio Fundador
            </div>

            <h1 className='text-4xl md:text-6xl lg:text-7xl font-serif-display font-bold text-slate-900 mb-6 leading-[1.1] tracking-tight'>
              Buscamos 12 Hoteles <br className='hidden md:block' />
              <span className='text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-cyan-600 to-blue-600'>
                Líderes en {cityName}
              </span>
            </h1>

            <p className='text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed font-light'>
              Únase al programa de{' '}
              <span className='font-bold text-slate-900 bg-cyan-50 px-2 rounded mx-1 border border-cyan-100'>
                SOCIOS FUNDADORES
              </span>{' '}
              <strong>+ Implementación Asistida</strong> y obtenga su
              <span className='font-bold text-slate-900 bg-cyan-50 px-2 rounded mx-1 border border-cyan-100'>
                Primer Mes 100% Bonificado.
              </span>
              .
              <br className='hidden md:block' />
              Nuestro equipo está configurando cuentas esta semana.
            </p>
          </motion.div>

          {/* STATUS CARD - PROGRESS BAR (ESCASEZ REAL) */}
          <div className='max-w-md mx-auto bg-white rounded-2xl p-6 shadow-2xl shadow-cyan-900/10 border border-slate-200 relative overflow-hidden group'>
            <div className='absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50'></div>

            <div className='flex justify-between items-end mb-3'>
              <span className='text-[10px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1'>
                <MapPin size={10} /> Cupos en {cityName}
              </span>
              <span className='text-sm font-bold text-cyan-700 bg-cyan-50 px-3 py-1 rounded-full border border-cyan-100'>
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

            <p className='text-xs text-slate-600 font-medium leading-snug'>
              {spotsLeft > 0 ? (
                <>
                  Solo podemos configurar manualmente a{' '}
                  <strong className='text-slate-900'>
                    {spotsLeft} hoteles más
                  </strong>{' '}
                  es por tiempo limitado.
                  <span className='block mt-1 text-amber-600'>
                    ⚠️ Asegure su mes gratis hoy.
                  </span>
                </>
              ) : (
                'Cupos llenos. Lista de espera habilitada.'
              )}
            </p>
          </div>
        </div>

        {/* ========================================================
            2. PAIN SECTION: SIRE Y TIEMPO (SIN DIAN)
           ======================================================== */}
        <section className='max-w-5xl mx-auto px-6 mb-24'>
          <div className='bg-slate-50 rounded-[2.5rem] p-8 md:p-12 border border-slate-200 relative overflow-hidden'>
            {/* Background Icon Abstract */}
            <div className='absolute -right-10 -top-10 text-slate-200 opacity-50 rotate-12'>
              <FileText size={250} />
            </div>

            <div className='relative z-10 grid md:grid-cols-2 gap-12 items-center'>
              <div>
                <div className='flex items-center gap-2 text-amber-600 font-bold mb-4 bg-amber-50 w-fit px-3 py-1 rounded-full border border-amber-100'>
                  <AlertTriangle size={16} />
                  <span>RIESGO OPERATIVO</span>
                </div>
                <h2 className='text-3xl md:text-4xl font-serif-display font-bold text-slate-900 mb-4'>
                  ¿Sigue reportando a Migración manualmente?
                </h2>
                <p className='text-lg text-slate-600 mb-6 leading-relaxed'>
                  Llenar el SIRE huésped por huésped es lento y peligroso. Un
                  error en una fecha o un pasaporte mal digitado puede derivar
                  en procesos administrativos desgastantes.
                </p>
                <p className='font-medium text-slate-800 mb-6'>
                  Deje de perder 20 minutos diarios en tareas de "secretaría".
                </p>

                <div className='flex flex-col gap-3'>
                  <div className='bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 opacity-70'>
                    <div className='bg-slate-100 p-3 rounded-lg text-slate-400'>
                      <Clock size={24} />
                    </div>
                    <div>
                      <p className='text-xs text-slate-400 font-bold uppercase line-through'>
                        Método Tradicional
                      </p>
                      <p className='text-sm font-bold text-slate-500'>
                        Carga manual en plataforma SIRE (Lento y propenso a
                        errores)
                      </p>
                    </div>
                  </div>

                  <div className='bg-white p-4 rounded-xl shadow-lg border-l-4 border-cyan-500 flex items-center gap-4 transform translate-x-2'>
                    <div className='bg-cyan-50 p-3 rounded-lg text-cyan-600'>
                      <Zap size={24} />
                    </div>
                    <div>
                      <p className='text-xs text-cyan-600 font-bold uppercase'>
                        Modo Fundador
                      </p>
                      <p className='text-sm font-bold text-slate-900'>
                        Escaneo de Cédula + Envío Automático (0 Errores)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual de "Alivio" */}
              <div className='bg-white p-6 rounded-2xl shadow-xl border border-slate-100 relative'>
                <div className='absolute -top-3 -right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg'>
                  SOLUCIONADO
                </div>
                <div className='space-y-4 opacity-50 blur-[0.5px]'>
                  <div className='h-4 bg-slate-100 rounded w-3/4'></div>
                  <div className='h-4 bg-slate-100 rounded w-full'></div>
                  <div className='h-4 bg-slate-100 rounded w-5/6'></div>
                </div>
                <div className='mt-6 pt-6 border-t border-slate-100'>
                  <div className='flex items-center gap-3 text-green-700 bg-green-50 p-4 rounded-xl border border-green-100'>
                    <CheckCircle2 className='shrink-0' />
                    <p className='text-sm font-bold leading-tight'>
                      Reporte de Extranjeros enviado exitosamente a Migración
                      Colombia.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            3. RELIEF SECTION: "LO HACEMOS POR USTED"
           ======================================================== */}
        <section className='max-w-4xl mx-auto px-6 mb-24 text-center'>
          <h2 className='text-3xl font-serif-display font-bold text-slate-900 mb-4'>
            "No tengo tiempo para configurar sistemas..."
          </h2>
          <p className='text-slate-600 mb-10 text-lg'>
            Entendemos el trabajo duro del hotelero. Por eso, el beneficio de
            Socio Fundador incluye
            <strong className='text-cyan-700'>
              {' '}
              Servicio de Concierge Digital
            </strong>
            .
          </p>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {[
              {
                icon: <Camera className='text-purple-500' />,
                title: 'Carga de Fotos',
                desc: 'Subimos sus habitaciones por usted.',
              },
              {
                icon: <UploadCloud className='text-cyan-500' />,
                title: 'Migración Reservas',
                desc: 'Pasamos su cuaderno a digital hoy.',
              },
              {
                icon: <Server className='text-amber-500' />,
                title: 'Puesta en Marcha',
                desc: 'Lo dejamos operando en 24h.',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className='p-6 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300'
              >
                <div className='mb-4 flex justify-center scale-125'>
                  {item.icon}
                </div>
                <h3 className='font-bold text-slate-900 text-lg mb-2'>
                  {item.title}
                </h3>
                <p className='text-sm text-slate-500'>{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================
            4. PRICING: ESTRATEGIA "MES GRATIS"
           ======================================================== */}
        <section className='max-w-7xl mx-auto px-6 mb-24'>
          <div className='text-center mb-12'>
            <h2 className='text-3xl md:text-4xl font-serif-display font-bold text-slate-900'>
              Elija su Nivel de Automatización
            </h2>
            <p className='text-slate-500 mt-3'>
              Socios Fundadores no pagan nada el primer mes. Sin letra chica.
            </p>
          </div>

          <div className='grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-center'>
            {/* PLAN NANO */}
            <div className='p-6 rounded-3xl border border-slate-200 bg-white text-slate-500 relative'>
              <div className='mb-4'>
                <h3 className='font-bold text-lg'>NANO</h3>
                <p className='text-xs'>Básico (1-3 Habs)</p>
              </div>
              <div className='mb-6 opacity-50'>
                <span className='text-3xl font-black'>$49.9k</span>
                <span className='text-xs'>/mes</span>
              </div>
              <ul className='space-y-3 mb-8 text-sm'>
                <li className='flex gap-2 items-center'>
                  <CheckCircle2 size={14} /> Calendario Digital
                </li>
                <li className='flex gap-2 items-center text-red-400'>
                  <AlertTriangle size={14} /> Reporte SIRE Manual
                </li>
              </ul>
              <button
                onClick={() => scrollToForm('NANO')}
                className='w-full py-3 rounded-xl border border-slate-200 font-bold text-sm hover:bg-slate-50'
              >
                Elegir Básico
              </button>
            </div>

            {/* PLAN PRO (EL HÉROE) */}
            <div className='p-8 rounded-[2rem] border-2 border-cyan-500 bg-white shadow-2xl shadow-cyan-900/10 relative transform md:scale-110 z-10'>
              <div className='absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg flex items-center gap-2'>
                <Gift size={12} /> 1 Mes Gratis
              </div>

              <div className='mb-4 mt-2'>
                <h3 className='font-bold text-slate-900 text-2xl'>PRO</h3>
                <p className='text-xs'>Hoteles (4 a 12 Habs)</p>
                <p className='text-sm text-cyan-600 font-bold'>
                  Automatización Total
                </p>
              </div>

              <div className='mb-6'>
                <div className='flex items-center gap-2 mb-1'>
                  <span className='text-lg text-slate-400 line-through font-medium'>
                    $99.900
                  </span>
                  <span className='text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full'>
                    AHORRAS 100%
                  </span>
                </div>
                <span className='text-5xl font-black text-slate-900 tracking-tight'>
                  $0 COP
                </span>
                <p className='text-xs text-slate-500 mt-2 font-medium'>
                  * Primer mes bonificado. Luego $99.9k/mes.
                </p>
              </div>

              <ul className='space-y-4 mb-8 text-sm font-medium text-slate-700'>
                <li className='flex gap-3 items-center'>
                  <div className='bg-green-100 p-1 rounded-full text-green-600'>
                    <CheckCircle2 size={14} />
                  </div>
                  Reporte SIRE Automático
                </li>
                <li className='flex gap-3 items-center'>
                  <div className='bg-cyan-100 p-1 rounded-full text-cyan-600'>
                    <CheckCircle2 size={14} />
                  </div>
                  Check-in QR Express
                </li>
                <li className='flex gap-3 items-center'>
                  <div className='bg-blue-100 p-1 rounded-full text-blue-600'>
                    <CheckCircle2 size={14} />
                  </div>
                  Soporte Prioritario WhatsApp
                </li>
              </ul>

              <button
                onClick={() => scrollToForm('PRO')}
                className='w-full py-4 rounded-xl bg-[#010512] text-white font-bold text-lg hover:shadow-lg hover:shadow-cyan-500/25 transition-all flex justify-center items-center gap-2 group'
              >
                Reclamar Mes Gratis{' '}
                <ChevronRight
                  size={18}
                  className='group-hover:translate-x-1 transition-transform'
                />
              </button>
              <p className='text-[10px] text-center text-slate-400 mt-3'>
                Sin cláusulas de permanencia.
              </p>
            </div>

            {/* PLAN GROWTH */}
            <div className='p-6 rounded-3xl border border-slate-200 bg-white relative'>
              <div className='mb-4'>
                <h3 className='font-bold text-lg'>GROWTH</h3>
                <p className='text-xs'>Hoteles (13 a 30 Habs)</p>
              </div>
              <div className='mb-6'>
                <div className='flex items-center gap-2 mb-1'>
                  <span className='text-sm text-slate-400 line-through'>
                    $159.900
                  </span>
                </div>
                <span className='text-3xl font-black text-slate-900'>
                  $0 COP
                </span>
                <span className='text-xs text-slate-500 ml-1'>mes 1</span>
              </div>
              <ul className='space-y-3 mb-8 text-sm text-slate-600'>
                <li className='flex gap-2 items-center'>
                  <CheckCircle2
                    size={14}
                    className='text-blue-500'
                  />{' '}
                  CRM Marketing
                </li>
                <li className='flex gap-2 items-center'>
                  <CheckCircle2
                    size={14}
                    className='text-blue-500'
                  />{' '}
                  Bot WhatsApp
                </li>
              </ul>
              <button
                onClick={() => scrollToForm('GROWTH')}
                className='w-full py-3 rounded-xl border border-slate-900 text-slate-900 font-bold text-sm hover:bg-slate-50'
              >
                Elegir Growth
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================
            5. FORMULARIO DE CIERRE (ACTIVACIÓN INMEDIATA)
           ======================================================== */}
        <section
          id='activation-form'
          className='max-w-4xl mx-auto px-6'
        >
          <div className='bg-white rounded-3xl shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden relative'>
            <div className='absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600'></div>

            <div className='p-8 md:p-12'>
              <div className='mb-8 text-center'>
                <h3 className='text-2xl font-bold text-slate-900'>
                  Activar Beneficio Fundador
                </h3>
                <p className='text-slate-600 text-sm mt-1'>
                  Paso {formStep} de 2: Asegurando su cupo en {cityName}.
                </p>
              </div>

              {formStatus === 'success' ? (
                <div className='text-center py-12 bg-green-50 rounded-2xl border border-green-100 animate-in fade-in zoom-in'>
                  <div className='w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm'>
                    <CheckCircle2 size={40} />
                  </div>
                  <h3 className='text-2xl font-bold text-slate-900 mb-2'>
                    ¡Cupo Reservado!
                  </h3>
                  <p className='text-slate-600 px-6 mb-6'>
                    Bienvenido al grupo de fundadores. <br />
                    Su consultor local lo contactará en{' '}
                    <strong>menos de 5 minutos</strong> para iniciar la carga de
                    datos.
                  </p>
                  <div className='inline-block bg-white px-4 py-2 rounded-lg border border-slate-200 text-xs font-mono text-slate-500'>
                    Ticket: FND-{Math.floor(Math.random() * 1000)}
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className='relative'
                >
                  <AnimatePresence mode='wait'>
                    {formStep === 1 && (
                      <motion.div
                        key='step1'
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className='space-y-5 max-w-md mx-auto'
                      >
                        <InputGroup
                          label='Nombre Propietario / Admin'
                          icon={<User size={18} />}
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
                          label='WhatsApp (Para activar el regalo)'
                          type='tel'
                          icon={<Smartphone size={18} />}
                          placeholder='300 123 4567'
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                        />

                        <div className='bg-amber-50 p-3 rounded-lg border border-amber-100 flex gap-3 items-start mt-2'>
                          <Star
                            className='text-amber-500 shrink-0 mt-0.5'
                            size={16}
                          />
                          <p className='text-xs text-amber-800 leading-tight'>
                            Al dar clic, reservas uno de los{' '}
                            <strong>{spotsLeft} cupos disponibles</strong> en{' '}
                            {cityName} con el beneficio de 1 mes gratis.
                          </p>
                        </div>

                        <button
                          onClick={handleNextStep}
                          className='w-full py-4 mt-2 rounded-xl font-bold text-lg bg-[#010512] text-white flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-xl shadow-slate-900/10'
                        >
                          Verificar Disponibilidad <ChevronRight size={20} />
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
                        <div className='grid md:grid-cols-2 gap-4'>
                          <InputGroup
                            label='Nombre del Hotel'
                            icon={<Building2 size={16} />}
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
                            label='Habitaciones'
                            type='number'
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
                              Gestión Actual
                            </label>
                            <div className='relative'>
                              <select
                                className='w-full p-4 bg-slate-50 border border-slate-300 rounded-xl outline-none text-sm appearance-none font-medium'
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
                                <option value='Software'>Otro Software</option>
                              </select>
                              <div className='absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500'>
                                ▼
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* HONEYPOT */}
                        <div className='opacity-0 absolute -z-10 h-0 w-0'>
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

                        <div className='flex gap-3 pt-4'>
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
                            className='flex-1 py-4 rounded-xl font-bold text-lg bg-[#010512] text-white flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-cyan-500/20 transition-all relative overflow-hidden'
                          >
                            {loading ? (
                              <Clock className='animate-spin' />
                            ) : (
                              <>
                                <span className='relative z-10'>
                                  Activar Mes Gratis
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
          <p className='text-center text-xs text-slate-400 mt-6 mb-12'>
            Sus datos viajan encriptados. Garantía de privacidad.
          </p>
        </section>
      </main>
      <SalesAgent />
    </div>
  );
};

// Componente Auxiliar InputGroup
const InputGroup = ({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  icon,
}) => {
  const [focused, setFocused] = useState(false);
  const inputId = useId();

  return (
    <div className='space-y-1.5'>
      <label
        htmlFor={inputId}
        className={`text-[11px] font-bold uppercase tracking-widest ml-1 transition-colors ${
          focused ? 'text-cyan-700' : 'text-slate-600'
        }`}
      >
        {label}
      </label>
      <div className='relative group'>
        <input
          id={inputId}
          type={type}
          required
          placeholder={placeholder}
          className={`w-full p-4 pl-4 bg-slate-50 border rounded-xl outline-none transition-all duration-200 font-medium text-slate-900 placeholder:text-slate-300 ${
            focused
              ? 'bg-white border-cyan-500 ring-4 ring-cyan-500/10'
              : 'border-slate-200 hover:border-slate-300'
          }`}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <div
          className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
            focused ? 'text-cyan-600' : 'text-slate-400'
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
