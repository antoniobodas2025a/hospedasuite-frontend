import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Lock,
  Save,
  Phone,
  QrCode,
  Printer,
  Globe,
  Palette,
  MapPin,
  Percent,
  Copy,
  ExternalLink,
} from 'lucide-react';

const SettingsPanel = ({ hotelInfo, setHotelInfo }) => {
  // --- ESTADOS Y LÓGICA ORIGINAL (Preservada) ---
  const [activeSection, setActiveSection] = useState('general');
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const [configForm, setConfigForm] = useState({
    name: '',
    color: '#8C3A3A',
    location: '',
    tax_rate: 0,
    phone: '',
  });

  // Sincronizar formulario
  useEffect(() => {
    if (hotelInfo) {
      setConfigForm({
        name: hotelInfo.name || '',
        color: hotelInfo.primary_color || '#8C3A3A',
        location: hotelInfo.location || '',
        tax_rate: parseFloat(hotelInfo.tax_rate) || 0,
        phone: hotelInfo.phone || '',
      });
    }
  }, [hotelInfo]);

  const menuLink = hotelInfo?.id
    ? `${window.location.origin}/book/${hotelInfo.id}`
    : '#';

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

  // --- CONFIGURACIÓN DEL MENÚ LATERAL ---
  const sections = [
    { id: 'general', title: 'General', icon: Settings, color: 'bg-slate-500' },
    { id: 'web', title: 'Web & QR', icon: Globe, color: 'bg-blue-500' },
    { id: 'security', title: 'Seguridad', icon: Lock, color: 'bg-red-500' },
  ];

  return (
    <div className='h-full flex flex-col md:flex-row gap-6 p-6 overflow-hidden text-slate-800'>
      {/* 1. SIDEBAR DE AJUSTES (Estilo macOS) */}
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

      {/* 2. PANEL DE CONTENIDO (Tarjetas Glassmorphism) */}
      <div className='flex-1 bg-white/50 backdrop-blur-xl rounded-[2.5rem] border border-white/60 shadow-sm p-8 overflow-y-auto relative'>
        {/* SECCIÓN: GENERAL */}
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
              {/* Nombre y Color */}
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

              {/* Ubicación y Teléfono */}
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

              {/* Impuesto */}
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
                      setConfigForm({ ...configForm, tax_rate: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Botón Guardar Flotante */}
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

        {/* SECCIÓN: WEB & QR */}
        {activeSection === 'web' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className='max-w-3xl space-y-8'
          >
            <h3 className='text-2xl font-bold text-slate-800'>
              Tu Página de Reservas
            </h3>

            {/* Tarjeta Enlace */}
            <div className='bg-blue-50/80 border border-blue-200 p-6 rounded-[2rem]'>
              <p className='text-sm text-blue-800 mb-3 font-medium flex items-center gap-2'>
                <Globe size={16} /> Enlace público para huéspedes
              </p>
              <div className='flex flex-col md:flex-row gap-3'>
                <input
                  readOnly
                  className='flex-1 p-4 bg-white rounded-2xl text-sm font-mono text-slate-600 border border-blue-100 select-all shadow-sm'
                  value={menuLink}
                />
                <div className='flex gap-2'>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(menuLink);
                      alert('¡Link copiado!');
                    }}
                    className='bg-blue-600 text-white font-bold px-6 py-3 rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 flex items-center gap-2'
                  >
                    <Copy size={18} /> Copiar
                  </button>
                  <button
                    onClick={() => window.open(menuLink, '_blank')}
                    className='bg-white text-blue-600 font-bold px-4 py-3 rounded-2xl border border-blue-200 hover:bg-blue-50 flex items-center gap-2'
                  >
                    <ExternalLink size={18} /> Ver
                  </button>
                </div>
              </div>
            </div>

            {/* Tarjeta QR */}
            <div>
              <h4 className='font-bold text-lg mb-4 flex items-center gap-2 text-slate-700'>
                <QrCode
                  size={20}
                  className='text-slate-400'
                />{' '}
                Código QR para Habitaciones
              </h4>
              <div className='flex flex-col md:flex-row items-center gap-8 bg-white/60 p-8 rounded-[2rem] border border-white/60 shadow-sm'>
                <div className='bg-white p-3 rounded-2xl shadow-inner border border-slate-100'>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                      menuLink
                    )}`}
                    alt='QR Menú'
                    className='rounded-xl mix-blend-multiply w-40 h-40'
                  />
                </div>
                <div className='flex-1 text-center md:text-left'>
                  <p className='text-slate-500 mb-6 leading-relaxed'>
                    Imprime este código y colócalo en la recepción o
                    habitaciones. Tus huéspedes podrán escanearlo para ver el
                    menú y pedir servicios.
                  </p>
                  <a
                    href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
                      menuLink
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
