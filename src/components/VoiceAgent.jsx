import React, { useState, useEffect, useRef } from 'react'; // 🔥 Importamos useRef
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

const VoiceAgent = ({ onActionTriggered }) => {
  const [isListening, setIsListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  // 🔥 SOLUCIÓN CRÍTICA: Mantenemos siempre fresca la función onActionTriggered
  const actionRef = useRef(onActionTriggered);

  // Cada vez que el padre nos pase una nueva función (con las habitaciones cargadas), actualizamos la referencia
  useEffect(() => {
    actionRef.current = onActionTriggered;
  }, [onActionTriggered]);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window))
      return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognizer = new SpeechRecognition();

    recognizer.lang = 'es-CO';
    recognizer.continuous = false;
    recognizer.interimResults = true;

    recognizer.onstart = () => setIsListening(true);
    recognizer.onend = () => setIsListening(false);

    recognizer.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
          processCommandWithAI(finalTranscript);
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript || interimTranscript);
    };

    setRecognition(recognizer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Se mantiene vacío para iniciar el mic una sola vez

  const startListening = () => {
    if (recognition && !processing) {
      recognition.start();
    }
  };

  const stopListening = () => {
    if (recognition) recognition.stop();
  };

  const processCommandWithAI = async (text) => {
    setProcessing(true);
    try {
      console.log('Enviando comando a Supabase:', text);

      const { data, error } = await supabase.functions.invoke(
        'process-voice-command',
        {
          body: { command: text },
        }
      );

      if (error) throw error;
      console.log('Respuesta recibida:', data);

      if (data) {
        // 🔥 AQUÍ ESTÁ EL CAMBIO: Usamos actionRef.current en lugar de onActionTriggered directo
        // Esto garantiza que usamos la versión que TIENE las habitaciones cargadas
        if (data.action && actionRef.current) {
          actionRef.current(data);
        }

        if (data.audioBase64) {
          console.log('✅ Audio HD detectado. Reproduciendo...');
          playAudioFromBase64(data.audioBase64);
        } else {
          speakFallback(data.confirmation_message || 'Entendido.');
        }
      }
    } catch (err) {
      console.error('Error procesando voz:', err);
      speakFallback('Hubo un error de conexión.');
    } finally {
      setProcessing(false);
      setTimeout(() => setTranscript(''), 3000);
    }
  };

  const playAudioFromBase64 = (base64String) => {
    try {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const byteCharacters = atob(base64String);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      const audio = new Audio(url);
      audio.play().catch((e) => console.error('Error al dar play:', e));
    } catch (e) {
      console.error('Error decodificando audio:', e);
      speakFallback('Error de audio.');
    }
  };

  const speakFallback = (text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-CO';
    window.speechSynthesis.speak(utterance);
  };

  if (!recognition) return null;

  return (
    <div className='fixed bottom-24 left-4 md:left-auto md:bottom-8 md:right-32 z-50 flex flex-row-reverse items-center gap-4'>
      {transcript && (
        <div className='bg-black/80 text-white px-4 py-2 rounded-xl backdrop-blur-md border border-white/10 shadow-lg max-w-xs'>
          <p className='text-sm font-medium'>"{transcript}"</p>
        </div>
      )}

      <button
        onMouseDown={startListening}
        onMouseUp={stopListening}
        onTouchStart={startListening}
        onTouchEnd={stopListening}
        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
          processing
            ? 'bg-cyan-600 animate-pulse scale-110'
            : isListening
            ? 'bg-red-500 scale-110 shadow-red-500/50'
            : 'bg-[#2C2C2C] hover:bg-black hover:scale-105'
        }`}
      >
        {processing ? (
          <Loader2
            className='animate-spin text-white'
            size={28}
          />
        ) : isListening ? (
          <MicOff
            className='text-white'
            size={28}
          />
        ) : (
          <Mic
            className='text-white'
            size={28}
          />
        )}
      </button>
    </div>
  );
};

export default VoiceAgent;
