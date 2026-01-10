import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { supabase } from '../supabaseClient';
import {
  X,
  Zap,
  ZapOff,
  Loader2,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

const CedulaOCR = ({ onScanSuccess, onClose }) => {
  const webcamRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Configuración de cámara (HD Ligero)
  const videoConstraints = {
    facingMode: { exact: 'environment' },
    width: { ideal: 1280 },
    height: { ideal: 720 },
  };

  const toggleTorch = async () => {
    const track = webcamRef.current?.video?.srcObject?.getVideoTracks()[0];
    if (track && track.getCapabilities().torch) {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn(!torchOn);
    }
  };

  const capture = useCallback(() => {
    setErrorMsg(null);
    const imageSrc = webcamRef.current.getScreenshot();
    setImgSrc(imageSrc);
  }, [webcamRef]);

  // Función de compresión (Esencial para velocidad 4G/5G)
  const compressImage = (base64Str) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // Suficiente para Gemini
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = (height * MAX_WIDTH) / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        // Exportar JPEG calidad 60%
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    });
  };

  // 🧠 LÓGICA SEGURA (Llama a tu Nube)
  const analyzeSecurely = async () => {
    setAnalyzing(true);
    setErrorMsg(null);

    try {
      const compressedBase64 = await compressImage(imgSrc);

      // Llamada a Supabase Edge Function
      const { data, error } = await supabase.functions.invoke(
        'process-id-card',
        {
          body: { image: compressedBase64 },
        }
      );

      if (error) throw new Error('Error de conexión con el servidor.');

      if (data && data.error) {
        if (data.error === 'ilegible')
          throw new Error(
            'Imagen borrosa o sin datos claros. Intenta de nuevo.'
          );
        throw new Error('Respuesta del sistema: ' + data.error);
      }

      if (data && data.docNumber) {
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        // ¡ÉXITO! Devolvemos los datos limpios
        onScanSuccess({
          docNumber: data.docNumber,
          fullName: data.fullName || '',
          bloodType: data.bloodType || '',
        });
      } else {
        throw new Error('No se detectaron datos en la imagen.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
      setAnalyzing(false);
    }
  };

  return (
    <div className='fixed inset-0 z-50 bg-black flex flex-col font-sans select-none'>
      {/* HEADER */}
      <div className='flex justify-between items-center p-4 bg-black/80 absolute top-0 w-full z-10 backdrop-blur-md border-b border-white/10'>
        <span className='text-white font-bold flex items-center gap-2 text-sm'>
          <ShieldCheck
            className='text-emerald-400'
            size={18}
          />
          ESCÁNER SEGURO
        </span>
        <button
          onClick={onClose}
          className='text-white bg-white/10 p-2 rounded-full hover:bg-red-600 transition-colors'
        >
          <X size={24} />
        </button>
      </div>

      {/* VISOR */}
      <div className='flex-1 relative flex flex-col bg-black justify-center items-center overflow-hidden'>
        {/* MENSAJES DE ERROR */}
        {errorMsg && (
          <div className='absolute z-30 p-6 bg-red-900/95 backdrop-blur-md rounded-2xl max-w-xs text-center border border-red-500 mx-4 shadow-2xl animate-in fade-in zoom-in duration-300'>
            <AlertTriangle className='text-white w-10 h-10 mx-auto mb-2' />
            <p className='text-white/90 text-sm font-bold mb-4'>{errorMsg}</p>
            <button
              onClick={() => {
                setErrorMsg(null);
                setImgSrc(null);
                setAnalyzing(false);
              }}
              className='w-full bg-white text-red-900 font-bold py-3 rounded-xl active:scale-95 transition-transform'
            >
              Reintentar
            </button>
          </div>
        )}

        {!imgSrc ? (
          <>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat='image/jpeg'
              videoConstraints={videoConstraints}
              className='h-full w-full object-cover'
              onUserMediaError={() =>
                setErrorMsg('No se detecta la cámara trasera.')
              }
            />
            {/* GUÍA VISUAL */}
            <div className='absolute inset-0 flex flex-col items-center justify-center pointer-events-none'>
              <div className='w-[85%] aspect-[1.58] border-2 border-emerald-400/60 rounded-xl relative shadow-[0_0_100px_rgba(16,185,129,0.2)] bg-emerald-500/5'>
                <div className='absolute -bottom-14 w-full text-center'>
                  <span className='text-white text-xs font-bold drop-shadow-md bg-black/60 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md'>
                    Ubica la Cédula Horizontalmente
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          // PREVIEW
          <div className='relative w-full h-full bg-zinc-900 flex flex-col items-center justify-center'>
            <img
              src={imgSrc}
              alt='Captura'
              className={`max-w-full max-h-[70vh] object-contain border border-zinc-700 transition-opacity duration-500 ${
                analyzing ? 'opacity-40 blur-sm' : 'opacity-100'
              }`}
            />

            {analyzing && (
              <div className='absolute inset-0 flex flex-col items-center justify-center z-20'>
                <div className='relative'>
                  <div className='absolute inset-0 bg-emerald-500 blur-2xl opacity-20 animate-pulse'></div>
                  <Loader2
                    className='animate-spin text-emerald-400 relative z-10'
                    size={64}
                  />
                </div>
                <p className='text-white font-bold text-xl mt-6 animate-pulse tracking-widest'>
                  PROCESANDO
                </p>
                <p className='text-emerald-400/80 text-xs font-mono mt-2'>
                  ENCRIPTANDO DATOS...
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CONTROLES */}
      {!analyzing && !errorMsg && (
        <div className='p-8 bg-black flex justify-around items-center pb-10 border-t border-white/10'>
          {!imgSrc ? (
            <>
              <button
                onClick={toggleTorch}
                className={`p-4 rounded-full transition-all ${
                  torchOn
                    ? 'bg-yellow-400 text-black shadow-[0_0_20px_rgba(250,204,21,0.4)]'
                    : 'bg-zinc-800 text-white'
                }`}
              >
                {torchOn ? <ZapOff size={24} /> : <Zap size={24} />}
              </button>
              <button
                onClick={capture}
                className='w-20 h-20 bg-white rounded-full border-[6px] border-zinc-800 flex items-center justify-center active:scale-95 transition-transform shadow-2xl shadow-white/10'
              >
                <div className='w-16 h-16 bg-white border-2 border-black rounded-full'></div>
              </button>
              <div className='w-14'></div>
            </>
          ) : (
            <div className='flex gap-4 w-full max-w-sm'>
              <button
                onClick={() => setImgSrc(null)}
                className='flex-1 bg-zinc-800 text-white py-4 rounded-xl font-bold border border-zinc-700 hover:bg-zinc-700 transition-colors'
              >
                Repetir
              </button>
              <button
                onClick={analyzeSecurely}
                className='flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-900/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2'
              >
                <ShieldCheck size={20} /> Confirmar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CedulaOCR;
