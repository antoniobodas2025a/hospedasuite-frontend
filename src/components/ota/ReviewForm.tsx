'use client';

import React, { useState, useTransition } from 'react';
import { Star, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { submitReviewAction } from '@/app/actions/ota';

interface ReviewFormProps {
  hotelId: string;
  hotelName: string;
}

export default function ReviewForm({ hotelId, hotelName }: ReviewFormProps) {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestLocation, setGuestLocation] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [stayDate, setStayDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!guestName.trim() || !guestEmail.trim() || !comment.trim() || rating === 0) {
      setError('Por favor completa todos los campos obligatorios y selecciona una calificacion.');
      return;
    }

    if (comment.length > 2000) {
      setError('El comentario no puede superar los 2000 caracteres.');
      return;
    }

    startTransition(async () => {
      const result = await submitReviewAction({
        hotelId,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
        guestLocation: guestLocation.trim() || undefined,
        rating,
        comment: comment.trim(),
        stayDate: stayDate || undefined,
      });

      if (result.success) {
        setSubmitted(true);
      } else {
        setError(result.error || 'Error al enviar la opinion. Intenta de nuevo.');
      }
    });
  };

  if (submitted) {
    return (
      <div className="bg-card/60 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-sm border border-border/40 text-center">
        <CheckCircle2 size={48} className="text-secondary mx-auto mb-4" />
        <h3 className="text-xl font-bold text-foreground mb-2">Gracias por tu opinion!</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Tu resena sobre {hotelName} sera publicada despues de verificacion. Esto nos ayuda a mantener la calidad de las opiniones.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card/60 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-sm border border-border/40">
      <h3 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
        <Star size={18} className="fill-warm-400 text-warm-400" />
        Comparte tu experiencia
      </h3>
      <p className="text-xs text-muted-foreground mb-6">
        Tu opinion ayuda a otros viajeros a elegir. Sera publicada despues de verificacion.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Rating stars */}
        <div>
          <label className="text-sm font-bold text-foreground mb-2 block">Tu calificacion</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                className="p-0.5 transition-transform hover:scale-110"
              >
                <Star
                  size={28}
                  className={
                    star <= (hoverRating || rating)
                      ? 'fill-warm-400 text-warm-400'
                      : 'text-muted-foreground/20'
                  }
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-3 text-sm font-medium text-foreground">
                {['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'][rating]}
              </span>
            )}
          </div>
        </div>

        {/* Name + Email row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="review-name" className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">
              Nombre
            </label>
            <input
              id="review-name"
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Como te llamas?"
              className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/60 transition-all"
              required
            />
          </div>
          <div>
            <label htmlFor="review-email" className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">
              Email
            </label>
            <input
              id="review-email"
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/60 transition-all"
              required
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label htmlFor="review-location" className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">
            Ubicacion (opcional)
          </label>
          <input
            id="review-location"
            type="text"
            value={guestLocation}
            onChange={(e) => setGuestLocation(e.target.value)}
            placeholder="Bogota, Colombia"
            className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/60 transition-all"
          />
        </div>

        {/* Stay date */}
        <div>
          <label htmlFor="review-stay-date" className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">
            Fecha de estadia (opcional)
          </label>
          <input
            id="review-stay-date"
            type="date"
            value={stayDate}
            onChange={(e) => setStayDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/60 transition-all"
          />
        </div>

        {/* Comment */}
        <div>
          <label htmlFor="review-comment" className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">
            Tu experiencia
          </label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Que te parecio el hotel? Que destacarias?"
            rows={4}
            maxLength={2000}
            className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/60 transition-all resize-none"
            required
          />
          <p className="text-[10px] text-muted-foreground/50 mt-1 text-right">
            {comment.length}/2000
          </p>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm text-destructive font-medium">{error}</p>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-primary hover:bg-brand-700 text-primary-foreground font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-md shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isPending ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Enviando...
            </>
          ) : (
            <>
              Enviar Opinion <Send size={16} strokeWidth={2.5} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
