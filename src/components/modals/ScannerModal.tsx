'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import {
  X,
  Camera,
  RefreshCw,
  CheckCircle2,
  Loader2,
  Upload,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { processIdCard } from '@/app/actions/ocr';

interface ScannerModalProps {
  onScanSuccess: (data: any) => void;
  onClose: () => void;
}

const ScannerModal = ({ onScanSuccess, onClose }: ScannerModalProps) => {
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraDenied, setCameraDenied] = useState(false);

  // Configuración de Hardware
  // Flexible: intenta cámara trasera, si no existe (laptop) usa la disponible
  const videoConstraints = {
    facingMode: 'environment',
    width: { ideal: 1280 },
    height: { ideal: 720 },
  };

  // Verificar permisos de cámara al montar
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.permissions) {
      navigator.permissions.query({ name: 'camera' as PermissionName }).then((result) => {
        if (result.state === 'denied') {
          setCameraDenied(true);
        }
        result.addEventListener('change', () => {
          if (result.state === 'granted') {
            setCameraDenied(false);
          }
        });
      }).catch(() => {
        // Permissions API not available — try camera anyway
      });
    }
  }, []);

  // Capturar Foto
  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) setImgSrc(imageSrc);
  }, [webcamRef]);

  // Fallback: subir foto desde galería
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImgSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Procesar con IA (Server Action)
  const handleAnalyze = async () => {
    if (!imgSrc) return;
    setIsProcessing(true);
    setError('');

    try {
      const res = await fetch(imgSrc);
      const blob = await res.blob();
      const file = new File([blob], 'cedula.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('image', file);

      const result = await processIdCard(formData);

      if (result.success) {
        onScanSuccess(result.data);
        onClose();
      } else {
        setError(result.error || 'Error desconocido');
        setImgSrc(null);
      }
    } catch (err) {
      setError('Error de comunicación con el servidor');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className='fixed inset-0 z-[calc(var(--z-modal)+2)] bg-black flex flex-col items-center justify-center sm:p-4'>
      {/* Marco del Scanner */}
      <div className='relative w-full max-w-lg aspect-[9/16] sm:aspect-[3/4] bg-black rounded-[var(--radius-squircle-3xl)] overflow-hidden shadow-2xl border border-white/10'>
        {/* Header */}
        <div className='absolute top-0 left-0 right-0 z-20 p-6 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent'>
          <button
            onClick={onClose}
            className='p-3 glass-card rounded-full text-white'
          >
            <X size={24} />
          </button>
          <div className='glass-card px-4 py-2 rounded-full border border-white/10'>
            <p className='text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2'>
              <span className='w-2 h-2 bg-emerald-500 rounded-full animate-pulse' />
              IA Vision Activa
            </p>
          </div>
        </div>

        {/* Viewport de Cámara */}
        {!imgSrc && !cameraDenied && !error ? (
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat='image/jpeg'
            videoConstraints={videoConstraints}
            className='w-full h-full object-cover'
            onUserMedia={() => setCameraReady(true)}
            onUserMediaError={(err) => {
              console.warn('Camera error:', err);
              setCameraDenied(true);
              setError('No se pudo acceder a la cámara. Podés subir una foto manualmente.');
            }}
          />
        ) : !imgSrc ? (
          /* Fallback: upload manual cuando la cámara no está disponible */
          <div className='w-full h-full flex flex-col items-center justify-center p-8 text-center'>
            <Camera className='size-16 text-zinc-600 mb-6' />
            <p className='text-zinc-400 font-bold text-lg mb-2'>Cámara no disponible</p>
            <p className='text-zinc-500 text-sm mb-8 max-w-xs'>
              Verificá los permisos de tu navegador o subí una foto de la cédula desde tu galería.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className='px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[var(--radius-squircle-2xl)] font-bold text-sm flex items-center gap-3 transition-all active:scale-95'
            >
              <Upload size={18} /> Subir Foto
            </button>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/*'
              capture='environment'
              onChange={handleFileUpload}
              className='hidden'
            />
          </div>
        ) : (
          <img
            src={imgSrc}
            alt='Captura'
            className='w-full h-full object-cover'
          />
        )}

        {/* Guías Visuales (Overlay) */}
        {!imgSrc && cameraReady && (
          <div className='absolute inset-0 pointer-events-none flex items-center justify-center'>
            <div className='w-[85%] aspect-[1.58] border-2 border-white/30 rounded-[var(--radius-squircle-lg)] relative'>
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

        {/* Controles */}
        <div className='absolute bottom-0 left-0 right-0 p-8 pb-12 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col gap-6 items-center'>
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
          ) : !imgSrc && cameraReady ? (
            <button
              onClick={capture}
              className='w-20 h-20 bg-white rounded-full border-4 border-white/20 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)]'
            >
              <div className='w-16 h-16 bg-white border-2 border-black rounded-full' />
            </button>
          ) : !imgSrc && !cameraReady && !cameraDenied ? (
            <div className='flex flex-col items-center gap-3'>
              <Loader2 size={32} className='text-zinc-500 animate-spin' />
              <p className='text-zinc-500 text-xs font-bold uppercase tracking-widest'>
                Iniciando cámara...
              </p>
            </div>
          ) : imgSrc ? (
            <div className='flex gap-4 w-full'>
              <button
                onClick={() => { setImgSrc(null); setError(''); setCameraDenied(false); }}
                className='flex-1 py-4 glass-card rounded-[var(--radius-squircle-2xl)] text-white font-bold hover:bg-white/20'
              >
                <RefreshCw
                  size={20}
                  className='inline mr-2'
                />{' '}
                Repetir
              </button>
              <button
                onClick={handleAnalyze}
                className='flex-1 py-4 bg-emerald-500 rounded-[var(--radius-squircle-2xl)] text-white font-bold shadow-lg hover:bg-emerald-400 flex items-center justify-center gap-2'
              >
                <CheckCircle2 size={20} /> Usar Foto
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ScannerModal;
