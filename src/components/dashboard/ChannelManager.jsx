import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import {
  FaAirbnb,
  FaSync,
  FaTrash,
  FaCheckCircle,
  FaExclamationTriangle,
  FaGlobe,
} from 'react-icons/fa';

// ----------------------------------------------------------------------
// 🎨 ICONOS OFICIALES (SVG EMBEBIDOS)
// Esto soluciona el error de librería y garantiza que siempre se vean bien.
// ----------------------------------------------------------------------

const IconBooking = ({ className }) => (
  <svg
    viewBox='0 0 24 24'
    fill='currentColor'
    className={className}
    xmlns='http://www.w3.org/2000/svg'
  >
    <path d='M13.6 13.5h-2.3v2.3h2.3c.7 0 1.2-.5 1.2-1.1 0-.7-.5-1.2-1.2-1.2zm-2.3-4.6h2.1c.6 0 1.1-.4 1.1-1 0-.6-.5-1-1.1-1h-2.1v2zm-3.7 9.5h8.5c2.3 0 4.2-1.9 4.2-4.2 0-2.3-1.9-4.2-4.2-4.2H10V5.7h6.4c1.1 0 2 .9 2 2s-.9 2-2 2h-1v1.6h1c2.1 0 3.8-1.7 3.8-3.8S18.5 3.7 16.4 3.7H7.6C5.5 3.7 3.8 5.4 3.8 7.5v9.1c0 2.1 1.7 3.8 3.8 3.8zM2.8 5.7c0-1.6 1.3-2.9 2.9-2.9h12.6c1.6 0 2.9 1.3 2.9 2.9v12.6c0 1.6-1.3 2.9-2.9 2.9H5.7c-1.6 0-2.9-1.3-2.9-2.9V5.7z' />
    <path
      d='M7.6 18.2h8.8c2.1 0 3.8-1.7 3.8-3.8 0-1.3-.7-2.5-1.7-3.1.6-.5 1-1.2 1-2 0-1.5-1.2-2.7-2.7-2.7H7.6V18.2zm2.1-9.6h4.5c.3 0 .5.2.5.5 0 .3-.2.5-.5.5H9.7V8.6zm0 7.4V11h5c.3 0 .6.2.6.6 0 .3-.3.6-.6.6H9.7v3.8z'
      fillRule='evenodd'
    />
    {/* Logo simplificado representativo de Booking */}
    <rect
      x='2'
      y='2'
      width='20'
      height='20'
      rx='4'
      fill='#003580'
    />
    <path
      fill='white'
      d='M14.65 14.85c0 1.15-.9 2.05-2.25 2.05H9V12.6h3.25c1.3 0 2.15.75 2.15 1.95 0 .75-.4 1.35-1.05 1.65.8.25 1.3.9 1.3 1.65zm-3.6-3.25h1.25c.65 0 1.05-.35 1.05-.9 0-.5-.4-.9-1.05-.9h-1.25v1.8zm0 4.25h1.4c.75 0 1.2-.4 1.2-1 0-.65-.45-1.05-1.2-1.05h-1.4v2.05z'
    />
  </svg>
);

const IconExpedia = ({ className }) => (
  <svg
    viewBox='0 0 24 24'
    fill='currentColor'
    className={className}
    xmlns='http://www.w3.org/2000/svg'
  >
    {/* Icono amarillo SVG de Expedia */}
    <path
      d='M2.5 21.5L10 2.5L20.5 16H16.5L14.5 12L12 18.5L8.5 14L5.5 21.5H2.5Z'
      fill='#FFC821'
    />
    <path
      d='M12.5 18L14.25 13.5L15.75 16H12.5ZM9.5 15.5L11.5 18H8.5L9.5 15.5Z'
      fill='#00355F'
    />
    <path
      d='M14 8L12 14L10 9L14 8Z'
      fill='#00355F'
    />
  </svg>
);

