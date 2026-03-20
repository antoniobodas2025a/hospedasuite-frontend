'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Users,
  ArrowRight,
  Star,
  MapPin,
  Wifi,
  Coffee,
  Phone,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

// Tipos
interface Room {
  id: string;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
  status: string;
}

interface HotelInfo {
  name: string;
  address: string;
  phone: string;
  primary_color: string;
  logo_url?: string;
}

const HomeLanding = ({ hotel, rooms }: { hotel: HotelInfo; rooms: Room[] }) => {
  const [search, setSearch] = useState({
    checkIn: '',
    checkOut: '',
    guests: 2,
  });

  return (
    <div className='min-h-screen bg-slate-50 font-sans'>
      {/* 1. NAVBAR TRANSPARENTE */}
      <nav className='absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-center max-w-7xl mx-auto'>
        <div className='flex items-center gap-3'>
          {/* Logo Dinámico */}
          <div className='w-10 h-10 relative bg-white/20 backdrop-blur-md rounded-xl overflow-hidden shadow-lg'>
            <Image
              src='/logo.png'
              alt='Logo'
              fill
              className='object-cover p-1'
              sizes='(max-width: 768px) 100vw, 33vw'
            />
          </div>
          <span className='font-display font-bold text-white text-xl tracking-tight text-shadow-sm'>
            {hotel.name}
          </span>
        </div>
        <Link
          href='/dashboard'
          className='px-6 py-2 bg-white/10 backdrop-blur-md text-white font-bold rounded-full text-sm border border-white/20 hover:bg-white hover:text-slate-900 transition-all'
        >
          Soy Propietario
        </Link>
      </nav>

      {/* 2. HERO SECTION IMPONENTE */}
      {/* CORRECCIÓN: Quitamos 'overflow-hidden' de aquí para que el buscador pueda salirse */}
      <header className='relative h-[80vh] flex items-center justify-center'>
        {/* Fondo Oscuro con Imagen - Aquí sí ponemos overflow-hidden y rounded para contener la imagen */}
        <div className='absolute inset-0 z-0 overflow-hidden rounded-b-[3rem]'>
          <Image
            src='https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2070&auto=format&fit=crop'
            alt='Hero Hotel'
            fill
            className='object-cover brightness-50'
            priority
            sizes='100vw'
          />
        </div>

        <div className='relative z-10 text-center px-4 max-w-4xl mx-auto space-y-6'>
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className='inline-block px-4 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-widest border border-white/10'
          >
            Bienvenido al Paraíso
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className='text-5xl md:text-7xl font-display font-bold text-white leading-tight'
          >
            {hotel.name}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className='text-lg md:text-xl text-slate-200 max-w-2xl mx-auto font-light'
          >
            Experimenta el lujo y la comodidad en el corazón de{' '}
            {hotel.address?.split(',')[0] || 'la ciudad'}. Tu escape perfecto
            comienza aquí.
          </motion.p>
        </div>

        {/* 3. WIDGET DE BÚSQUEDA FLOTANTE */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className='absolute -bottom-16 left-0 right-0 z-20 px-4'
        >
          <div className='max-w-5xl mx-auto bg-white rounded-[2.5rem] p-4 shadow-2xl flex flex-col md:flex-row gap-4 items-center border border-slate-100'>
            <div className='flex-1 w-full flex items-center gap-4 px-6 py-2 border-b md:border-b-0 md:border-r border-slate-100'>
              <div className='p-3 bg-blue-50 text-blue-600 rounded-full'>
                <Calendar size={20} />
              </div>
              <div>
                <p className='text-xs font-bold text-slate-400 uppercase'>
                  Llegada
                </p>
                <input
                  type='date'
                  className='font-bold text-slate-800 outline-none bg-transparent w-full'
                  onChange={(e) =>
                    setSearch({ ...search, checkIn: e.target.value })
                  }
                />
              </div>
            </div>

            <div className='flex-1 w-full flex items-center gap-4 px-6 py-2 border-b md:border-b-0 md:border-r border-slate-100'>
              <div className='p-3 bg-blue-50 text-blue-600 rounded-full'>
                <Calendar size={20} />
              </div>
              <div>
                <p className='text-xs font-bold text-slate-400 uppercase'>
                  Salida
                </p>
                <input
                  type='date'
                  className='font-bold text-slate-800 outline-none bg-transparent w-full'
                  onChange={(e) =>
                    setSearch({ ...search, checkOut: e.target.value })
                  }
                />
              </div>
            </div>

            <div className='flex-1 w-full flex items-center gap-4 px-6 py-2'>
              <div className='p-3 bg-blue-50 text-blue-600 rounded-full'>
                <Users size={20} />
              </div>
              <div>
                <p className='text-xs font-bold text-slate-400 uppercase'>
                  Huéspedes
                </p>
                <select
                  className='font-bold text-slate-800 outline-none bg-transparent w-full'
                  onChange={(e) =>
                    setSearch({ ...search, guests: Number(e.target.value) })
                  }
                >
                  <option value='1'>1 Persona</option>
                  <option value='2'>2 Personas</option>
                  <option value='4'>Familias</option>
                </select>
              </div>
            </div>

            <button
              style={{ backgroundColor: hotel.primary_color || '#000' }}
              className='w-full md:w-auto px-8 py-5 rounded-[2rem] text-white font-bold text-lg shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2'
            >
              Buscar <ArrowRight size={20} />
            </button>
          </div>
        </motion.div>
      </header>

      {/* 4. LISTADO DE HABITACIONES */}
      <section className='pt-32 pb-20 px-4 max-w-7xl mx-auto'>
        <div className='text-center mb-16 space-y-2'>
          <h2 className='text-3xl md:text-4xl font-display font-bold text-slate-800'>
            Nuestras Estancias
          </h2>
          <p className='text-slate-500'>
            Espacios diseñados para tu descanso absoluto.
          </p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
          {rooms.map((room) => (
            <div
              key={room.id}
              className='group bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full'
            >
              {/* Imagen Habitación */}
              <div className='h-64 relative overflow-hidden bg-slate-200'>
                <Image
                  src={
                    room.image_url ||
                    'https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=2070&auto=format&fit=crop'
                  }
                  alt={room.name}
                  fill
                  className='object-cover group-hover:scale-110 transition-transform duration-500'
                  sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
                />
                <div className='absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-slate-800 flex items-center gap-1 shadow-sm'>
                  <Star
                    size={12}
                    className='text-amber-400 fill-amber-400'
                  />{' '}
                  4.9
                </div>
              </div>

              {/* Contenido */}
              <div className='p-8 flex-1 flex flex-col'>
                <h3 className='text-xl font-bold text-slate-800 mb-2'>
                  {room.name}
                </h3>
                <p className='text-sm text-slate-500 leading-relaxed mb-6 flex-1'>
                  {room.description ||
                    'Una habitación cómoda con todas las amenidades necesarias para una estancia inolvidable.'}
                </p>

                {/* Amenities Rápidos */}
                <div className='flex gap-4 mb-6 text-slate-400'>
                  <div className='flex items-center gap-1 text-xs font-bold bg-slate-50 px-2 py-1 rounded-lg'>
                    <Wifi size={14} /> WiFi
                  </div>
                  <div className='flex items-center gap-1 text-xs font-bold bg-slate-50 px-2 py-1 rounded-lg'>
                    <Coffee size={14} /> Café
                  </div>
                </div>

                {/* Footer Tarjeta */}
                <div className='flex items-end justify-between pt-6 border-t border-slate-50'>
                  <div>
                    <p className='text-xs text-slate-400 font-bold uppercase'>
                      Desde
                    </p>
                    <p className='text-2xl font-display font-bold text-slate-800'>
                      ${Number(room.price).toLocaleString()}
                      <span className='text-sm text-slate-400 font-medium'>
                        /noche
                      </span>
                    </p>
                  </div>
                  <Link
                    href={`/book/${hotel.name.toLowerCase().replace(/\s+/g, '-')}/checkout?room=${room.id}`}
                    className='w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-hospeda-600 transition-colors shadow-lg'
                    aria-label='Reservar'
                  >
                    <ArrowRight size={20} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className='bg-slate-900 text-white pt-20 pb-10 px-4'>
        <div className='max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16'>
          <div className='col-span-2 space-y-6'>
            <h4 className='text-3xl font-display font-bold'>{hotel.name}</h4>
            <p className='text-slate-400 max-w-sm'>
              La plataforma de hospitalidad moderna. Gestiona, automatiza y
              crece con nosotros.
            </p>
          </div>
          <div>
            <h5 className='font-bold mb-6 text-slate-200'>Contacto</h5>
            <ul className='space-y-4 text-slate-400 text-sm'>
              <li className='flex items-center gap-2'>
                <MapPin size={16} /> {hotel.address || 'Sin dirección'}
              </li>
              <li className='flex items-center gap-2'>
                <Phone size={16} /> {hotel.phone || 'Sin teléfono'}
              </li>
            </ul>
          </div>
          <div>
            <h5 className='font-bold mb-6 text-slate-200'>Legal</h5>
            <ul className='space-y-4 text-slate-400 text-sm'>
              <li className='hover:text-white cursor-pointer'>
                Términos y Condiciones
              </li>
              <li className='hover:text-white cursor-pointer'>
                Política de Privacidad
              </li>
            </ul>
          </div>
        </div>
        <div className='border-t border-slate-800 pt-10 text-center text-slate-500 text-xs font-bold uppercase tracking-widest'>
          © 2026 HospedaSuite Platform. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
};

export default HomeLanding;
