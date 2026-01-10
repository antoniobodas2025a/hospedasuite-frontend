import React, { useRef, useState, useEffect } from 'react';
import { X, Camera, RefreshCw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabaseClient';

const ScannerModal = ({ isOpen, onClose, onScan }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  // 1. ENCENDER CÁMARA AL ABRIR
  useEffect(() => {
    let currentStream = null;

    const startCamera = async () => {
      if (isOpen) {
        try {
          setError(null);
          // Pedimos cámara trasera si es celular ('environment')
          const constraints = {
            video: {
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          };
          const mediaStream = await navigator.mediaDevices.getUserMedia(
            constraints
          );
          currentStream = mediaStream;
          setStream(mediaStream);

          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        } catch (err) {
          console.error('Error cámara:', err);
          setError('No pudimos acceder a la cámara. Revisa los permisos.');
        }
      }
    };

    startCamera();

    // APAGAR CÁMARA AL CERRAR
    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  // 2. CAPTURAR Y ENVIAR A LA IA
  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setProcessing(true);

    // A. Dibujar video en canvas
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // B. Obtener Base64 LIMPIO (sin el prefijo data:image...)
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    const base64Clean = imageData.split(',')[1];

    try {
      // C. Invocar a tu Cerebro (index.ts)
      const { data, error } = await supabase.functions.invoke(
        'process-voice-command',
        {
          body: {
            image: base64Clean, // Enviamos la imagen
            type: 'OCR', // Le avisamos que es para leer texto
          },
        }
      );

      if (error) throw error;

      // D. Éxito: Pasamos los datos al Dashboard
      if (data && data.data) {
        onScan(data.data); // { doc: '...', name: '...' }
        onClose(); // Cerramos modal
      } else {
        throw new Error('No pude leer la cédula. Intenta acercarte más.');
      }
    } catch (err) {
      console.error(err);
      alert('Error leyendo documento: ' + (err.message || 'Intenta de nuevo'));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className='fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center p-4'>
          {/* BOTÓN CERRAR */}
          <button
            onClick={onClose}
            className='absolute top-6 right-6 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 z-[110]'
          >
            <X size={32} />
          </button>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className='w-full max-w-lg relative flex flex-col items-center'
          >
            <h2 className='text-white font-bold text-xl mb-4'>
              {processing ? 'Analizando con IA...' : 'Enfoca la Cédula'}
            </h2>

            {/* VISOR CÁMARA */}
            <div className='relative w-full aspect-[4/3] bg-black rounded-3xl overflow-hidden border-2 border-slate-700 shadow-2xl'>
              {error ? (
                <div className='flex items-center justify-center h-full text-red-400 p-4 text-center'>
                  {error}
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-cover ${
                    processing ? 'opacity-50 blur-sm' : ''
                  }`}
                />
              )}

              {/* GUIAS VISUALES */}
              {!processing && !error && (
                <>
                  <div className='absolute inset-0 border-[40px] border-black/40 pointer-events-none'></div>
                  <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[60%] border-2 border-cyan-400/70 rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.3)]'>
                    <div className='absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-cyan-400 -mt-1 -ml-1'></div>
                    <div className='absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-cyan-400 -mt-1 -mr-1'></div>
                    <div className='absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-cyan-400 -mb-1 -ml-1'></div>
                    <div className='absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-cyan-400 -mb-1 -mr-1'></div>
                  </div>
                </>
              )}

              {/* LOADING OVERLAY */}
              {processing && (
                <div className='absolute inset-0 flex flex-col items-center justify-center'>
                  <Loader2
                    size={60}
                    className='text-cyan-400 animate-spin mb-4'
                  />
                  <p className='text-cyan-100 font-medium animate-pulse'>
                    Leyendo datos...
                  </p>
                </div>
              )}
            </div>

            {/* BOTÓN CAPTURAR */}
            {!processing && !error && (
              <button
                onClick={handleCapture}
                className='mt-8 w-20 h-20 bg-white rounded-full border-4 border-gray-300 shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all'
              >
                <div className='w-16 h-16 bg-red-500 rounded-full border-2 border-white'></div>
              </button>
            )}

            {/* CANVAS OCULTO (Para procesar la imagen) */}
            <canvas
              ref={canvasRef}
              className='hidden'
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ScannerModal;
