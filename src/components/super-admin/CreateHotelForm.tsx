'use client';
import { Activity } from 'lucide-react';
import { createHotelAction } from '@/app/actions/super-admin';

export default function CreateHotelForm() {
  return (
    <form action={createHotelAction} className='grid grid-cols-1 md:grid-cols-5 gap-4 items-end'>
      <div className='space-y-2'>
        <label className='text-xs font-bold text-white/50 uppercase ml-2'>Hotel</label>
        <input name='name' required placeholder='Ej: Hotel Alpha' className='w-full bg-black/40 border border-white/10 rounded-[var(--radius-squircle-lg)] p-3 text-white outline-none focus:border-emerald-500/50' />
      </div>
      <div className='space-y-2'>
        <label className='text-xs font-bold text-white/50 uppercase ml-2'>Email Dueño</label>
        <input name='email' type='email' required placeholder='admin@hotel.com' className='w-full bg-black/40 border border-white/10 rounded-[var(--radius-squircle-lg)] p-3 text-white outline-none focus:border-emerald-500/50' />
      </div>
      <div className='space-y-2'>
        <label className='text-xs font-bold text-white/50 uppercase ml-2'>Contraseña</label>
        <input name='password' type='text' required placeholder='Clave segura...' className='w-full bg-black/40 border border-white/10 rounded-[var(--radius-squircle-lg)] p-3 text-white outline-none focus:border-emerald-500/50' />
      </div>
      <div className='space-y-2'>
        <label className='text-xs font-bold text-white/50 uppercase ml-2'>Plan (SaaS Bundling)</label>
        <select name='plan' className='w-full bg-black/40 border border-white/10 rounded-[var(--radius-squircle-lg)] p-3 text-white outline-none focus:border-emerald-500/50 cursor-pointer'>
          <option value='micro' className='text-black'>Micro (59.9k)</option>
          <option value='standard' className='text-black'>Estándar (99.9k)</option>
          <option value='pro' className='text-black'>Pro (189.9k)</option>
        </select>
      </div>
      <button type='submit' className='w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-[var(--radius-squircle-lg)] transition-all shadow-lg shadow-emerald-900/20 flex justify-center items-center gap-2'>
        <Activity size={18} /> Crear Propiedad
      </button>
    </form>
  );
}
