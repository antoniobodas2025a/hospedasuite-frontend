import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Check, X, Clock, Star, Mail, MapPin } from 'lucide-react';
import { approveReviewAction, rejectReviewAction, getPendingReviewsAction } from '@/app/actions/admin-reviews';

export const dynamic = 'force-dynamic';

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} dias`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
  return `Hace ${Math.floor(diffDays / 30)} meses`;
}

export default async function AdminReviewsPage() {
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getPendingReviewsAction();
  const reviews = result.success ? result.data : [];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Clock size={24} className="text-brand-500" />
          Moderacion de Resenas
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {reviews.length} resena{reviews.length !== 1 ? 's' : ''} pendiente{reviews.length !== 1 ? 's' : ''} de revision
        </p>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-card rounded-[var(--radius-squircle-2xl)] p-12 text-center border border-border">
          <Clock size={48} className="text-muted-foreground/30 mx-auto mb-4" strokeWidth={1} />
          <h3 className="text-lg font-bold text-foreground mb-2">No hay resenas pendientes</h3>
          <p className="text-sm text-muted-foreground">
            Todas las resenas han sido revisadas. Vuelve mas tarde para verificar nuevas opiniones.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review: any) => {
            const hotelsData = review.hotels as { name: string }[] | { name: string } | null;
            const hotelName = Array.isArray(hotelsData)
              ? hotelsData[0]?.name
              : hotelsData?.name;

            return (
            <div key={review.id} className="bg-card rounded-[var(--radius-squircle-2xl)] p-6 border border-border shadow-sm">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-gradient-to-br from-brand-500 to-warm-600 flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {review.guest_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{review.guest_name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {review.guest_location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} /> {review.guest_location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Mail size={12} /> {review.guest_email}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <Star size={14} className="fill-warm-400 text-warm-400" />
                    <span className="font-bold text-foreground">{review.rating}/5</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{timeAgo(review.created_at)}</p>
                </div>
              </div>

              {/* Hotel name */}
              <div className="mb-3">
                <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-[var(--radius-squircle-md)]">
                  {hotelName || 'Hotel desconocido'}
                </span>
                {review.stay_date && (
                  <span className="text-xs text-muted-foreground ml-2">
                    Estadia: {new Date(review.stay_date).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                  </span>
                )}
              </div>

              {/* Comment */}
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 p-3 bg-muted/30 rounded-[var(--radius-squircle-lg)]">
                {review.comment}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <form action={async () => {
                  'use server';
                  await approveReviewAction(review.id);
                }}>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2.5 bg-secondary/10 hover:bg-secondary/20 text-secondary font-bold text-sm rounded-[var(--radius-squircle-lg)] transition-all border border-secondary/20"
                  >
                    <Check size={16} /> Aprobar
                  </button>
                </form>
                <form action={async () => {
                  'use server';
                  await rejectReviewAction(review.id);
                }}>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2.5 bg-destructive/10 hover:bg-destructive/20 text-destructive font-bold text-sm rounded-[var(--radius-squircle-lg)] transition-all border border-destructive/20"
                  >
                    <X size={16} /> Rechazar
                  </button>
                </form>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
