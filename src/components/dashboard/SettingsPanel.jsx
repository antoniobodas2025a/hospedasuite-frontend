import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { motion } from 'framer-motion';
import {
  Settings,
  Lock,
  Save,
  Phone,
  QrCode,
  Printer,
  Globe,
  MapPin,
  Percent,
  Copy,
  ExternalLink,
  Instagram,
  Zap,
} from 'lucide-react';

const SettingsPanel = ({ hotelInfo, setHotelInfo }) => {
  const [activeSection, setActiveSection] = useState('general');
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const [configForm, setConfigForm] = useState({
    name: '',
    color: '#8C3A3A',
    location: '',
    tax_rate: 0,
    phone: '',
    wompi_public_key: '',
    wompi_integrity_secret: '',
  });

  useEffect(() => {
    if (hotelInfo) {
      setConfigForm({
        name: hotelInfo.name || '',
        color: hotelInfo.primary_color || '#8C3A3A',
        location: hotelInfo.location || '',
        tax_rate: parseFloat(hotelInfo.tax_rate) || 0,
        phone: hotelInfo.phone || '',
        wompi_public_key: hotelInfo.wompi_public_key || '',
        wompi_integrity_secret: hotelInfo.wompi_integrity_secret || '',
      });
    }
  }, [hotelInfo]);

  // 🔥 GENERACIÓN DE ENLACES INTELIGENTES
  const baseUrl = hotelInfo?.id
    ? `${window.location.origin}/book/${hotelInfo.id}`
    : '#';

  // 1. Link para Instagram/WhatsApp del Hotel (0% Comisión)
  const directLink = `${baseUrl}?origen=direct`;

  // 2. Link para la OTA (10% Comisión - Uso interno o afiliados)
  const otaLink = `${baseUrl}?origen=hospedasuite`;

  const handleUpdateConfig = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('hotels')
        .update({
          name: configForm.name,
          primary_color: configForm.color,
          location: configForm.location,
          tax_rate: configForm.tax_rate,
          phone: configForm.phone,
          wompi_public_key: configForm.wompi_public_key,
          wompi_integrity_secret: configForm.wompi_integrity_secret,
        })
        .eq('id', hotelInfo.id);

      if (error) throw error;

      setHotelInfo({
        ...hotelInfo,
        ...configForm,
        primary_color: configForm.color,
      });
      alert('✅ Configuración guardada correctamente');
    } catch (error) {
      alert('Error guardando: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      return alert('La contraseña debe tener al menos 6 caracteres.');
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      alert('Error: ' + error.message);
    } else {
      alert('✅ ¡Contraseña actualizada con éxito!');
      setNewPassword('');
    }
    setLoading(false);
  };

  const sections = [
    { id: 'general', title: 'General', icon: Settings, color: 'bg-slate-500' },
    { id: 'web', title: 'Web & QR', icon: Globe, color: 'bg-blue-500' },
    { id: 'security', title: 'Seguridad', icon: Lock, color: 'bg-red-500' },
  ];

  return (
    <div className='h-full flex flex-col md:flex-row gap-6 p-6 overflow-hidden text-slate-800'>
      <div className='w-full md:w-64 flex-none space-y-2'>
        <h2 className='text-2xl font-serif font-bold text-slate-800 mb-6 px-2'>
          Ajustes
        </h2>
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group
              ${
                activeSection === section.id
                  ? 'bg-white shadow-sm ring-1 ring-slate-200'
                  : 'hover:bg-white/60'
              }`}
          >
            <div
              className={`w-8 h-8 ${section.color} rounded-lg flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110`}
            >
              <section.icon size={16} />
            </div>
            <span
              className={`font-medium ${
                activeSection === section.id
                  ? 'text-slate-900'
                  : 'text-slate-600'
              }`}
            >
              {section.title}
            </span>
          </button>
        ))}
      </div>

      <div className='flex-1 bg-white/50 backdrop-blur-xl rounded-[2.5rem] border border-white/60 shadow-sm p-8 overflow-y-auto relative'>
        {activeSection === 'general' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className='max-w-3xl'
          >
            <h3 className='text-2xl font-bold text-slate-800 mb-6'>
              Información del Hotel
            </h3>
            <form
              onSubmit={handleUpdateConfig}
              className='space-y-6'
            >
              <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                <div className='md:col-span-2 space-y-2'>
                  <label className='text-xs font-bold text-slate-500 uppercase tracking-wider ml-1'>
                    Nombre del Hotel
                  </label>
                  <input
                    type='text'
                    className='w-full p-4 bg-white/80 border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-slate-900/10 font-medium transition-all'
                    value={configForm.name}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, name: e.target.value })
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <label className='text-xs font-bold text-slate-500 uppercase tracking-wider ml-1'>
                    Color Marca
                  </label>
                  <div className='flex items-center gap-3 bg-white/80 p-2 rounded-2xl shadow-sm h-[58px]'>
                    <input
                      type='color'
                      className='w-10 h-10 rounded-xl cursor-pointer border-none bg-transparent'
                      value={configForm.color}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, color: e.target.value })
                      }
                    />
                    <span className='font-mono text-xs text-slate-600'>
                      {configForm.color}
                    </span>
                  </div>
                </div>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='space-y-2 relative'>
                  <label className='text-xs font-bold text-slate-500 uppercase tracking-wider ml-1'>
                    Ubicación
                  </label>
                  <div className='relative'>
                    <MapPin
                      className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400'
                      size={18}
                    />
                    <input
                      type='text'
                      className='w-full p-4 pl-12 bg-white/80 border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-slate-900/10 font-medium'
                      placeholder='Ciudad, País'
                      value={configForm.location}
                      onChange={(e) =>
                        setConfigForm({
                          ...configForm,
                          location: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className='space-y-2'>
                  <label className='text-xs font-bold text-slate-500 uppercase tracking-wider ml-1'>
                    WhatsApp
                  </label>
                  <div className='relative'>
                    <Phone
                      className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400'
                      size={18}
                    />
                    <input
                      type='text'
                      className='w-full p-4 pl-12 bg-white/80 border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-slate-900/10 font-medium'
                      placeholder='57300...'
                      value={configForm.phone}
                      onChange={(e) =>
                        setConfigForm({ ...configForm, phone: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className='space-y-2 w-full md:w-1/3'>
                <label className='text-xs font-bold text-slate-500 uppercase tracking-wider ml-1'>
                  Impuesto (%)
                </label>
                <div className='relative'>
                  <Percent
                    className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400'
                    size={18}
                  />
                  <input
                    type='number'
                    className='w-full p-4 pl-12 bg-white/80 border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-slate-900/10 font-medium'
                    placeholder='0'
                    value={configForm.tax_rate}
                    onChange={(e) =>
                      setConfigForm({
                        ...configForm,
                        tax_rate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className='col-span-full mt-8 bg-purple-50 p-6 rounded-[2rem] border border-purple-100 relative overflow-hidden'>
                <div className='absolute top-0 right-0 w-32 h-32 bg-purple-200/50 rounded-full blur-3xl -z-0'></div>
                <div className='relative z-10'>
                  <h4 className='text-lg font-bold text-purple-900 mb-4 flex items-center gap-2'>
                    <div className='p-2 bg-white rounded-lg shadow-sm'>💳</div>
                    Pasarela de Pagos (Wompi Bancolombia)
                  </h4>
                  <p className='text-sm text-purple-800/70 mb-6 max-w-2xl'>
                    Ingresa las llaves de producción de tu cuenta Wompi. Esto
                    permitirá que el dinero de las reservas llegue directamente
                    a tu cuenta bancaria.
                  </p>

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    <div className='space-y-2'>
                      <label className='text-xs font-bold text-purple-900/60 uppercase tracking-wider ml-1'>
                        Llave Pública (Public Key)
                      </label>
                      <input
                        type='text'
                        placeholder='pub_prod_...'
                        className='w-full p-4 bg-white border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-purple-500/20 font-mono text-sm'
                        value={configForm.wompi_public_key || ''}
                        onChange={(e) =>
                          setConfigForm({
                            ...configForm,
                            wompi_public_key: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className='space-y-2'>
                      <label className='text-xs font-bold text-purple-900/60 uppercase tracking-wider ml-1'>
                        Secreto de Integridad
                      </label>
                      <div className='relative'>
                        <Lock
                          className='absolute left-4 top-1/2 -translate-y-1/2 text-purple-300'
                          size={16}
                        />
                        <input
                          type='password'
                          placeholder='prod_integrity_...'
                          className='w-full p-4 pl-12 bg-white border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-purple-500/20 font-mono text-sm'
                          value={configForm.wompi_integrity_secret || ''}
                          onChange={(e) =>
                            setConfigForm({
                              ...configForm,
                              wompi_integrity_secret: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className='fixed bottom-10 right-10 bg-slate-900 text-white p-4 rounded-full shadow-2xl shadow-slate-900/40 flex items-center gap-2 pr-6 z-50'
              >
                {loading ? (
                  <span className='animate-spin'>⌛</span>
                ) : (
                  <Save size={20} />
                )}
                <span className='font-bold'>Guardar Cambios</span>
              </motion.button>
            </form>
          </motion.div>
        )}

        {/* --- SECCIÓN WEB & QR ACTUALIZADA CON DOBLE LINK --- */}
        {activeSection === 'web' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className='max-w-3xl space-y-8'
          >
            <h3 className='text-2xl font-bold text-slate-800'>
              Tus Enlaces de Reserva
            </h3>

            {/* 1. LINK HOTEL (DIRECTO - 0% COMISIÓN) */}
            <div className='bg-emerald-50/80 border border-emerald-200 p-6 rounded-[2rem] relative overflow-hidden'>
              <div className='absolute -right-10 -top-10 w-40 h-40 bg-emerald-200/30 rounded-full blur-3xl'></div>
              <p className='text-sm text-emerald-800 mb-1 font-bold flex items-center gap-2'>
                <Instagram size={18} /> Link Directo (Instagram / WhatsApp)
              </p>
              <p className='text-xs text-emerald-700/70 mb-4'>
                Usa este enlace en tu perfil. Las reservas que entren por aquí
                tendrán <strong>0% de comisión</strong> para HospedaSuite.
              </p>
              <div className='flex flex-col md:flex-row gap-3 relative z-10'>
                <input
                  readOnly
                  className='flex-1 p-4 bg-white rounded-2xl text-xs font-mono text-slate-600 border border-emerald-100 select-all shadow-sm'
                  value={directLink}
                />
                <div className='flex gap-2'>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(directLink);
                      alert('¡Link directo copiado! Listo para Instagram.');
                    }}
                    className='bg-emerald-600 text-white font-bold px-4 py-3 rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-500/30 flex items-center gap-2 text-sm'
                  >
                    <Copy size={16} /> Copiar
                  </button>
                  <button
                    onClick={() => window.open(directLink, '_blank')}
                    className='bg-white text-emerald-600 font-bold px-3 py-3 rounded-2xl border border-emerald-200 hover:bg-emerald-50'
                  >
                    <ExternalLink size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* 2. LINK OTA (PLATAFORMA - 10% COMISIÓN) */}
            <div className='bg-blue-50/80 border border-blue-200 p-6 rounded-[2rem] opacity-75 hover:opacity-100 transition-opacity'>
              <p className='text-sm text-blue-800 mb-1 font-bold flex items-center gap-2'>
                <Zap size={18} /> Link Plataforma (OTA)
              </p>
              <p className='text-xs text-blue-700/70 mb-4'>
                Este es el enlace que usa HospedaSuite para traerte clientes
                nuevos. Tiene <strong>10% de comisión</strong>.
              </p>
              <div className='flex flex-col md:flex-row gap-3'>
                <input
                  readOnly
                  className='flex-1 p-4 bg-white rounded-2xl text-xs font-mono text-slate-600 border border-blue-100 select-all shadow-sm'
                  value={otaLink}
                />
                <div className='flex gap-2'>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(otaLink);
                      alert('Link OTA copiado.');
                    }}
                    className='bg-blue-100 text-blue-600 font-bold px-4 py-3 rounded-2xl hover:bg-blue-200 flex items-center gap-2 text-sm'
                  >
                    <Copy size={16} /> Copiar
                  </button>
                </div>
              </div>
            </div>

            {/* Tarjeta QR (Genera el Directo por defecto) */}
            <div>
              <h4 className='font-bold text-lg mb-4 flex items-center gap-2 text-slate-700'>
                <QrCode
                  size={20}
                  className='text-slate-400'
                />{' '}
                Código QR (Enlace Directo)
              </h4>
              <div className='flex flex-col md:flex-row items-center gap-8 bg-white/60 p-8 rounded-[2rem] border border-white/60 shadow-sm'>
                <div className='bg-white p-3 rounded-2xl shadow-inner border border-slate-100'>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                      directLink,
                    )}`}
                    alt='QR Menú'
                    className='rounded-xl mix-blend-multiply w-40 h-40'
                  />
                </div>
                <div className='flex-1 text-center md:text-left'>
                  <p className='text-slate-500 mb-6 leading-relaxed'>
                    Este código lleva a tu <strong>Enlace Directo</strong> (0%
                    comisión). Imprímelo para la recepción.
                  </p>
                  <a
                    href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
                      directLink,
                    )}`}
                    target='_blank'
                    download
                    className='inline-flex items-center gap-2 text-slate-700 font-bold bg-white border border-slate-200 px-6 py-3 rounded-2xl hover:bg-slate-50 transition-colors shadow-sm'
                  >
                    <Printer size={18} /> Descargar Alta Calidad
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* SECCIÓN: SEGURIDAD */}
        {activeSection === 'security' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className='max-w-xl'
          >
            <h3 className='text-2xl font-bold text-slate-800 mb-6'>
              Seguridad de la Cuenta
            </h3>

            <div className='bg-red-50/80 border border-red-100 p-8 rounded-[2rem]'>
              <div className='flex items-center gap-3 mb-6 text-red-800'>
                <div className='p-2 bg-red-100 rounded-lg'>
                  <Lock size={20} />
                </div>
                <span className='font-bold'>Cambiar Contraseña</span>
              </div>

              <form
                onSubmit={handleUpdatePassword}
                className='space-y-4'
              >
                <div>
                  <label className='block text-xs font-bold text-red-900/50 uppercase tracking-widest mb-2'>
                    Nueva Contraseña
                  </label>
                  <input
                    type='password'
                    placeholder='Mínimo 6 caracteres'
                    className='w-full p-4 bg-white rounded-2xl border border-red-100 outline-none focus:ring-2 focus:ring-red-500/20 shadow-sm'
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <button
                  type='submit'
                  disabled={loading}
                  className='w-full bg-red-600 text-white font-bold px-6 py-4 rounded-2xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20 flex justify-center items-center gap-2'
                >
                  {loading ? 'Actualizando...' : 'Actualizar Clave'}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SettingsPanel;
