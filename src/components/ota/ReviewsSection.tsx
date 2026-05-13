import { Star, Quote, ThumbsUp } from 'lucide-react';
import { getApprovedReviewsAction, getReviewStatsAction } from '@/app/actions/ota';
import { SectionHeader } from '@/components/ui/glass';

// ============================================================================
// REVIEWS SECTION — Real guest reviews from database
//
// Fetches approved reviews and stats from Supabase.
// Falls back to "be the first" message when no reviews exist.
// ============================================================================

interface ReviewsSectionProps {
  hotelId: string;
  hotelName: string;
}

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={star <= rating ? 'fill-warm-400 text-warm-400' : 'text-muted-foreground/20'}
        />
      ))}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} dias`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
  if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`;
  return `Hace ${Math.floor(diffDays / 365)} ano(s)`;
}

export default async function ReviewsSection({ hotelId, hotelName }: ReviewsSectionProps) {
  const [reviewsResult, statsResult] = await Promise.all([
    getApprovedReviewsAction(hotelId),
    getReviewStatsAction(hotelId),
  ]);

  const reviews = reviewsResult.success ? reviewsResult.data : [];
  const stats = statsResult.success && statsResult.data
    ? statsResult.data
    : { overall: 0, total: 0, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };

  // No reviews yet
  if (reviews.length === 0) {
    return (
      <div className="glass-card p-6 md:p-8 text-center">
        <Star size={48} className="text-muted-foreground/30 mx-auto mb-4" strokeWidth={1} />
        <h2 className="text-xl font-bold text-foreground mb-2">Aun no hay opiniones</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Se el primero en compartir tu experiencia en {hotelName}. Tu opinion ayuda a otros viajeros a elegir.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 md:p-8">
      {/* Header — rating summary row */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <SectionHeader
          title="Opiniones de Huespedes"
          subtitle={`${stats.total} resenas verificadas`}
          className="mb-0"
        />
        <div className="flex items-center gap-3">
          <span className="text-4xl font-black text-foreground">{stats.overall}</span>
          <div>
            <StarRating rating={Math.round(stats.overall)} size={16} />
            <p className="text-xs text-muted-foreground mt-0.5">de {stats.total} reviews</p>
          </div>
        </div>
      </div>

      {/* Breakdown por categoria */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {[
          { label: 'Excelente', count: stats.breakdown[5] },
          { label: 'Muy bueno', count: stats.breakdown[4] },
          { label: 'Regular', count: stats.breakdown[3] },
          { label: 'Malo', count: stats.breakdown[2] },
          { label: 'Pesimo', count: stats.breakdown[1] },
        ].map((item) => (
          <div key={item.label} className="bg-muted/50 rounded-[var(--radius-squircle-lg)] p-3 text-center border border-border/40">
            <p className="text-lg font-bold text-foreground">{item.count}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Barra de distribucion */}
      <div className="space-y-1.5 mb-8">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = stats.breakdown[star as keyof typeof stats.breakdown] || 0;
          const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
          return (
            <div key={star} className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground w-8">{star}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-warm-400 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground/60 w-8 text-right">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="h-px bg-border/40 mb-8" />

      {/* Reviews individuales */}
      <div className="space-y-6">
        {reviews.map((review: {
          id: string;
          guest_name: string;
          guest_location: string | null;
          rating: number;
          comment: string;
          stay_date: string | null;
          created_at: string;
        }) => (
          <div key={review.id} className="pb-6 border-b border-border/40 last:border-0 last:pb-0">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-gradient-to-br from-brand-500 to-warm-600 flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {review.guest_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">{review.guest_name}</p>
                  {review.guest_location && (
                    <p className="text-xs text-muted-foreground">{review.guest_location}</p>
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground/60">{timeAgo(review.created_at)}</span>
            </div>

            <div className="mb-2">
              <StarRating rating={review.rating} />
            </div>

            <div className="relative">
              <Quote size={14} className="absolute -top-1 -left-1 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground leading-relaxed pl-4">{review.comment}</p>
            </div>

            {review.stay_date && (
              <p className="text-[11px] text-muted-foreground/50 mt-2">
                Estadia: {new Date(review.stay_date).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </p>
            )}

            <div className="flex items-center gap-2 mt-3">
              <button className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-brand-600 transition-colors">
                <ThumbsUp size={12} /> Util
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-8 pt-6 border-t border-border/40 text-center">
        <p className="text-xs text-muted-foreground italic">
          Las resenas son de huespedes verificados que se alojaron en {hotelName}.
        </p>
      </div>
    </div>
  );
}
