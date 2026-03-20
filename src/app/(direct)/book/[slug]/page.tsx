import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { Calendar, Users, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

// 1. DEFINICIÓN DE PROMESA (Next.js 15 Standard)
interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function DirectBookingPage({ params }: PageProps) {
  // 2. DESEMPAQUETADO ASÍNCRONO
  const { slug } = await params;

  // 3. CONSULTA SEGURA (Solo columnas públicas)
  const { data: hotel } = await supabase
    .from('hotels')
    .select('id, name, primary_color, logo_url, slug')
    .eq('slug', slug)
    .single();

  if (!hotel)
    return (
      <div className='p-10 text-center font-bold text-slate-500'>
        Hotel no encontrado o enlace expirado.
      </div>
    );

  // 4. INVENTARIO DISPONIBLE
  const { data: rooms } = await supabase
    .from('rooms')
    .select('*')
    .eq('hotel_id', hotel.id)
    .eq('status', 'available');

  return (
    <div className='min-h-screen flex flex-col'>
      {/* HEADER */}
      <header className='bg-white border-b border-slate-100 sticky top-0 z-50'>
        <div className='max-w-5xl mx-auto px-6 py-4 flex justify-between items-center'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 relative bg-slate-50 rounded-lg overflow-hidden'>
              <Image
                src='/logo.png'
                alt={hotel.name}
                fill
                className='object-contain p-1'
                sizes='(max-width: 768px) 100vw, 33vw'
              />
            </div>
            <div>
              <h1 className='font-display font-bold text-slate-800 text-lg leading-none'>
                {hotel.name}
              </h1>
              <p className='text-xs text-slate-400 font-medium'>
                Reserva Directa Oficial
              </p>
            </div>
          </div>
          <div className='flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs font-bold'>
            <ShieldCheck size={14} /> Mejor Precio Garantizado
          </div>
        </div>
      </header>

      {/* BODY */}
      <main className='flex-1 max-w-5xl mx-auto w-full px-6 py-10'>
        {/* BUSCADOR */}
        <div className='bg-slate-50 p-6 rounded-[2rem] mb-10 flex flex-col md:flex-row gap-4 items-center border border-slate-100'>
          <div className='flex-1 w-full space-y-1'>
            <label className='text-xs font-bold text-slate-400 uppercase ml-2'>
              Fechas
            </label>
            <div className='bg-white p-3 rounded-xl flex items-center gap-2 shadow-sm'>
              <Calendar
                size={18}
                className='text-slate-400'
              />
              <span className='text-sm font-bold text-slate-700'>
                Seleccionar Fechas...
              </span>
            </div>
          </div>
          <div className='w-full md:w-48 space-y-1'>
            <label className='text-xs font-bold text-slate-400 uppercase ml-2'>
              Huéspedes
            </label>
            <div className='bg-white p-3 rounded-xl flex items-center gap-2 shadow-sm'>
              <Users
                size={18}
                className='text-slate-400'
              />
              <span className='text-sm font-bold text-slate-700'>
                2 Adultos
              </span>
            </div>
          </div>
          <button
            style={{ backgroundColor: hotel.primary_color || '#000' }}
            className='w-full md:w-auto px-8 py-4 rounded-xl text-white font-bold shadow-lg mt-5 md:mt-0 hover:opacity-90 transition-opacity'
          >
            Actualizar
          </button>
        </div>

        {/* GRID HABITACIONES */}
        <div className='grid grid-cols-1 gap-6'>
          {rooms?.map((room) => (
            <div
              key={room.id}
              className='bg-white rounded-[2rem] border border-slate-100 p-6 flex flex-col md:flex-row gap-6 hover:shadow-lg transition-all'
            >
              <div className='w-full md:w-64 h-48 bg-slate-200 rounded-2xl relative overflow-hidden shrink-0'>
                <Image
                  src={
                    room.image_url ||
                    'https://images.unsplash.com/photo-1590490360182-f33efe29a79d?q=80&w=2074&auto=format&fit=crop'
                  }
                  alt={room.name}
                  fill
                  className='object-cover'
                  sizes='(max-width: 768px) 100vw, 33vw'
                />
              </div>

              <div className='flex-1 flex flex-col'>
                <div className='flex justify-between items-start mb-2'>
                  <h3 className='text-xl font-bold text-slate-800'>
                    {room.name}
                  </h3>
                  <span className='bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-[10px] font-bold uppercase'>
                    Tarifa Directa
                  </span>
                </div>
                <p className='text-sm text-slate-500 line-clamp-2 mb-4'>
                  {room.description || 'Disfruta de una estancia relajante.'}
                </p>

                <div className='mt-auto flex items-end justify-between border-t border-slate-50 pt-4'>
                  <div>
                    <p className='text-xs text-slate-400 font-bold uppercase line-through decoration-red-400'>
                      ${(room.price * 1.15).toLocaleString()}
                    </p>
                    <p className='text-2xl font-display font-bold text-slate-800'>
                      ${room.price.toLocaleString()}
                    </p>
                  </div>
                  {/* 5. LINK DE RESERVA SEGURO */}
                  <Link
                    href={`/book/${hotel.slug}/checkout?room=${room.id}`}
                    style={{ backgroundColor: hotel.primary_color || '#000' }}
                    className='px-6 py-3 rounded-xl text-white font-bold flex items-center gap-2 shadow-md hover:scale-105 transition-transform'
                  >
                    Reservar Ahora <ArrowRight size={18} />
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {(!rooms || rooms.length === 0) && (
            <div className='text-center py-10 text-slate-400'>
              No hay habitaciones disponibles en este momento.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
