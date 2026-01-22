import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient'; //
import { generateSIRE } from '../../utils/sireGenerator'; //
import {
  ShieldCheck,
  Download,
  FileText,
  Search,
  MapPin,
  Smartphone,
  Clock,
  X,
  Fingerprint,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ForensicBookPanel = ({ hotelId }) => {
  // 🔒 Recibe hotelId para aislar datos
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);

  // --- CARGA DE DATOS BLINDADA ---
  useEffect(() => {
    if (!hotelId) return;

    const fetchLegalLogs = async () => {
      setLoading(true);
      try {
        // 🔒 FILTRO CRÍTICO: .eq('hotel_id', hotelId) asegura aislamiento entre hoteles
        const { data, error } = await supabase
          .from('guests')
          .select(
            `
            *,
            bookings (
              check_in,
              check_out,
              status
            )
          `,
          )
          .eq('hotel_id', hotelId) // 🛡️ Aislamiento Multi-Tenant
          .not('consent_timestamp', 'is', null) // Solo registros legales con firma
          .order('consent_timestamp', { ascending: false });

        if (error) throw error;
        setLogs(data);
      } catch (err) {
        console.error('Error cargando libro forense:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLegalLogs();
  }, [hotelId]);

  // --- FILTRADO EN MEMORIA ---
  const filteredLogs = logs.filter(
    (log) =>
      log.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.doc_number?.includes(searchTerm),
  );

  // --- EXPORTAR A SIRE (Usando tu utilidad existente) ---
  const handleExportSIRE = () => {
    // Adaptamos los datos para que encajen con tu generador actual
    const sireData = logs.map((log) => ({
      guests: log, // Tu generador espera guest dentro de booking o viceversa, ajustamos aquí
      status: 'confirmed',
      check_in: log.bookings?.[0]?.check_in,
      check_out: log.bookings?.[0]?.check_out,
    }));

    // Simulamos info del hotel si no está disponible
    const hotelInfo = { name: 'REPORTE_LEGAL' };
    generateSIRE(sireData, hotelInfo);
  };

  return (
    <div className='h-full flex flex-col space-y-6'>
      {/* HEADER TIPO "CIBERSEGURIDAD" */}
      <div className='bg-slate-900 text-white rounded-[25px] p-8 shadow-2xl border border-slate-700 relative overflow-hidden'>
        <div className='absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none'></div>

        <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10'>
          <div>
            <div className='flex items-center gap-3 mb-2'>
              <ShieldCheck
                className='text-emerald-400'
                size={32}
              />
              <h2 className='text-3xl font-mono font-bold tracking-tight'>
                LIBRO DE REGISTRO
              </h2>
            </div>
            <p className='text-slate-400 text-sm font-mono'>
              Auditoría Forense & Cumplimiento TRA/SIRE
            </p>
          </div>

          <div className='flex gap-3'>
            <button
              onClick={handleExportSIRE}
              className='flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/50'
            >
              <Download size={18} />
              Exportar SIRE
            </button>
          </div>
        </div>
      </div>

      {/* BUSCADOR Y LISTA */}
      <div className='bg-white rounded-[25px] border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden'>
        {/* Barra de Herramientas */}
        <div className='p-5 border-b border-slate-100 bg-slate-50/50 flex gap-4'>
          <div className='relative flex-1'>
            <Search
              className='absolute left-4 top-3.5 text-slate-400'
              size={18}
            />
            <input
              type='text'
              placeholder='Buscar por nombre, cédula o IP...'
              className='w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-medium'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Tabla de Registros */}
        <div className='flex-1 overflow-y-auto custom-scrollbar p-2'>
          <table className='w-full text-left border-collapse'>
            <thead className='bg-slate-50 sticky top-0 z-10 text-xs font-bold text-slate-400 uppercase tracking-wider'>
              <tr>
                <th className='p-4 rounded-tl-xl'>Fecha Registro</th>
                <th className='p-4'>Huésped (Titular)</th>
                <th className='p-4'>Documento</th>
                <th className='p-4'>Origen Digital</th>
                <th className='p-4 rounded-tr-xl'>Evidencia</th>
              </tr>
            </thead>
            <tbody className='text-sm text-slate-600'>
              {loading ? (
                <tr>
                  <td
                    colSpan='5'
                    className='p-8 text-center'
                  >
                    Cargando auditoría...
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className='border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group'
                    onClick={() => setSelectedEntry(log)}
                  >
                    <td className='p-4 font-mono text-xs'>
                      {new Date(log.consent_timestamp).toLocaleString()}
                    </td>
                    <td className='p-4 font-bold text-slate-800'>
                      {log.full_name}
                    </td>
                    <td className='p-4'>
                      <span className='bg-slate-100 px-2 py-1 rounded text-xs font-mono'>
                        {log.nationality} - {log.doc_number}
                      </span>
                    </td>
                    <td className='p-4'>
                      <div className='flex items-center gap-2'>
                        <span
                          className={`w-2 h-2 rounded-full ${log.consent_ip ? 'bg-emerald-500' : 'bg-red-500'}`}
                        ></span>
                        {log.consent_ip || 'IP No Registrada'}
                      </div>
                    </td>
                    <td className='p-4'>
                      <button className='text-emerald-600 font-bold hover:underline flex items-center gap-1'>
                        <Fingerprint size={16} /> Ver Certificado
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL CERTIFICADO FORENSE (DETALLE) --- */}
      <AnimatePresence>
        {selectedEntry && (
          <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEntry(null)}
              className='absolute inset-0 bg-slate-900/60 backdrop-blur-sm'
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className='bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]'
            >
              {/* Encabezado del Certificado */}
              <div className='bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-start'>
                <div>
                  <h3 className='text-xl font-serif font-bold text-slate-800 flex items-center gap-2'>
                    <FileText className='text-slate-400' />
                    Certificado de Registro Digital
                  </h3>
                  <p className='text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold'>
                    ID Transacción: {selectedEntry.id.split('-')[0]}...
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className='p-2 hover:bg-slate-200 rounded-full transition'
                >
                  <X size={20} />
                </button>
              </div>

              {/* Cuerpo del Certificado */}
              <div className="p-8 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
                <div className='bg-white p-6 shadow-sm border border-slate-200 rounded-xl space-y-6'>
                  {/* Bloque 1: Identidad */}
                  <div>
                    <h4 className='text-xs font-bold text-slate-400 uppercase mb-3 border-b pb-1'>
                      1. Identidad del Firmante
                    </h4>
                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <span className='block text-xs text-slate-500'>
                          Nombre Completo
                        </span>
                        <strong className='text-slate-800'>
                          {selectedEntry.full_name}
                        </strong>
                      </div>
                      <div>
                        <span className='block text-xs text-slate-500'>
                          Documento
                        </span>
                        <strong className='text-slate-800'>
                          {selectedEntry.nationality} -{' '}
                          {selectedEntry.doc_number}
                        </strong>
                      </div>
                      <div>
                        <span className='block text-xs text-slate-500'>
                          Email
                        </span>
                        <span className='text-slate-800 font-mono text-xs'>
                          {selectedEntry.email}
                        </span>
                      </div>
                      <div>
                        <span className='block text-xs text-slate-500'>
                          Teléfono
                        </span>
                        <span className='text-slate-800 font-mono text-xs'>
                          {selectedEntry.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bloque 2: Evidencia Técnica */}
                  <div>
                    <h4 className='text-xs font-bold text-slate-400 uppercase mb-3 border-b pb-1'>
                      2. Evidencia Técnica (No Repudio)
                    </h4>
                    <div className='space-y-3'>
                      <div className='flex items-center gap-3 text-sm text-slate-600'>
                        <MapPin
                          size={16}
                          className='text-emerald-500'
                        />
                        <span>
                          IP de Origen:{' '}
                          <code className='bg-slate-100 px-1 rounded font-bold'>
                            {selectedEntry.consent_ip || 'N/A'}
                          </code>
                        </span>
                      </div>
                      <div className='flex items-center gap-3 text-sm text-slate-600'>
                        <Smartphone
                          size={16}
                          className='text-blue-500'
                        />
                        <span
                          className='truncate max-w-md'
                          title={selectedEntry.consent_user_agent}
                        >
                          Dispositivo:{' '}
                          {selectedEntry.consent_user_agent?.substring(0, 40)}
                          ...
                        </span>
                      </div>
                      <div className='flex items-center gap-3 text-sm text-slate-600'>
                        <Clock
                          size={16}
                          className='text-orange-500'
                        />
                        <span>
                          Timestamp:{' '}
                          <strong>{selectedEntry.consent_timestamp}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bloque 3: Firma y Consentimiento */}
                  <div>
                    <h4 className='text-xs font-bold text-slate-400 uppercase mb-3 border-b pb-1'>
                      3. Firma Digitalizada
                    </h4>
                    <div className='bg-slate-50 border border-dashed border-slate-300 rounded-lg p-4 flex justify-center items-center h-32'>
                      {selectedEntry.signature_url ? (
                        <img
                          src={selectedEntry.signature_url}
                          alt='Firma del Huésped'
                          className='max-h-full opacity-80'
                        />
                      ) : (
                        <span className='text-xs text-red-400 italic'>
                          Firma no disponible
                        </span>
                      )}
                    </div>
                    <p className='text-[10px] text-slate-400 mt-2 text-justify leading-tight'>
                      * El usuario aceptó explícitamente la política de
                      tratamiento de datos (Habeas Data Ley 1581) y certificó la
                      veracidad de la información anterior mediante el mecanismo
                      de firma electrónica simple.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer Acciones */}
              <div className='p-4 border-t border-slate-200 bg-slate-50 flex justify-end'>
                <button className='bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-700'>
                  <Download size={16} /> Descargar PDF (TRA)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ForensicBookPanel;
