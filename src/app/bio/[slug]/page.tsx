import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import { MessageCircle, Calendar, MapPin, Star } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function BioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: hotel } = await supabase
    .from('hotels')
    .select('*, rooms(*)')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (!hotel) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hospedasuite.com';
  const bookingUrl = `${baseUrl}/book/${slug}`;
  const whatsappUrl = hotel.whatsapp_number
    ? `https://wa.me/${hotel.whatsapp_number.replace(/[^0-9]/g, '')}?text=Hola%2C%20quiero%20reservar%20en%20${encodeURIComponent(hotel.name)}`
    : null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white px-4 py-8 pb-20">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          {hotel.main_image_url && (
            <img
              src={hotel.main_image_url}
              alt={hotel.name}
              className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4 border-white shadow-lg"
            />
          )}
          <h1 className="text-2xl font-bold text-gray-900">{hotel.name}</h1>
          {hotel.tagline && <p className="text-gray-500 mt-1">{hotel.tagline}</p>}
          {hotel.city && (
            <div className="flex items-center justify-center gap-1 mt-2 text-gray-400 text-sm">
              <MapPin size={14} />
              <span>{hotel.city}</span>
            </div>
          )}
          {hotel.stars && (
            <div className="flex items-center justify-center gap-0.5 mt-1 text-amber-400">
              {[...Array(hotel.stars)].map((_, i) => (
                <Star key={i} size={14} fill="currentColor" />
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 mb-8">
          <a
            href={bookingUrl}
            className="block w-full bg-brand-600 text-white text-center py-4 rounded-2xl font-bold text-lg shadow-lg shadow-brand-500/20 active:scale-95 transition-transform"
          >
            <div className="flex items-center justify-center gap-2">
              <Calendar size={20} />
              Reservar Ahora
            </div>
          </a>

          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-green-500 text-white text-center py-4 rounded-2xl font-bold text-lg shadow-lg shadow-green-500/20 active:scale-95 transition-transform"
            >
              <div className="flex items-center justify-center gap-2">
                <MessageCircle size={20} />
                WhatsApp Directo
              </div>
            </a>
          )}
        </div>

        {/* Quick Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-bold text-gray-900">Información</h2>
          {hotel.description && (
            <p className="text-gray-600 text-sm leading-relaxed">{hotel.description}</p>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {hotel.check_in_time && (
              <div>
                <p className="text-gray-400 text-xs">Check-in</p>
                <p className="font-medium text-gray-900">{hotel.check_in_time}</p>
              </div>
            )}
            {hotel.check_out_time && (
              <div>
                <p className="text-gray-400 text-xs">Check-out</p>
                <p className="font-medium text-gray-900">{hotel.check_out_time}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-400 text-xs">
          <p>Motor de Reservas Propio · 0% Comisión</p>
          <p className="mt-1">Powered by HospedaSuite</p>
        </div>
      </div>
    </main>
  );
}
