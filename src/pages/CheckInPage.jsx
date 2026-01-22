import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import SignatureCanvas from 'react-signature-canvas';
import {
  User,
  Check,
  Hotel,
  AlertCircle,
  Eraser,
  Calendar,
  Fingerprint,
} from 'lucide-react';

const CheckInPage = () => {
  const navigate = useNavigate();
  const sigPad = useRef({});

  // --- MAGIA ANTI-PARPADEO ---
  const [hotel, setHotel] = useState(() => {
    const saved = localStorage.getItem('hotel_branding');
    return saved ? JSON.parse(saved) : null;
  });

  const [loading, setLoading] = useState(false);
  // --- INSERCIÓN: Lógica Blindada (Token de Reserva) ---
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('booking'); // Captura ?booking=UUID
  const [bookingData, setBookingData] = useState(null);

  useEffect(() => {
    const validateBooking = async () => {
      if (!bookingId) return;

      // Buscamos la reserva y el huésped asociado
      const { data, error } = await supabase
        .from('bookings')
        .select('*, guests(*)')
        .eq('id', bookingId)
        .single();

      if (data && !error) {
        setBookingData(data);
        // Pre-llenamos el formulario con los datos que ya tenemos (del momento de la reserva)
        setFormData((prev) => ({
          ...prev,
          fullName: data.guests?.full_name || prev.fullName,
          docNumber: data.guests?.doc_number || prev.docNumber,
          email: data.guests?.email || prev.email,
          phone: data.guests?.phone || prev.phone,
        }));
      } else {
        alert('Enlace de Check-in inválido o expirado.');
        navigate('/');
      }
    };
    validateBooking();
  }, [bookingId]);
  // -----------------------------------------------------
  // 1. ACTUALIZACIÓN: Nuevos campos obligatorios para SIRE/TRA
  const [formData, setFormData] = useState({
    fullName: '',
    docNumber: '',
    email: '',
    phone: '',
    nationality: 'COL',
    gender: 'M', // Nuevo: Obligatorio para SIRE
    birthDate: '', // Nuevo: Obligatorio para calcular edad/SIRE
    habeasData: false,
  });

  // CARGAR DATOS
  useEffect(() => {
    const fetchHotel = async () => {
      try {
        const { data } = await supabase
          .from('hotels')
          .select('*')
          .limit(1)
          .single();
        if (data) {
          setHotel(data);
          localStorage.setItem('hotel_branding', JSON.stringify(data));
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };
    fetchHotel();
  }, []);

  const clearSig = () => sigPad.current.clear();

  const handleCheckIn = async (e) => {
    e.preventDefault();

    // 🔥 CORRECCIÓN CRÍTICA AQUÍ 🔥
    // Definimos hotelId basándonos en el hotel cargado en estado.
    const hotelId = hotel?.id;

    if (!hotelId) {
      return alert(
        '⚠️ Error: No se ha detectado el hotel. Por favor recarga la página.',
      );
    }
    // ----------------------------

    // 1. Validaciones de Seguridad (Blindaje Legal)
    if (sigPad.current.isEmpty()) return alert('Por favor firma el registro.');
    if (!formData.habeasData)
      return alert('Debes aceptar la política de datos.');
    if (!formData.birthDate)
      return alert('La fecha de nacimiento es obligatoria.');

    setLoading(true);

    try {
      // --- INICIO DE CÓDIGO NUEVO (BLINDAJE FORENSE) ---
      // 0. CAPTURA DE IDENTIDAD DIGITAL (Para Plan NANO/GROWTH)
      let forensicIP = '0.0.0.0';
      try {
        // Intentamos obtener la IP pública del dispositivo del huésped
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        forensicIP = ipData.ip;
      } catch (e) {
        console.error('Error capturando IP (Usando fallback):', e);
      }

      // Capturamos la "Huella Digital" del dispositivo y la hora exacta
      const forensicUA = navigator.userAgent;
      const forensicTime = new Date().toISOString();
      // --- FIN DE CÓDIGO NUEVO ---

      // 1. Procesar la Firma (Convertir dibujo a imagen base64)
      const signatureData = sigPad.current.toDataURL();

      // 2. Guardar Huésped con Datos Forenses
      // Nota: Esto asume que tienes las columnas 'consent_*' en tu tabla 'guests'
      const { data: guest, error: guestError } = await supabase
        .from('guests')
        .insert([
          {
            // Datos Personales
            full_name: formData.fullName,
            doc_number: formData.docNumber,
            nationality: formData.nationality,
            phone: formData.phone,
            email: formData.email,
            birth_date: formData.birthDate, // Vital para el SIRE

            // Datos Legales y Forenses (El Blindaje)
            signature_url: signatureData, // Guardamos la firma
            consent_ip: forensicIP, // IP desde donde firmó
            consent_user_agent: forensicUA, // Celular/PC usado
            consent_timestamp: forensicTime, // Hora legal de firma

            // Relación
            hotel_id: hotelId, // ✅ AHORA SÍ EXISTE LA VARIABLE
          },
        ])
        .select()
        .single();

      if (guestError) throw guestError;

      // 3. Crear la Reserva (Booking)
      const { error: bookingError } = await supabase.from('bookings').insert([
        {
          hotel_id: hotelId, // ✅ AHORA SÍ EXISTE LA VARIABLE
          guest_id: guest.id,
          check_in: new Date(), // Asumimos hoy si no hay fechas
          check_out: new Date(Date.now() + 86400000), // Mañana por defecto
          status: 'confirmed', // Entra confirmado directamente
          total_price: 0, // Se ajustará en recepción
          source: 'web_checkin',
        },
      ]);

      if (bookingError) throw bookingError;

      // Éxito
      alert(
        '✅ ¡Check-in Realizado con Éxito! Tu registro legal está completo.',
      );
      // Opcional: Redirigir o limpiar formulario
    } catch (error) {
      console.error(error);
      alert('Error en el proceso: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ESTILOS
  const brandColor = hotel?.primary_color || '#2563eb';
  const buttonStyle = { backgroundColor: brandColor };
  const textBrandStyle = { color: brandColor };

  return (
    <div className='min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans'>
      <div className='max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100'>
        {/* HEADER */}
        <div className='p-8 text-center bg-white border-b border-slate-100 relative overflow-hidden'>
          <div
            className='absolute top-0 left-0 w-full h-2'
            style={buttonStyle}
          ></div>
          <div className='flex justify-center mb-4'>
            {hotel?.logo_url ? (
              <img
                src={hotel.logo_url}
                alt='Logo'
                className='h-20 w-20 object-cover rounded-2xl shadow-sm bg-slate-50'
              />
            ) : (
              <div
                className='w-16 h-16 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg'
                style={buttonStyle}
              >
                <Hotel />
              </div>
            )}
          </div>
          <h1 className='text-2xl font-black text-slate-800 tracking-tight'>
            {hotel?.name || 'Cargando...'}
          </h1>
          <p className='text-slate-400 text-sm mt-1 font-medium'>
            Registro Digital de Huéspedes
          </p>
        </div>

        {/* FORMULARIO */}
        <form
          onSubmit={handleCheckIn}
          className='p-8 space-y-5'
        >
          {/* BLOQUE 1: DATOS BÁSICOS */}
          <div>
            <label className='text-xs font-bold text-slate-400 uppercase ml-1'>
              Nombre Completo
            </label>
            <div className='relative mt-1'>
              <User
                className='absolute left-3 top-3.5 text-slate-400'
                size={18}
              />
              <input
                type='text'
                required
                placeholder='Tal cual aparece en tu Cédula/Pasaporte'
                className='w-full pl-10 p-3 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100'
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
              />
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='text-xs font-bold text-slate-400 uppercase ml-1'>
                Documento
              </label>
              <div className='relative mt-1'>
                <Fingerprint
                  className='absolute left-3 top-3.5 text-slate-400'
                  size={18}
                />
                <input
                  type='text'
                  required
                  className='w-full pl-10 p-3 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100'
                  value={formData.docNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, docNumber: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <label className='text-xs font-bold text-slate-400 uppercase ml-1'>
                País
              </label>
              <select
                className='w-full mt-1 p-3 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-700 outline-none'
                value={formData.nationality}
                onChange={(e) =>
                  setFormData({ ...formData, nationality: e.target.value })
                }
              >
                <option value='COL'>Colombia</option>
                <option value='USA'>USA</option>
                <option value='ESP'>España</option>
                <option value='MEX'>México</option>
                <option value='ARG'>Argentina</option>
                <option value='DEU'>Alemania</option>
                <option value='FRA'>Francia</option>
              </select>
            </div>
          </div>

          {/* BLOQUE 2: DATOS SIRE (MIGRACIÓN) */}
          <div className='bg-slate-50 p-4 rounded-xl border border-slate-100'>
            <h3 className='text-xs font-black text-slate-400 uppercase mb-3 flex items-center gap-1'>
              Requerido por Ley (SIRE)
            </h3>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='text-[10px] font-bold text-slate-400 uppercase'>
                  Fecha Nacimiento
                </label>
                <div className='relative mt-1'>
                  <input
                    type='date'
                    required
                    className='w-full p-2 bg-white border-slate-200 rounded-lg font-bold text-slate-700 text-sm outline-none'
                    value={formData.birthDate}
                    onChange={(e) =>
                      setFormData({ ...formData, birthDate: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className='text-[10px] font-bold text-slate-400 uppercase'>
                  Género Biológico
                </label>
                <select
                  className='w-full mt-1 p-2 bg-white border-slate-200 rounded-lg font-bold text-slate-700 text-sm outline-none'
                  value={formData.gender}
                  onChange={(e) =>
                    setFormData({ ...formData, gender: e.target.value })
                  }
                >
                  <option value='M'>Masculino</option>
                  <option value='F'>Femenino</option>
                  <option value='X'>Otro / X</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className='text-xs font-bold text-slate-400 uppercase ml-1'>
              Email (Para Factura)
            </label>
            <input
              type='email'
              className='w-full mt-1 p-3 bg-slate-50 border-slate-200 rounded-xl font-medium text-slate-700 outline-none'
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          {/* FIRMA */}
          <div>
            <div className='flex justify-between items-end mb-2'>
              <label className='text-xs font-bold text-slate-400 uppercase ml-1'>
                Firma Digital
              </label>
              <button
                type='button'
                onClick={clearSig}
                className='text-[10px] text-red-400 font-bold bg-red-50 px-2 py-1 rounded flex items-center gap-1'
              >
                <Eraser size={10} /> Borrar
              </button>
            </div>
            <div className='border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 overflow-hidden relative'>
              <SignatureCanvas
                ref={sigPad}
                penColor='black'
                canvasProps={{ className: 'w-full h-40' }}
              />
              <div className='absolute bottom-2 w-full text-center text-[10px] text-slate-300 pointer-events-none'>
                Firma con tu dedo aquí
              </div>
            </div>
          </div>

          {/* HABEAS DATA DINÁMICO */}
          <div className='bg-slate-50 p-4 rounded-xl border border-slate-200'>
            <label className='flex items-start gap-3 cursor-pointer'>
              <div className='pt-0.5'>
                <input
                  type='checkbox'
                  required
                  className='peer sr-only'
                  checked={formData.habeasData}
                  onChange={(e) =>
                    setFormData({ ...formData, habeasData: e.target.checked })
                  }
                />
                <div
                  className={`w-5 h-5 border-2 rounded-md flex items-center justify-center transition-colors ${
                    formData.habeasData
                      ? 'border-transparent text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                  style={formData.habeasData ? buttonStyle : {}}
                >
                  {formData.habeasData && (
                    <Check
                      size={14}
                      strokeWidth={4}
                    />
                  )}
                </div>
              </div>
              <div className='text-xs text-slate-500 leading-snug'>
                <span className='font-bold text-slate-700 block mb-1'>
                  Autorización Legal
                </span>
                {/* 🛡️ BLINDAJE DINÁMICO: 
      1. Intenta mostrar el nombre de la base de datos (hotel.name).
      2. Si no ha cargado, busca en el localStorage (branding guardado).
      3. Como último recurso, usa un término legal genérico.
  */}
                Ley 1581: Autorizo a{' '}
                <span
                  className='font-black uppercase'
                  style={textBrandStyle}
                >
                  {hotel?.name ||
                    JSON.parse(localStorage.getItem('hotel_branding'))?.name ||
                    'EL ESTABLECIMIENTO'}
                </span>{' '}
                para el tratamiento de mis datos y reporte a autoridades.
              </div>
            </label>
          </div>

          <button
            type='submit'
            disabled={loading}
            className='w-full py-4 rounded-xl text-white font-bold text-lg shadow-xl hover:shadow-2xl transition-all active:scale-95 flex justify-center items-center gap-2'
            style={buttonStyle}
          >
            {loading ? (
              'Guardando...'
            ) : (
              <>
                <Check
                  size={20}
                  strokeWidth={3}
                />{' '}
                Completar Check-in
              </>
            )}
          </button>
        </form>
        <div className='bg-slate-50 p-4 text-center border-t border-slate-100'>
          <p className='text-[10px] text-slate-400 flex items-center justify-center gap-1'>
            <AlertCircle size={10} /> Sus datos están protegidos por SSL.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckInPage;
