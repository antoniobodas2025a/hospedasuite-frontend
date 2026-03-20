'use client';

import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import {
  X,
  Camera,
  RefreshCw,
  CheckCircle2,
  Loader2,
  Zap,
  ZapOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { processIdCard } from '@/app/actions/ocr'; // Importamos la Server Action

interface ScannerModalProps {
  onScanSuccess: (data: any) => void;
  onClose: () => void;
}

const ScannerModal = ({ onScanSuccess, onClose }: ScannerModalProps) => {
  const webcamRef = useRef<Webcam>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [torch, setTorch] = useState(false);
  const [error, setError] = useState('');

  // Configuración de Hardware
  const videoConstraints = {
    facingMode: 'environment', // ✅ Flexible: "Intenta trasera, si no, usa la que haya"
    width: 1280,
    height: 720,
  };

  // Capturar Foto
  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) setImgSrc(imageSrc);
  }, [webcamRef]);

  // Procesar con IA (Server Action)
  const handleAnalyze = async () => {
    if (!imgSrc) return;
    setIsProcessing(true);
    setError('');

    try {
      // Convertir base64 a Blob para enviar como FormData
      const res = await fetch(imgSrc);
      const blob = await res.blob();
      const file = new File([blob], 'cedula.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('image', file);

      // Llamada al Servidor
      const result = await processIdCard(formData);

      if (result.success) {
        onScanSuccess(result.data);
        onClose(); // Cerrar modal al terminar
      } else {
        setError(result.error || 'Error desconocido');
        setImgSrc(null); // Resetear para intentar de nuevo
      }
    } catch (err) {
      setError('Error de comunicación con el servidor');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className='fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center sm:p-4'>
      {/* Marco del Scanner */}
      <div className='relative w-full max-w-lg aspect-[9/16] sm:aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10'>
        {/* Header */}
        <div className='absolute top-0 left-0 right-0 z-20 p-6 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent'>
          <button
            onClick={onClose}
            className='p-3 bg-white/10 backdrop-blur-md rounded-full text-white'
          >
            <X size={24} />
          </button>
          <div className='bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10'>
            <p className='text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2'>
              <span className='w-2 h-2 bg-emerald-500 rounded-full animate-pulse' />
              IA Vision Activa
            </p>
          </div>
        </div>

        {/* Viewport de Cámara */}
        {!imgSrc ? (
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat='image/jpeg'
            videoConstraints={videoConstraints}
            className='w-full h-full object-cover'
            onUserMediaError={() => setError('No se pudo acceder a la cámara')}
          />
        ) : (
          <img
            src={imgSrc}
            alt='Captura'
            className='w-full h-full object-cover'
          />
        )}

        {/* Guías Visuales (Overlay) */}
        {!imgSrc && (
          <div className='absolute inset-0 pointer-events-none flex items-center justify-center'>
            <div className='w-[85%] aspect-[1.58] border-2 border-white/30 rounded-xl relative'>
              <div className='absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1 rounded-tl-xl' />
              <div className='absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1 rounded-tr-xl' />
              <div className='absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1 rounded-bl-xl' />
              <div className='absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1 rounded-br-xl' />
              <p className='absolute -bottom-8 left-0 right-0 text-center text-white/80 text-sm font-medium'>
                Alinea la cédula aquí
              </p>
            </div>
          </div>
        )}

        {/* Mensaje de Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className='absolute bottom-32 left-6 right-6 bg-red-500/90 text-white p-4 rounded-xl text-center font-bold text-sm backdrop-blur-md'
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controles */}
        <div className='absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col gap-6 items-center'>
          {isProcessing ? (
            <div className='flex flex-col items-center gap-3'>
              <Loader2
                size={48}
                className='text-emerald-400 animate-spin'
              />
              <p className='text-emerald-400 font-bold text-sm uppercase tracking-widest'>
                Analizando Datos...
              </p>
            </div>
          ) : !imgSrc ? (
            <button
              onClick={capture}
              className='w-20 h-20 bg-white rounded-full border-4 border-white/20 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)]'
            >
              <div className='w-16 h-16 bg-white border-2 border-black rounded-full' />
            </button>
          ) : (
            <div className='flex gap-4 w-full'>
              <button
                onClick={() => setImgSrc(null)}
                className='flex-1 py-4 bg-white/10 backdrop-blur-md rounded-2xl text-white font-bold border border-white/20 hover:bg-white/20'
              >
                <RefreshCw
                  size={20}
                  className='inline mr-2'
                />{' '}
                Repetir
              </button>
              <button
                onClick={handleAnalyze}
                className='flex-1 py-4 bg-emerald-500 rounded-2xl text-white font-bold shadow-lg hover:bg-emerald-400 flex items-center justify-center gap-2'
              >
                <CheckCircle2 size={20} /> Usar Foto
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScannerModal;