export const ChannelManager = ({ roomId, onUpdate }) => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Estado del formulario
  const [newUrl, setNewUrl] = useState('');
  const [platform, setPlatform] = useState('airbnb');

  // Cargar conexiones al abrir o cambiar de habitación
  useEffect(() => {
    if (roomId) {
      fetchConnections();
    }
  }, [roomId]);

  const fetchConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('calendar_connections')
        .select('*')
        .eq('room_id', roomId);

      if (error) throw error;
      setConnections(data || []);
    } catch (err) {
      console.error('Error cargando conexiones:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddConnection = async (e) => {
    e.preventDefault();
    if (!newUrl) return;

    // SANITIZACIÓN: Limpiar espacios accidentales
    const cleanUrl = newUrl.trim();

    try {
      setLoading(true);
      // Validación básica
      if (!cleanUrl.includes('http')) {
        alert('Por favor ingresa una URL válida que empiece con http/https');
        return;
      }

      const { error } = await supabase.from('calendar_connections').insert({
        room_id: roomId,
        platform: platform,
        ical_url: cleanUrl,
        name: `${platform.toUpperCase()} - ${new Date().toLocaleDateString()}`,
      });

      if (error) throw error;

      setNewUrl('');
      await fetchConnections();
      if (onUpdate) onUpdate(); // Notificar al padre si es necesario
    } catch (err) {
      alert('Error guardando: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      !confirm(
        '¿Seguro que quieres eliminar esta sincronización? Podría causar overbooking.',
      )
    )
      return;

    try {
      const { error } = await supabase
        .from('calendar_connections')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchConnections();
    } catch (err) {
      alert('Error eliminando: ' + err.message);
    }
  };

  const handleManualSync = async () => {
    try {
      setSyncing(true);
      // Invocar la Edge Function
      const { data, error } = await supabase.functions.invoke(
        'sync-external-calendars',
      );

      if (error) throw error;

      alert(
        `Sincronización completada: ${data.ok || 0} éxitos, ${data.errors || 0} errores.`,
      );
      await fetchConnections(); // Recargar para ver los nuevos estados
    } catch (err) {
      console.error(err);
      alert('Error al sincronizar. Revisa la consola o intenta más tarde.');
    } finally {
      setSyncing(false);
    }
  };

  // Helper para renderizar el icono correcto según la plataforma
  const getIcon = (plat) => {
    const p = plat ? plat.toLowerCase() : '';
    // Airbnb sigue usando FontAwesome porque ese sí te funcionaba
    if (p.includes('airbnb'))
      return <FaAirbnb className='text-[#FF5A5F] text-xl' />;

    // Usamos nuestros componentes personalizados oficiales
    if (p.includes('booking'))
      return <IconBooking className='text-xl w-5 h-5' />;
    if (p.includes('expedia') || p.includes('vrbo'))
      return <IconExpedia className='text-xl w-5 h-5' />;

    return <FaGlobe className='text-gray-500 text-xl' />;
  };

  return (
    <div className='bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4'>
      {/* HEADER DEL PANEL */}
      <div className='flex justify-between items-center mb-4'>
        <h3 className='font-semibold text-gray-700 text-sm'>
          Sincronización de Calendarios
        </h3>
        <button
          onClick={handleManualSync}
          disabled={syncing}
          className={`flex items-center gap-2 text-xs px-3 py-2 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition ${syncing ? 'opacity-50' : ''}`}
        >
          <FaSync className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
        </button>
      </div>

      {/* LISTA DE CONEXIONES */}
      <div className='space-y-3 mb-6'>
        {loading ? (
          <p className='text-xs text-gray-400'>Cargando...</p>
        ) : connections.length === 0 ? (
          <p className='text-xs text-gray-400 italic'>
            No hay conexiones activas. Agrega una abajo.
          </p>
        ) : (
          connections.map((conn) => (
            <div
              key={conn.id}
              className='flex items-center justify-between bg-white p-3 rounded shadow-sm border border-gray-100'
            >
              <div className='flex items-center gap-3'>
                {getIcon(conn.platform)}
                <div className='overflow-hidden'>
                  <p className='text-sm font-medium capitalize text-gray-800'>
                    {conn.platform}
                  </p>
                  <p
                    className='text-[10px] text-gray-400 truncate w-32 md:w-48'
                    title={conn.ical_url}
                  >
                    {conn.ical_url}
                  </p>
                </div>
              </div>

              <div className='flex items-center gap-3'>
                {/* ESTADO DE LA CONEXIÓN */}
                <div className='text-right'>
                  {conn.sync_status === 'success' ? (
                    <span className='flex items-center gap-1 text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100'>
                      <FaCheckCircle size={10} /> Activo
                    </span>
                  ) : conn.sync_status === 'error' ? (
                    <span
                      className='flex items-center gap-1 text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100'
                      title={conn.error_message}
                    >
                      <FaExclamationTriangle size={10} /> Error
                    </span>
                  ) : (
                    <span className='text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full'>
                      Pendiente
                    </span>
                  )}
                  <p className='text-[10px] text-gray-400 mt-0.5'>
                    {conn.last_sync_at
                      ? new Date(conn.last_sync_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Nunca'}
                  </p>
                </div>

                <button
                  onClick={() => handleDelete(conn.id)}
                  className='text-gray-400 hover:text-red-500 transition p-1'
                  title='Eliminar conexión'
                >
                  <FaTrash size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FORMULARIO PARA AGREGAR NUEVA */}
      <form
        onSubmit={handleAddConnection}
        className='flex gap-2 items-end border-t border-gray-200 pt-4'
      >
        <div className='w-1/3'>
          <label className='block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wide'>
            Plataforma
          </label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className='w-full text-xs md:text-sm border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white py-2'
          >
            <option value='airbnb'>Airbnb</option>
            <option value='booking'>Booking.com</option>
            <option value='despegar'>Despegar</option>
            <option value='expedia'>Expedia / Vrbo</option>
            <option value='other'>Otro</option>
          </select>
        </div>
        <div className='flex-1'>
          <label className='block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wide'>
            Link del Calendario (iCal)
          </label>
          <input
            type='text'
            placeholder='https://...'
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            className='w-full text-xs md:text-sm border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-2'
          />
        </div>
        <button
          type='submit'
          disabled={loading || !newUrl}
          className='bg-slate-900 text-white px-4 py-2 rounded-lg text-xs md:text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md h-[38px]'
        >
          Agregar
        </button>
      </form>
    </div>
  );
};
