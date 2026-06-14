'use server';
import { revalidateTag } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function getPendingReviewsAction() {
  try {

    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select('id, hotel_id, guest_name, guest_email, guest_location, rating, comment, stay_date, created_at, hotels(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ADMIN REVIEWS] Error fetching pending reviews:', error.message);
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('[ADMIN REVIEWS] Failed to fetch pending reviews:', message);
    return { success: false, error: message, data: [] };
  }
}

export async function approveReviewAction(reviewId: string) {
  try {

    // Get hotel_id before updating so we can revalidate
    const { data: review } = await supabaseAdmin
      .from('reviews')
      .select('hotel_id')
      .eq('id', reviewId)
      .single();

    const { error } = await supabaseAdmin
      .from('reviews')
      .update({ status: 'approved' })
      .eq('id', reviewId);

    if (error) {
      console.error('[ADMIN REVIEWS] Error approving review:', error.message);
      return { success: false, error: error.message };
    }

// Revalidate the public reviews page for this hotel
    if (review?.hotel_id) {
      revalidateTag(`reviews-${review.hotel_id}`, 'max');
    }

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('[ADMIN REVIEWS] Failed to approve review:', message);
    return { success: false, error: message };
  }
}

export async function rejectReviewAction(reviewId: string) {
  try {

    const { data: review } = await supabaseAdmin
      .from('reviews')
      .select('hotel_id')
      .eq('id', reviewId)
      .single();

    const { error } = await supabaseAdmin
      .from('reviews')
      .update({ status: 'rejected' })
      .eq('id', reviewId);

    if (error) {
      console.error('[ADMIN REVIEWS] Error rejecting review:', error.message);
      return { success: false, error: error.message };
    }

    if (review?.hotel_id) {
      const { revalidateTag } = await import('next/cache');
     revalidateTag(`reviews-${review.hotel_id}`, 'max');
    }

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('[ADMIN REVIEWS] Failed to reject review:', message);
    return { success: false, error: message };
  }
}

/** Form-compatible wrappers for review actions */
export async function approveReviewFormAction(formData: FormData): Promise<void> {
  const id = formData.get('reviewId') as string;
  await approveReviewAction(id);
}

export async function rejectReviewFormAction(formData: FormData): Promise<void> {
  const id = formData.get('reviewId') as string;
  await rejectReviewAction(id);
}
