'use client';

import React, { useState, useEffect } from 'react';
import { X, Printer, Calculator, Wallet, Building, CreditCard } from 'lucide-react';
import { getShiftReportAction } from '@/app/actions/payments'; // Acción que creamos antes

interface ShiftReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShiftReportModal({ isOpen, onClose }: ShiftReportModalProps) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) loadReport();
  }, [isOpen]);

 const loadReport = async () => {
    setLoading(true);
    try {
      const res = await getShiftReportAction();
      
      if (res && res.success) {
        setReport(res.summary);
      } else {
        alert('❌ Error del Servidor: ' + (res?.error || 'Respuesta vacía'));
      }
    } catch (error: any) {
      console.error('Crash del Server Action:', error);
      alert('❌ Error Crítico de Conexión: ' + error.message);
    } finally {
      // 🚨 FINALLY asegura que, pase lo que pase (éxito o explosión), la carga se detiene
      setLoading(false); 
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 print:p-0 print:bg-white print:block">
      
      {/* ========================================================= */}
      {/* 🖥️ INTERFAZ DE PANTALLA (Se oculta al imprimir)           */}
      {/* ========================================================= */}
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden print:hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <Calculator className="text-hospeda-600" /> Arqueo de Caja
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {loading ? (
            <div className="text-center text-slate-400 py-10 animate-pulse font-bold">Contando los billetes...</div>
          ) : report ? (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-slate-400 uppercase font-bold tracking-widest">Responsable de Turno</p>
                <p className="text-2xl font-display font-bold text-slate-800">{report.staffName}</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="flex items-center gap-3 text-emerald-700 font-bold">
                    <Wallet size={20} /> Efectivo Físico
                  </div>
                  <span className="text-xl font-bold text-emerald-700">${report.cash.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-3 text-blue-700 font-bold">
                    <Building size={20} /> Transferencias
                  </div>
                  <span className="text-lg font-bold text-blue-700">${report.transfer.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center p-4 bg-purple-50 rounded-2xl border border-purple-100">
                  <div className="flex items-center gap-3 text-purple-700 font-bold">
                    <CreditCard size={20} /> Wompi (Tarjetas)
                  </div>
                  <span className="text-lg font-bold text-purple-700">${report.wompi.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-slate-400 font-bold">TOTAL FACTURADO</span>
                <span className="text-3xl font-display font-bold text-slate-900">${report.total.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className="text-center text-red-400 py-10 font-bold">No hay datos para este turno.</div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button 
            onClick={() => window.print()} 
            disabled={loading || !report} 
            className="flex-1 py-4 bg-hospeda-900 text-white shadow-lg font-bold rounded-xl hover:bg-black flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
          >
            <Printer size={18} /> Imprimir Cierre (Reporte Z)
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 🖨️ TICKET TÉRMICO (Solo visible en la impresora POS)       */}
      {/* ========================================================= */}
      {report && (
        <div className="hidden print:block w-[80mm] text-black bg-white font-mono text-[12px] leading-tight mx-auto p-4">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold uppercase mb-1">HospedaSuite</h1>
            <p className="text-[10px] uppercase">Cierre de Turno (Reporte Z)</p>
            <div className="border-b-2 border-dashed border-black w-full mb-2 mt-2"></div>
            <p>Fecha Cierre: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
            <p>Cajero: {report.staffName}</p>
          </div>

          <div className="mb-4 space-y-2">
            <p className="font-bold border-b border-black pb-1 mb-2">RESUMEN DE MEDIOS</p>
            <div className="flex justify-between"><span>EFECTIVO EN CAJA</span><span>${report.cash.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>TRANSFERENCIAS</span><span>${report.transfer.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>TARJETAS (WOMPI)</span><span>${report.wompi.toLocaleString()}</span></div>
          </div>

          <div className="border-t-2 border-dashed border-black w-full my-4"></div>

          <div className="text-right mb-8">
            <p className="text-sm"><strong>TOTAL TURNO: ${report.total.toLocaleString()}</strong></p>
          </div>

          {/* Firmas en físico para control interno */}
          <div className="text-center mt-12 space-y-10">
            <div className="border-t border-black w-48 mx-auto pt-1">
              <p className="text-[10px] uppercase">Firma del Cajero</p>
            </div>
            <div className="border-t border-black w-48 mx-auto pt-1">
              <p className="text-[10px] uppercase">Firma de Recibido (Auditor)</p>
            </div>
            <p className="text-[10px] mt-4">Impreso por HospedaSuite POS</p>
          </div>
        </div>
      )}

    </div>
  );
}