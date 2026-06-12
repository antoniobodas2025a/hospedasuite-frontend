'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { exportGuestDataForSIRE, guestDataToCSV } from '@/app/actions/guest-export';

export default function GuestExportButton({ hotelId }: { hotelId: string }) {
  const [exporting, setExporting] = useState(false);

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
      }
    } catch (error) {
      console.error('Error exporting guest data:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-sm font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
    >
      {exporting ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          Exportando...
        </>
      ) : (
        <>
          <Download size={16} />
          Exportar datos para Contable (SIRE/TRA)
        </>
      )}
    </button>
  );
}
