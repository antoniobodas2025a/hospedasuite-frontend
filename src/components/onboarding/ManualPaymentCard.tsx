'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, CheckCircle2, ExternalLink, Image, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { uploadManualPaymentReceipt } from '@/app/actions/manual-payments';
import imageCompression from 'browser-image-compression';

const NEQUI_NUMBER = '3213795015';
const DAVIPLATA_NUMBER = '3213795015';
const WHATSAPP_NUMBER = '573213795015';

export default function ManualPaymentCard() {
  const { setManualReceiptUrl, manualReceiptUrl } = useOnboardingStore();
  const [selectedMethod, setSelectedMethod] = useState<'nequi' | 'daviplata'>('nequi');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploading(true);

    try {
      let fileToUpload: File = file;

      // Compress images client-side before upload
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
        const compressed = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: 'image/webp',
        });
        fileToUpload = new File([compressed], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' });
      } else if (file.type === 'application/pdf') {
        // PDF validation: max 4MB
        if (file.size > 4 * 1024 * 1024) {
          setUploadError('El PDF supera los 4MB. Usá una herramienta de compresión como ilovepdf.com');
          setUploading(false);
          return;
        }
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setUploadError('Formato no soportado. Usá JPEG, PNG, WebP o PDF.');
        setUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', fileToUpload);

      const result = await uploadManualPaymentReceipt(formData);
      setUploading(false);

      if (result.success && result.url) {
        setManualReceiptUrl(result.url);
      } else {
        setUploadError(result.error || 'Error al subir el comprobante.');
        setPreviewUrl(null);
      }
    } catch (error: any) {
      setUploading(false);
      setUploadError(error.message || 'Error al procesar el archivo.');
      setPreviewUrl(null);
    }
  };

  const phoneNumber = selectedMethod === 'nequi' ? NEQUI_NUMBER : DAVIPLATA_NUMBER;
  const methodLabel = selectedMethod === 'nequi' ? 'Nequi' : 'Daviplata';

  return (
    <div className="space-y-6">
      {/* Method selector */}
      <div className="grid grid-cols-2 gap-3">
        {(['nequi', 'daviplata'] as const).map((method) => (
          <button
            key={method}
            onClick={() => setSelectedMethod(method)}
            className={`p-4 rounded-[var(--radius-squircle-xl)] border text-center transition-all ${
              selectedMethod === method
                ? 'bg-indigo-500/10 border-indigo-500/30 text-white'
                : 'bg-black/30 border-white/5 text-zinc-500 hover:border-white/10 hover:text-zinc-300'
            }`}
          >
            <p className="font-bold text-sm capitalize">{method === 'nequi' ? 'Nequi' : 'Daviplata'}</p>
            <p className={`text-xs font-mono mt-1 ${selectedMethod === method ? 'text-indigo-300' : 'text-zinc-500'}`}>
              {method === 'nequi' ? NEQUI_NUMBER : DAVIPLATA_NUMBER}
            </p>
          </button>
        ))}
      </div>

      {/* Payment instructions */}
      <div className="bg-black/30 border border-white/5 rounded-[var(--radius-squircle-xl)] p-4 space-y-3">
        <p className="text-zinc-300 text-sm font-bold">Instrucciones de pago</p>
        <ol className="text-zinc-400 text-xs space-y-2 list-decimal list-inside">
          <li>Transferí <span className="text-emerald-400 font-mono font-bold">$89.900 COP</span> a {methodLabel} al número <span className="text-white font-mono">{phoneNumber}</span></li>
          <li>Subí el comprobante de pago acá abajo</li>
          <li>Enviá el comprobante por WhatsApp para agilizar la verificación</li>
        </ol>
      </div>

      {/* File upload */}
      <div className="space-y-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        {!manualReceiptUrl && !previewUrl && (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full p-6 border-2 border-dashed border-zinc-700 hover:border-indigo-500/50 rounded-[var(--radius-squircle-xl)] bg-black/20 text-zinc-500 hover:text-zinc-300 transition-all flex flex-col items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Loader2 className="animate-spin text-indigo-400" size={24} />
                <span className="text-xs">Comprimiendo y subiendo...</span>
              </>
            ) : (
              <>
                <Upload size={24} />
                <span className="text-sm">Subir comprobante de pago</span>
                <span className="text-[10px] text-zinc-600">JPEG, PNG, WebP o PDF — máx. 4MB (imágenes se comprimen auto)</span>
              </>
            )}
          </button>
        )}

        {/* Upload error */}
        {uploadError && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-[var(--radius-squircle-lg)]">
            <AlertCircle size={14} className="text-rose-400 shrink-0" />
            <p className="text-rose-300 text-xs">{uploadError}</p>
          </div>
        )}

        {/* Preview */}
        {(previewUrl || manualReceiptUrl) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/30 border border-emerald-500/20 rounded-[var(--radius-squircle-xl)] p-4 space-y-3"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <p className="text-emerald-400 text-sm font-bold">Comprobante subido</p>
            </div>

            {(previewUrl || manualReceiptUrl) && (
              <div className="relative rounded-[var(--radius-squircle-lg)] overflow-hidden border border-white/5">
                {previewUrl?.match(/\.(pdf)$/i) || manualReceiptUrl?.match(/\.(pdf)$/i) ? (
                  <div className="flex items-center gap-3 p-4 bg-black/20">
                    <FileText size={20} className="text-zinc-400" />
                    <span className="text-zinc-400 text-xs">Documento PDF</span>
                    <a
                      href={previewUrl || manualReceiptUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-indigo-400 text-xs hover:underline"
                    >
                      Ver
                    </a>
                  </div>
                ) : (
                  <img
                    src={previewUrl || manualReceiptUrl || ''}
                    alt="Comprobante de pago"
                    className="w-full max-h-48 object-cover"
                  />
                )}
              </div>
            )}

            {uploading && (
              <div className="flex items-center gap-2 text-zinc-500">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-xs">Subiendo a la nube...</span>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* WhatsApp bypass - good faith policy */}
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hola%2C%20adjunto%20comprobante%20de%20pago%20de%20HospedaSuite%20(${methodLabel}%20${phoneNumber})`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-[var(--radius-squircle-xl)] text-emerald-400 font-bold text-sm hover:bg-emerald-500/20 transition-all group"
      >
        <Image size={16} className="text-emerald-400" />
        Enviar comprobante por WhatsApp
        <ExternalLink size={14} className="text-emerald-600 group-hover:text-emerald-400 transition-colors" />
      </a>
    </div>
  );
}
