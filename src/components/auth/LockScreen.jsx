// src/components/auth/LockScreen.jsx
import React from 'react';
import { AlertTriangle, MessageCircle } from 'lucide-react';

const LockScreen = ({ hotelName, reason }) => (
  <div className='fixed inset-0 bg-[#2C2C2C] z-50 flex flex-col items-center justify-center text-white p-6 text-center'>
    <div className='bg-red-500/20 p-6 rounded-full mb-6 animate-pulse'>
      <AlertTriangle
        size={64}
        className='text-red-500'
      />
    </div>
    <h1 className='text-4xl font-serif font-bold mb-4'>Acceso Restringido</h1>
    <p className='text-xl text-gray-300 max-w-md mb-8'>
      {reason === 'suspended'
        ? `El servicio para ${hotelName} ha sido suspendido temporalmente.`
        : `El periodo de prueba de ${hotelName} ha finalizado.`}
    </p>
    <div className='bg-white/10 p-6 rounded-xl border border-white/20 max-w-sm w-full'>
      <p className='text-sm text-gray-400 mb-4'>
        Para reactivar el servicio inmediatamente:
      </p>
      <button
        onClick={() =>
          window.open(
            'https://wa.me/573213795015?text=Hola,%20quiero%20reactivar%20mi%20servicio',
            '_blank'
          )
        }
        className='w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2'
      >
        <MessageCircle size={20} /> Contactar Soporte
      </button>
    </div>
    <p className='mt-8 text-xs text-gray-500'>ID del Hotel: {hotelName}</p>
  </div>
);

export default LockScreen;
