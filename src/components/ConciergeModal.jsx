import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Send, Loader2, CheckCircle } from 'lucide-react';

// Si ya tienes la configuración de Supabase, descomenta e importa aquí:
// import { supabase } from '../supabase/client';

const ConciergeModal = ({ isOpen, onClose, asset }) => {
  const [name, setName] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success'

  if (!isOpen || !asset) return null;

  const handleConnect = async () => {
    if (!name.trim()) return;

    setStatus('loading');

    // --- 1. AQUÍ IRÍA TU LÓGICA DE SUPABASE (Opcional por ahora) ---
    // const { error } = await supabase.from('bookings').insert({ ... })
    // Por ahora simulamos la creación de la reserva con un timeout:

    setTimeout(() => {
      setStatus('success');

      // --- 2. CONFIGURACIÓN CRÍTICA DE WHATSAPP ---
      // TU NÚMERO REAL: 57 + 3213795015 (Sin espacios, sin el más)
      const phoneNumber = '573213795015';

      // MENSAJE DE ALTA INGENIERÍA SOCIAL (Protocolo White Glove)
      const message = `Hola LeyvaPass.
      
Deseo confirmar mi acceso exclusivo al ecosistema.
      
👤 *Solicitante:* ${name}
🏰 *Interés:* ${asset.title} (Ref: ${asset.id})
💎 *Valor de Depósito:* $${asset.priceStartingAt}
      
Quedo atento al link de pago seguro para desbloquear las coordenadas.`;

      // Codificación segura para URL (evita errores de espacios y tildes)
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
        message
      )}`;

      // --- 3. REDIRECCIÓN Y CIERRE ---
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
        onClose();
        setStatus('idle');
        setName('');
      }, 1500); // 1.5 segundos para que el usuario vea el check de éxito
    }, 2000); // 2 segundos de "Conectando..." para generar expectativa
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          {/* BACKDROP CON BLUR */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className='absolute inset-0 bg-black/90 backdrop-blur-sm cursor-pointer'
          />

          {/* MODAL CARD DE LUJO */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className='relative w-full max-w-md bg-[#0a0a0a] border border-[#D4AF37]/30 rounded-sm overflow-hidden shadow-2xl shadow-[#D4AF37]/10'
          >
            {/* Barra de Progreso Dorada */}
            {status === 'loading' && (
              <motion.div
                className='absolute top-0 left-0 h-1 bg-[#D4AF37] z-10'
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2 }}
              />
            )}

            {/* Header */}
            <div className='p-8 pb-4 flex justify-between items-start'>
              <div>
                <span className='text-[9px] tracking-[0.3em] uppercase text-[#D4AF37] flex items-center gap-2 mb-2'>
                  <ShieldCheck size={12} />
                  {status === 'success'
                    ? 'Connection Established'
                    : 'Secure Connection'}
                </span>
                <h3 className='font-serif text-2xl text-white italic'>
                  Concierge Access
                </h3>
              </div>
              <button
                onClick={onClose}
                className='text-gray-500 hover:text-white transition-colors'
              >
                <X size={20} />
              </button>
            </div>

            {/* Contenido Dinámico */}
            <div className='px-8 py-4'>
              {status === 'success' ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className='text-center py-8'
                >
                  <CheckCircle
                    size={48}
                    className='text-[#D4AF37] mx-auto mb-4'
                  />
                  <p className='text-white font-serif text-xl italic mb-2'>
                    Solicitud Encriptada
                  </p>
                  <p className='text-gray-400 text-xs tracking-widest uppercase'>
                    Abriendo canal seguro en WhatsApp...
                  </p>
                </motion.div>
              ) : (
                <>
                  <p className='text-gray-400 text-sm leading-relaxed mb-6 font-light'>
                    Estás solicitando acceso a información clasificada de{' '}
                    <span className='text-white font-serif italic'>
                      "{asset.title}"
                    </span>
                    .
                    <br />
                    <br />
                    Para proteger la exclusividad del sitio, la ubicación exacta
                    solo se revela tras la verificación del Concierge.
                  </p>

                  <div className='space-y-4'>
                    <div className='group'>
                      <label className='block text-[9px] uppercase tracking-widest text-gray-500 mb-1 group-focus-within:text-[#D4AF37] transition-colors'>
                        Nombre para el Registro
                      </label>
                      <input
                        type='text'
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder='ej. Alejandro Leyva'
                        className='w-full bg-white/5 border-b border-white/10 p-2 text-white outline-none focus:border-[#D4AF37] transition-colors placeholder:text-gray-700 font-serif'
                        autoFocus
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer de Acción */}
            {status !== 'success' && (
              <div className='p-8 pt-4 flex justify-end'>
                <button
                  onClick={handleConnect}
                  disabled={!name.trim() || status === 'loading'}
                  className='flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-3 text-[10px] tracking-[0.2em] uppercase font-bold hover:bg-[#b5952f] transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {status === 'loading' ? (
                    <>
                      <span>Connecting</span>
                      <Loader2
                        size={12}
                        className='animate-spin'
                      />
                    </>
                  ) : (
                    <>
                      <span>Initialize Chat</span>
                      <Send size={12} />
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConciergeModal;
