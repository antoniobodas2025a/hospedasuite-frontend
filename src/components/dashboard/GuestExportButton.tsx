'use client';

import { useState } from 'react';
import { Download, Loader2, FileText, Upload, CheckCircle, X } from 'lucide-react';
import { exportGuestDataForSIRE, guestDataToCSV } from '@/app/actions/guest-export';

export default function GuestExportButton({ hotelId }: { hotelId: string }) {
  const [exporting, setExporting] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await exportGuestDataForSIRE(hotelId);
      if (result.success && result.data && result.data.length > 0) {
        const csv = guestDataToCSV(result.data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `huespedes_sire_tra_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setShowGuide(true); // Mostrar guía tras descargar
      }
    } catch (error) {
      console.error('Error exporting guest data:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <button
        onClick={handleExport}
        disabled={exporting}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-sm font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
      >
        {exporting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Generando...
          </>
        ) : (
          <>
            <Download size={16} />
            Descargar Reporte SIRE/TRA
          </>
        )}
      </button>

      {/* Guía de 3 pasos (Ley de Hick: simple y visual) */}
      {showGuide && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
            <button 
              onClick={() => setShowGuide(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <CheckCircle className="text-emerald-400" />
              ¡Reporte Listo!
            </h3>
            
            <p className="text-gray-400 text-sm mb-6">
              Ya tienes el archivo en tu computadora. Solo falta este último paso:
            </p>

            <div className="space-y-4">
              <Step number={1} icon={<FileText size={18} />} text="Abre el archivo CSV descargado y revisa los datos." />
              <Step number={2} icon={<Upload size={18} />} text="Ingresa a la web de Migración Colombia (SIRE) o TRA." />
              <Step number={3} icon={<CheckCircle size={18} />} text="Sube el archivo y confirma. ¡Listo, estás al día!" />
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="w-full mt-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Step({ number, icon, text }: { number: number; icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center text-emerald-400 font-bold text-sm">
        {number}
      </div>
      <div className="text-gray-300 text-sm flex items-center gap-2">
        {icon}
        <span>{text}</span>
      </div>
    </div>
  );
}
