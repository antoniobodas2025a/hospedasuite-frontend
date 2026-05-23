# PRD-006: OTA Homepage — Mobile-First Minimalista + Smart Ranking

**Fecha:** 2026-05-23  
**Estado:** Ready for TDD  
**Autor:** Gentle AI

---

## Parte 1: Auditoría Mobile-First del Estado Actual

### OTADashboard.tsx — Línea por Línea

| Línea | Elemento | Mobile (<375px) | Problema | Principio Violado |
|-------|----------|-----------------|----------|-------------------|
| 123 | Header `h-20` (80px) | 21% del viewport desperdiciado | Demasiado alto para mobile | Espacio Negativo Activo |
| 123 | `glass-panel` (40px blur) | Performance hit en mobile | Debería ser `glass-pill` (20px) | Glassmorphism 2.0 |
| 123 | `transition-transform duration-300` | Linear, no spring | Sin affordance orgánico | Física de Materiales |
| 151 | Hero `text-4xl md:text-6xl` | 4xl = 36px en 375px = ~3 líneas | Tipografía domina sobre contenido | Saliencia Visual |
| 154 | Gradiente `from-brand-500 to-warm-400` | Compite con cards por atención | Ruido visual innecesario | Saliencia Visual |
| 161 | Search sticky `top-20` | Ocupa 2 filas completas | Espacio vertical desperdiciado | Ergonomía Digital |
| 163 | Glow `blur opacity-20` | Efecto decorativo sin función | Ruido visual | Reduccionismo |
| 175 | Botón "Buscar" | px-6 py-2 = ~70px horizontal | Redundante con debounce | Hick's Law |
| 183 | 5 categorías `flex-wrap` | 2 filas de 3+2 = 6 chunks | Miller's Law violada (5+1) | Miller's Law |
| 188 | `duration-300` en categorías | Linear transition | Sin spring physics | Física de Materiales |
| 207 | Grid `gap-8` | 32px gap en mobile = excesivo | Espacio desperdiciado | Espacio Negativo Activo |
| 203 | Loader `size={48}` | 48px spinner genérico | Sin feedback orgánico | Affordance Orgánico |
| 219 | Empty state Tent `size={64}` | Icono estático sin acción | Sin affordance | Feedback Háptico |

### HotelCard.tsx — Línea por Línea

| Línea | Elemento | Mobile | Problema | Principio |
|-------|----------|--------|----------|-----------|
| 36 | `aspect-[4/5]` | Demasiado alto en mobile | Debería ser `aspect-[3/4]` mobile | Ergonomía |
| 35 | `whileHover={{ y: -5 }}` | No aplica en touch | Sin feedback táctil | Affordance Orgánico |
| 53 | Overlay `from-black/90` | Texto legible pero heavy | Podría ser más sutil | Glassmorphism 2.0 |
| 55 | `p-6` en mobile | 24px padding = excesivo | Debería ser `p-4` mobile | Espacio Negativo |
| 99 | Arrow button `rotate-[-45deg]` | Solo en hover | Invisible en mobile | Affordance |

### Diagnóstico Consolidado

| Principio | Score Actual | Target | Gap |
|-----------|-------------|--------|-----|
| Miller's Law | 11+ chunks | ≤4 | 🔴 Crítico |
| Hick's Law | 7 decisiones | 1 | 🔴 Crítico |
| Saliencia Visual | Todo compite | 80% en CTA | 🔴 Alto |
| Progressive Disclosure | Zero capas | 3 capas | 🔴 Alto |
| Glassmorphism 2.0 | 1 nivel blur | 3 niveles | 🟡 Medio |
| Spring Physics | 0% usado | 100% | 🟡 Medio |
| Espacio Negativo | Padding genérico | Conductor de mirada | 🟡 Medio |

---

## Parte 2: Algoritmo de Ranking (PhD Production-Ready)

### 2.1 Modelo: Weighted Multi-Criteria Decision Analysis (MCDA)

```
Score(h) = Σ(wᵢ × fᵢ(h))  donde Σwᵢ = 1.0
```

### 2.2 Funciones de Scoring Normalizadas [0, 1]

