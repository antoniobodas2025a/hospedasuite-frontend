import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Loader2, MessageCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

// --- CEREBRO: BASE DE CONOCIMIENTO (NO MODIFICAR) ---
const KNOWLEDGE_BASE = `
  DATOS DEL DASHBOARD:
  1. Navegación: Agenda, Inventario, Huéspedes, Marketing, Config.
  2. Agenda: Ver reservas y crear nuevas (+).
  3. SIRE: En "Huéspedes" > botón "Exportar SIRE".
  4. Room Service: Campanita arriba derecha.
  5. Airbnb: En "Inventario" > botón "Sync Airbnb".
`;

const SalesAgent = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hola. Soy HospedaSuite AI. ¿Preguntas sobre el Dashboard?',
    },
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);

  const timerRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- LOGICA DE APERTURA (TRIGGERS) ---
  useEffect(() => {
    const handleScroll = () => {
      if (hasAutoOpened || isOpen) return;
      const scrollPercent =
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) *
        100;
      if (scrollPercent > 50) triggerOpen();
    };

    const resetIdleTimer = () => {
      if (hasAutoOpened || isOpen) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(triggerOpen, 60000); // 1 minuto silencio
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);

    resetIdleTimer();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hasAutoOpened, isOpen]);

  const triggerOpen = () => {
    setIsOpen(true);
    setHasAutoOpened(true);
  };

  // --- ENVÍO BLINDADO (CABALLO DE TROYA) ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg = inputValue;

    // 1. UI: Mostrar mensaje limpio al usuario
    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setInputValue('');
    setIsTyping(true);
    setShowWhatsApp(false);

    try {
      // 2. INGENIERÍA DE PROMPT (TRUCO TÉCNICO)
      // Creamos una versión "sucia" del historial solo para la IA.
      // Le pegamos la instrucción AL FINAL del último mensaje. La IA siempre prioriza lo último que lee.
      const TROJAN_INSTRUCTION = `
        [CONTEXTO: ${KNOWLEDGE_BASE}]
        [INSTRUCCIÓN OBLIGATORIA: Responde en Español. MÁXIMO 30 PALABRAS. Usa lenguaje ultra sencillo y directo. NO des explicaciones largas.]
      `;

      // Clonamos el historial y modificamos el último mensaje
      const payloadHistory = newMessages.map((msg, index) => {
        if (index === newMessages.length - 1) {
          return { role: 'user', content: msg.content + TROJAN_INSTRUCTION };
        }
        return msg;
      });

      const { data, error } = await supabase.functions.invoke(
        'chat-sales-agent',
        {
          body: {
            message: userMsg + TROJAN_INSTRUCTION, // Refuerzo doble
            history: payloadHistory,
          },
        }
      );

      if (error) throw error;

      if (data?.reply) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.reply },
        ]);

        if (data?.intent === 'human_support' || data?.intent === 'purchase') {
          setShowWhatsApp(true);
        }
      } else {
        throw new Error('No reply');
      }
    } catch (err) {
      console.error('AI Error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Conectando cerebro... Intenta de nuevo.',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        onClick={() => setIsOpen(!isOpen)}
        className='fixed bottom-6 right-6 z-50 p-4 rounded-full bg-[#010512] border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3)] text-cyan-400 flex items-center justify-center md:bottom-10 md:right-10'
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className='fixed bottom-24 right-6 w-[90vw] md:w-[380px] h-[500px] z-50 flex flex-col rounded-2xl overflow-hidden border border-cyan-500/30 backdrop-blur-xl shadow-2xl md:bottom-28 md:right-10'
            style={{ backgroundColor: 'rgba(1, 5, 18, 0.95)' }}
          >
            {/* Header */}
            <div className='p-4 bg-gradient-to-r from-[#010512] to-[#0a1530] border-b border-white/10 flex items-center gap-3'>
              <div className='w-2 h-2 rounded-full bg-cyan-500 animate-pulse' />
              <div className='flex flex-col'>
                <span className='font-bold text-slate-200 text-sm tracking-wide'>
                  HospedaSuite AI
                </span>
                <span className='text-[10px] text-slate-400'>
                  Respuestas Rápidas
                </span>
              </div>
            </div>

            {/* Mensajes */}
            <div className='flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-cyan-900 scrollbar-track-transparent'>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] p-3 text-sm rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-cyan-600/20 text-cyan-50 border border-cyan-500/30 rounded-tr-sm'
                        : 'bg-slate-800/80 text-slate-200 border border-slate-700/50 rounded-tl-sm shadow-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className='flex justify-start'>
                  <div className='bg-slate-800/50 p-3 rounded-2xl rounded-tl-sm border border-slate-700/50'>
                    <Loader2
                      size={16}
                      className='animate-spin text-cyan-500'
                    />
                  </div>
                </div>
              )}

              {showWhatsApp && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className='flex justify-center pt-2'
                >
                  <a
                    href='https://wa.me/573213795015'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg'
                  >
                    <MessageCircle size={16} />
                    Ayuda Humana
                  </a>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSendMessage}
              className='p-3 bg-[#010512] border-t border-white/10 flex gap-2'
            >
              <input
                type='text'
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder='Escribe aquí...'
                className='flex-1 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50'
              />
              <button
                type='submit'
                disabled={isTyping || !inputValue.trim()}
                className='p-2 bg-cyan-600/20 hover:bg-cyan-500/30 text-cyan-400 rounded-xl border border-cyan-500/30 disabled:opacity-50'
              >
                <Send size={18} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SalesAgent;
