/**
 * Hotel Ranking Algorithm — Weighted Multi-Criteria Decision Analysis (MCDA)
 *
 * Score(h) = Σ(wᵢ × fᵢ(h))  donde Σwᵢ = 1.0
 *
 * Weights:
 *   - Availability:    0.35 (logistic S-curve)
 *   - Reviews:         0.25 (rating × log confidence)
 *   - Price relevance: 0.20 (Gaussian around median)
 *   - Text match:      0.20 (exact > partial > fuzzy)
 *
 * Academic basis: Belton & Stewart (2002), Wilson score, Prospect Theory
 */

export interface ScorableHotel {
  id: string;
  name: string;
  location: string;
  min_price: number;
  description?: string;
  reviewStats?: { averageRating: number; totalReviews: number };
  availableRooms?: number;
  totalRooms?: number;
}

export interface RankingContext {
  checkIn?: string;
  checkOut?: string;
  query?: string;
  maxReviews?: number;
  medianPrice?: number;
}

// ── Scoring Functions ─────────────────────────────────────────────────────────

/**
 * f₁: Availability score — logistic S-curve
 * Returns 0.5 when no dates provided (neutral).
 * Penalizes heavily when <20% rooms available.
 */
function availabilityScore(hotel: ScorableHotel, checkIn?: string, checkOut?: string): number {
  if (!checkIn || !checkOut) return 0.5;

  const available = hotel.availableRooms ?? 0;
  const total = hotel.totalRooms ?? 1;
  const ratio = available / total;

  // Logistic: 1 / (1 + e^(-k(r - threshold)))
  const k = 10;
  const threshold = 0.2;
  return 1 / (1 + Math.exp(-k * (ratio - threshold)));
}

/**
 * f₂: Review score — rating normalized × log confidence
 * Hotels with 0 reviews get partial credit (not zeroed out).
 */
function reviewScore(hotel: ScorableHotel, maxReviews: number): number {
  const rating = hotel.reviewStats?.averageRating ?? 0;
  const reviews = hotel.reviewStats?.totalReviews ?? 0;

  const ratingNorm = rating / 5; // Normalize to [0, 1]
  const maxLog = Math.log10(maxReviews + 1);
  const confidence = maxLog > 0 ? Math.log10(reviews + 1) / maxLog : 0;

  return ratingNorm * Math.min(confidence, 1);
}

/**
 * f₃: Price relevance — Gaussian distribution around median
 * Hotels near the median price score highest.
 * Extremes (too cheap or too expensive) are penalized.
 */
function priceRelevance(hotel: ScorableHotel, medianPrice: number): number {
  const price = hotel.min_price || 0;
  if (medianPrice <= 0) return 0.5; // Neutral if no median

  const sigma = medianPrice * 0.5; // Standard deviation = 50% of median
  const z = (price - medianPrice) / sigma;
  return Math.exp(-0.5 * z * z); // Gaussian
}

/**
 * f₄: Text match — hierarchical matching
 * Exact name match > location match > description match > fuzzy token overlap
 */
function textMatchScore(hotel: ScorableHotel, query?: string): number {
  if (!query || query.trim() === '') return 0.5; // Neutral

  const q = query.toLowerCase().trim();
  const name = (hotel.name || '').toLowerCase();
  const location = (hotel.location || '').toLowerCase();
  const desc = (hotel.description || '').toLowerCase();

  // Exact substring match (highest priority)
  if (name.includes(q)) return 1.0;
  if (location.includes(q)) return 0.8;
  if (desc.includes(q)) return 0.6;

  // Fuzzy: token overlap
  const tokens = q.split(/\s+/).filter(t => t.length > 2);
  if (tokens.length === 0) return 0.3;

  const allText = `${name} ${location} ${desc}`;
  const matches = tokens.filter(t => allText.includes(t)).length;
  return 0.3 * (matches / tokens.length);
}

// ── Main Ranking Function ─────────────────────────────────────────────────────

// Weights (sum = 1.0)
const W_AVAILABILITY = 0.35;
const W_REVIEWS = 0.25;
const W_PRICE = 0.20;
const W_TEXT = 0.20;

export function rankHotels(
  hotels: ScorableHotel[],
  context: RankingContext
): ScorableHotel[] {
  if (hotels.length === 0) return [];

  const { checkIn, checkOut, query, maxReviews = 50, medianPrice = 100000 } = context;

  // Compute median price from hotels if not provided
  const effectiveMedianPrice = medianPrice > 0
    ? medianPrice
    : computeMedian(hotels.map(h => h.min_price || 0));

  const effectiveMaxReviews = maxReviews > 0
    ? maxReviews
    : Math.max(...hotels.map(h => h.reviewStats?.totalReviews ?? 0), 1);

  // Score each hotel (immutable — create new array)
  const scored = hotels.map(hotel => ({
    hotel,
    score:
      W_AVAILABILITY * availabilityScore(hotel, checkIn, checkOut) +
      W_REVIEWS * reviewScore(hotel, effectiveMaxReviews) +
      W_PRICE * priceRelevance(hotel, effectiveMedianPrice) +
      W_TEXT * textMatchScore(hotel, query),
  }));

  // Sort by score descending (stable sort preserves original order for ties)
  scored.sort((a, b) => b.score - a.score);

  return scored.map(s => s.hotel);
}

/**
 * Compute median of an array of numbers.
 */
function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ── Diversity Constraint ──────────────────────────────────────────────────────

/**
 * applyDiversity — Round-robin interleaving by category/type.
 *
 * Ensures no more than `maxPerCategory` hotels of the same type appear
 * consecutively in the result list. Preserves relative ranking within each
 * category queue. When the constraint can no longer be satisfied, remaining
 * hotels are flushed in their original order.
 *
 * @param hotels  Ranked hotels (highest score first).
 * @param maxPerCategory  Max consecutive hotels of same category (default 2).
 * @returns Diversity-ordered array of same length.
 */
export function applyDiversity<T extends { type?: string; category?: string }>(
  hotels: T[],
  maxPerCategory: number = 2,
): T[] {
  if (hotels.length === 0) return [];

  const result: T[] = [];
  const categoryQueues = new Map<string, T[]>();

  // Group by category/type, preserving rank order within each queue
  for (const h of hotels) {
    const key = h.type || h.category || 'other';
    if (!categoryQueues.has(key)) {
      categoryQueues.set(key, []);
    }
    categoryQueues.get(key)!.push(h);
  }

  const categories = Array.from(categoryQueues.keys());
  let lastCategory = '';
  let consecutiveCount = 0;

  while (result.length < hotels.length) {
    let added = false;

    for (const cat of categories) {
      const queue = categoryQueues.get(cat);
      if (!queue || queue.length === 0) continue;

      // Diversity check: no more than maxPerCategory of same category in a row
      if (cat === lastCategory && consecutiveCount >= maxPerCategory) continue;

      const item = queue.shift()!;
      result.push(item);

      if (cat === lastCategory) {
        consecutiveCount++;
      } else {
        lastCategory = cat;
        consecutiveCount = 1;
      }
      added = true;
    }

    if (!added) {
      // Can't satisfy diversity anymore — flush remaining hotels
      for (const cat of categories) {
        const queue = categoryQueues.get(cat);
        while (queue && queue.length > 0) {
          result.push(queue.shift()!);
        }
      }
      break;
    }
  }

  return result;
}