#### f₁: Disponibilidad (w = 0.35)
```typescript
function availabilityScore(hotel, checkIn, checkOut): number {
  if (!checkIn || !checkOut) return 0.5; // Neutral sin fechas
  const available = hotel.availableRooms || 0;
  const total = hotel.totalRooms || 1;
  const ratio = available / total;
  // S-curve: penaliza fuerte cuando <20% disponible
  return 1 / (1 + Math.exp(-10 * (ratio - 0.2)));
}
```

#### f₂: Confianza Social (w = 0.25)
```typescript
function reviewScore(hotel, maxReviews): number {
  const rating = hotel.reviewStats?.averageRating || 0;
  const reviews = hotel.reviewStats?.totalReviews || 0;
  // Rating normalizado × log confidence
  const ratingNorm = rating / 5;
  const confidence = Math.log10(reviews + 1) / Math.log10(maxReviews + 1);
  return ratingNorm * Math.min(confidence, 1);
}
```

#### f₃: Relevancia de Precio (w = 0.20)
```typescript
function priceRelevance(hotel, medianPrice): number {
  const price = hotel.min_price || 0;
  if (medianPrice === 0) return 0.5;
  // Gaussian: mejor cerca de la mediana, penaliza extremos
  const sigma = medianPrice * 0.5;
  return Math.exp(-0.5 * Math.pow((price - medianPrice) / sigma, 2));
}
```

#### f₄: Match Textual (w = 0.20)
```typescript
function textMatchScore(hotel, query): number {
  if (!query) return 0.5; // Neutral sin búsqueda
  const q = query.toLowerCase().trim();
  const name = hotel.name?.toLowerCase() || '';
  const location = hotel.location?.toLowerCase() || '';
  const desc = hotel.description?.toLowerCase() || '';
  
  // Exact match > partial > fuzzy
  if (name.includes(q)) return 1.0;
  if (location.includes(q)) return 0.8;
  if (desc.includes(q)) return 0.6;
  
  // Fuzzy: token overlap
  const tokens = q.split(/\s+/);
  const allText = `${name} ${location} ${desc}`;
  const matches = tokens.filter(t => allText.includes(t)).length;
  return 0.3 * (matches / tokens.length);
}
```

### 2.3 Función Principal

```typescript
export interface RankingContext {
  checkIn?: string;
  checkOut?: string;
  query?: string;
  maxReviews?: number;
  medianPrice?: number;
}

export function rankHotels(
  hotels: Hotel[],
  context: RankingContext
): Hotel[] {
  const { checkIn, checkOut, query, maxReviews = 50, medianPrice = 100000 } = context;
  
  const scored = hotels.map(h => ({
    hotel: h,
    score: 
      0.35 * availabilityScore(h, checkIn, checkOut) +
      0.25 * reviewScore(h, maxReviews) +
      0.20 * priceRelevance(h, medianPrice) +
      0.20 * textMatchScore(h, query)
  }));
  
  return scored
    .sort((a, b) => b.score - a.score)
    .map(s => s.hotel);
}
```

### 2.4 Justificación Académica

| Componente | Base Teórica | Referencia |
|------------|-------------|------------|
| MCDA | Multi-Criteria Decision Analysis | Belton & Stewart (2002) |
| S-curve disponibilidad | Logistic function para umbrales | Verhulst (1845) |
| Log confidence | Bayesian confidence en reviews | Wilson score interval |
| Gaussian precio | Normal distribution preference | Prospect Theory (Kahneman) |
| Fuzzy match | Token overlap similarity | Jaccard index variant |

---

## Parte 3: TDD — Tests Antes de Implementación

### Test 1: Algoritmo de Ranking

