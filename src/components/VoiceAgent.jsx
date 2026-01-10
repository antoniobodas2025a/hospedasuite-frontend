import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '../supabaseClient';

const VoiceAgent = ({ onActionTriggered, forceStart }) => {
  // Estados VISUALES (Solo para pintar la UI)
  const [isUiListening, setIsUiListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');

  // 🛡️ CEREBRO BLINDADO (Referencias que sobreviven al render)
  const recognitionRef = useRef(null);
  const shouldBeListeningRef = useRef(false); // La "Intención Real" del usuario
  const accumulatedTextRef = useRef(''); // Memoria a largo plazo
  const actionRef = useRef(onActionTriggered);

  useEffect(() => {
    actionRef.current = onActionTriggered;
  }, [onActionTriggered]);

  // INICIALIZACIÓN DEL MOTOR
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window))
      return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognizer = new SpeechRecognition();

    recognizer.lang = 'es-CO';
    recognizer.continuous = true; // Intentar mantenerlo
    recognizer.interimResults = true; // Ver lo que escribes en tiempo real

    // --- MANEJO DE EVENTOS ---

    recognizer.onstart = () => {
      console.log('⚡ Motor de Voz: ENCENDIDO');
      setIsUiListening(true);
    };

    recognizer.onend = () => {
      console.log('⚠️ Motor de Voz: APAGADO (Evento del navegador)');

      // LA LÓGICA FÉNIX:
      // Si la "Intención" (Ref) sigue siendo TRUE, ignoramos al navegador y reiniciamos.
      if (shouldBeListeningRef.current) {
        console.log('🔥 RESUCITANDO MICROFONO EN 200ms...');

        // Pequeño delay vital para que Chrome limpie el buffer anterior
        setTimeout(() => {
          if (shouldBeListeningRef.current) {
            try {
              recognizer.start();
            } catch (e) {
              console.warn(
                'Intento de resurrección fallido (ya estaba activo?)',
                e
              );
            }
          }
        }, 200);
      } else {
        // Si la intención era FALSE, entonces sí apagamos la UI y procesamos
        setIsUiListening(false);
        handleFinalProcessing();
      }
    };

    recognizer.onresult = (event) => {
      let currentInterim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        currentInterim += event.results[i][0].transcript;
      }

      // Mostramos Acumulado + Lo que estás diciendo ahora
      const display = (
        accumulatedTextRef.current +
        ' ' +
        currentInterim
      ).trim();
      setTranscript(display);

      // Si el navegador marca la frase como "Final", la guardamos en memoria
      if (event.results[event.results.length - 1].isFinal) {
        accumulatedTextRef.current += ' ' + currentInterim;
      }
    };

    recognizer.onerror = (event) => {
      // Ignoramos errores de "no-speech" o "aborted" para que no rompan el ciclo
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      console.error('Error de Voz:', event.error);
    };

    recognitionRef.current = recognizer;

    return () => {
      shouldBeListeningRef.current = false; // Matar intención al desmontar
      recognizer.abort();
    };
  }, []);

  // --- CONTROLADOR MAESTRO ---
  const toggleListening = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (processing) return;

    if (shouldBeListeningRef.current) {
      // 🛑 APAGAR (Usuario hace click en Stop)
      console.log('🛑 DETENCIÓN MANUAL SOLICITADA');
      shouldBeListeningRef.current = false; // Cambiamos la intención
      recognitionRef.current?.stop(); // Esto disparará onend, que leerá la intención false
    } else {
      // 🟢 ENCENDER (Usuario hace click en Mic)
      console.log('🟢 INICIO MANUAL SOLICITADO');
      shouldBeListeningRef.current = true; // Marcamos intención
      accumulatedTextRef.current = ''; // Limpiamos memoria vieja
      setTranscript('');
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error('Error al iniciar:', err);
      }
    }
  };

  const handleFinalProcessing = async () => {
    const finalText = accumulatedTextRef.current.trim();
    if (!finalText) return;

    setProcessing(true);
    try {
      console.log('🗣️ ENVIANDO A IA:', finalText);
      const { data, error } = await supabase.functions.invoke(
        'process-voice-command',
        { body: { command: finalText } }
      );
      if (error) throw error;

      if (data && data.action && actionRef.current) {
        actionRef.current(data);
      }
    } catch (err) {
      console.error('Error IA:', err);
    } finally {
      setProcessing(false);
      setTranscript('');
      accumulatedTextRef.current = '';
    }
  };

  return (
    <>
      <div className='relative w-full h-full flex items-center justify-center'>
        {/* Anillo de ping solo si UI dice escuchando Y no procesando */}
        {isUiListening && !processing && (
          <span className='absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-20 animate-ping'></span>
        )}

        <button
          onClick={toggleListening}
          className={`
            relative z-10 w-16 h-16 rounded-full flex items-center justify-center text-white 
            border-[4px] shadow-xl transition-all duration-300 transform active:scale-95
            ${
              processing
                ? 'bg-indigo-600 border-indigo-400 rotate-180 cursor-wait'
                : isUiListening
                ? 'bg-red-600 border-red-400 scale-110 shadow-red-500/50'
                : 'bg-cyan-600 border-cyan-400 hover:bg-cyan-500 shadow-cyan-500/30'
            }
          `}
        >
          <div
            className={`transition-all duration-300 ${
              processing ? 'animate-spin' : ''
            }`}
          >
            {processing ? (
              <Loader2 size={28} />
            ) : isUiListening ? (
              <Square
                size={20}
                fill='currentColor'
              />
            ) : (
              <Mic size={28} />
            )}
          </div>
        </button>
      </div>

      {/* VISOR FLOTANTE */}
      {(transcript || processing) && (
        <div className='fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] md:w-[600px] pointer-events-none transition-all duration-300'>
          <div className='bg-slate-900/90 text-white px-6 py-4 rounded-2xl backdrop-blur-md border border-white/10 shadow-2xl text-center mx-auto'>
            <div className='flex items-center justify-center gap-2 mb-2'>
              {processing ? (
                <Sparkles
                  size={16}
                  className='text-yellow-400 animate-pulse'
                />
              ) : (
                <div className='w-2 h-2 rounded-full bg-red-500 animate-pulse' />
              )}
              <p className='text-xs text-slate-400 uppercase tracking-widest font-bold'>
                {processing ? 'Procesando...' : 'Grabando (Click para Enviar)'}
              </p>
            </div>
            <p className='text-lg md:text-xl font-medium leading-relaxed text-cyan-50'>
              "{transcript}"
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceAgent;