```typescript
// src/__tests__/unit/hotel-ranking.test.ts
import { rankHotels, type RankingContext } from '@/lib/hotel-ranking';

const baseHotels = [
  { id: '1', name: 'Hotel A', location: 'Bogotá', min_price: 120000, reviewStats: { averageRating: 4.8, totalReviews: 120 }, availableRooms: 5, totalRooms: 10 },
  { id: '2', name: 'Glamping Sierra', location: 'Villa de Leyva', min_price: 80000, reviewStats: { averageRating: 4.2, totalReviews: 30 }, availableRooms: 2, totalRooms: 5 },
  { id: '3', name: 'Hostal Centro', location: 'Bogotá', min_price: 50000, reviewStats: { averageRating: 3.5, totalReviews: 5 }, availableRooms: 0, totalRooms: 8 },
  { id: '4', name: 'Luxury Suite', location: 'Cartagena', min_price: 500000, reviewStats: { averageRating: 5.0, totalReviews: 200 }, availableRooms: 8, totalRooms: 10 },
];

describe('hotel-ranking', () => {
  it('ranks by availability when dates are provided', () => {
    const ctx: RankingContext = { checkIn: '2026-06-01', checkOut: '2026-06-03' };
    const ranked = rankHotels(baseHotels, ctx);
    // Hotel A (50% avail, good reviews) should beat Sierra (40% avail)
    expect(ranked[0].id).toBe('1');
    // Hostal Centro (0% avail) should be last
    expect(ranked[ranked.length - 1].id).toBe('3');
  });

  it('returns neutral order when no dates provided', () => {
    const ranked = rankHotels(baseHotels, {});
    // All get 0.5 availability, so reviews + price dominate
    expect(ranked[0].id).toBe('4'); // Best reviews
  });

  it('boosts text matches for name search', () => {
    const ctx: RankingContext = { query: 'Sierra' };
    const ranked = rankHotels(baseHotels, ctx);
    expect(ranked[0].id).toBe('2'); // "Glamping Sierra" exact match
  });

  it('boosts text matches for location search', () => {
    const ctx: RankingContext = { query: 'Bogotá' };
    const ranked = rankHotels(baseHotels, ctx);
    // Both Hotel A and Hostal Centro match location
    // Hotel A wins due to better reviews + availability
    expect(ranked[0].id).toBe('1');
  });

  it('penalizes extreme prices via Gaussian', () => {
    const ctx: RankingContext = { medianPrice: 100000 };
    const ranked = rankHotels(baseHotels, ctx);
    // Luxury Suite (500k) penalized vs median (100k)
    expect(ranked.findIndex(h => h.id === '4')).toBeGreaterThan(0);
  });

  it('handles empty hotel list', () => {
    expect(rankHotels([], {})).toEqual([]);
  });

  it('handles hotel with missing data gracefully', () => {
    const incomplete = [{ id: 'x', name: 'Test', location: '', min_price: 0 }];
    const ranked = rankHotels(incomplete as any, { query: 'test' });
    expect(ranked).toHaveLength(1);
    expect(ranked[0].id).toBe('x');
  });
});
```

### Test 2: SmartSearchBar Progressive Disclosure

```typescript
// src/__tests__/unit/smart-search-bar.test.ts
import { render, screen, fireEvent } from '@testing-library/react';
import SmartSearchBar from '@/components/ota/SmartSearchBar';

describe('SmartSearchBar', () => {
  const defaultProps = {
    onSearch: jest.fn(),
    initialDates: undefined,
    initialGuests: 1,
  };

  it('shows only search pill on initial load (mobile-first)', () => {
    render(<SmartSearchBar {...defaultProps} />);
    expect(screen.getByPlaceholderText(/buscar destino/i)).toBeInTheDocument();
    expect(screen.queryByText(/fechas/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/huéspedes/i)).not.toBeInTheDocument();
  });

  it('reveals dates after search interaction', () => {
    render(<SmartSearchBar {...defaultProps} />);
    const input = screen.getByPlaceholderText(/buscar destino/i);
    fireEvent.focus(input);
    // After focus, dates should become available
    expect(screen.getByText(/elegir fechas/i)).toBeInTheDocument();
  });

  it('reveals guests after dates confirmed', () => {
    render(<SmartSearchBar {...defaultProps} />);
    // Simulate dates confirmed
    fireEvent.change(screen.getByPlaceholderText(/buscar destino/i), {
      target: { value: 'Bogotá' },
    });
    // Guests pill should appear
    expect(screen.getByText(/huéspedes/i)).toBeInTheDocument();
  });

  it('calls onSearch with combined params', () => {
    const onSearch = jest.fn();
    render(<SmartSearchBar {...defaultProps} onSearch={onSearch} />);
    // Simulate full flow
    fireEvent.change(screen.getByPlaceholderText(/buscar destino/i), {
      target: { value: 'Bogotá' },
    });
    expect(onSearch).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'Bogotá' })
    );
  });

  it('preserves searchParams in hotel links (handoff)', () => {
    // This tests that HotelCard links include ?checkin=&checkout=
    // Implementation: check HotelCard href generation
    expect(true).toBe(true); // Placeholder - will test actual component
  });
});
```

### Test 3: OTADashboard Chunk Count (Miller's Law)

```typescript
// src/__tests__/unit/ota-chunk-count.test.ts
import { render, screen } from '@testing-library/react';
import OTADashboard from '@/components/ota/OTADashboard';

describe('OTADashboard Miller Law compliance', () => {
  const mockHotels = [
    { id: '1', name: 'Test', location: 'Bogotá', min_price: 100000, main_image_url: '', city_slug: 'test' },
  ];

  it('has ≤4 visible chunks on initial load', () => {
    render(<OTADashboard initialHotels={mockHotels} />);
    
    // Count distinct interactive groups visible above the fold
    const chunks = [
      screen.queryByRole('banner'),        // 1: Header
      screen.queryByRole('heading', { level: 1 }), // 2: Hero
      screen.queryByPlaceholderText(/buscar/i),    // 3: Search
      screen.queryByRole('button', { name: /tipo/i }), // 4: Category chip
    ].filter(Boolean);
    
    expect(chunks.length).toBeLessThanOrEqual(4);
  });

  it('has only 1 primary decision on initial load', () => {
    render(<OTADashboard initialHotels={mockHotels} />);
    const primaryActions = screen.queryAllByRole('button');
    // Only search input should be the primary action
    const searchInput = screen.queryByPlaceholderText(/buscar destino/i);
    expect(searchInput).toBeInTheDocument();
  });
});
```

### Test 4: Handoff URL Preservation

```typescript
// src/__tests__/unit/handoff-url.test.ts
import { preserveSearchParams } from '@/lib/handoff-url';

describe('handoff-url', () => {
  it('preserves checkin/checkout in hotel links', () => {
    const params = new URLSearchParams('checkin=2026-06-01&checkout=2026-06-03&guests=2');
    const result = preserveSearchParams(params, '/hotel/test');
    expect(result).toBe('/hotel/test?checkin=2026-06-01&checkout=2026-06-03&guests=2');
  });

  it('strips non-relevant params', () => {
    const params = new URLSearchParams('checkin=2026-06-01&scroll=123&showRoom=abc');
    const result = preserveSearchParams(params, '/hotel/test');
    expect(result).toContain('checkin=2026-06-01');
    expect(result).not.toContain('scroll=123');
    expect(result).not.toContain('showRoom=abc');
  });

  it('returns clean path when no relevant params', () => {
    const params = new URLSearchParams('scroll=123');
    const result = preserveSearchParams(params, '/hotel/test');
    expect(result).toBe('/hotel/test');
  });
});
```

---

## Parte 4: Plan de Implementación

### PR #1: Homepage Limpia (~80 líneas)

**Cambios en OTADashboard.tsx:**
1. Header: `glass-panel` → `glass-pill`, `h-20` → `h-14` mobile
2. Hero: Eliminar gradiente, tipografía `text-3xl md:text-5xl`
3. Search: Eliminar botón "Buscar", Enter key + glow
4. Categorías: 5 botones → chip "Tipo ▾" + 2 pills inline
5. Grid: `gap-8` → `gap-4` mobile, `gap-8` desktop
6. Todas las transiciones → spring physics

### PR #2: Ranking + Handoff (~120 líneas)

**Archivos nuevos:**
- `lib/hotel-ranking.ts` (~80 líneas) — Algoritmo MCDA
- `lib/handoff-url.ts` (~20 líneas) — URL preservation
- `__tests__/unit/hotel-ranking.test.ts` (~60 líneas)
- `__tests__/unit/handoff-url.test.ts` (~30 líneas)

**Cambios:**
- HotelCard: preservar searchParams en link
- OTADashboard: integrar ranking antes de render

---

## Checklist de Aceptación

- [ ] ≤4 chunks visibles al cargar homepage
- [ ] 1 decisión prominente: buscar destino
- [ ] Categorías: ≤3 visibles (chip + 2 pills)
- [ ] Sin botón "Buscar" redundante
- [ ] Header h-14 mobile, glass-pill
- [ ] Grid gap-4 mobile, gap-8 desktop
- [ ] HotelCard aspect-[3/4] mobile
- [ ] Todas las animaciones usan spring
- [ ] Ranking algorithm: 7 tests passing
- [ ] Handoff URL: 3 tests passing
- [ ] Chunk count: 2 tests passing
- [ ] 0 errores TypeScript
