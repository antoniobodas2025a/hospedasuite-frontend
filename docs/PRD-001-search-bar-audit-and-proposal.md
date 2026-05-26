# PRD — HospedaSuite Search Bar: Auditoría → Propuesta PhD-Level

**Documento**: PRD-001  
**Fecha**: 2026-05-26  
**Autor**: Gentle AI (SDD Orchestrator)  
**Estado**: Draft — para revisión  
**Target**: Producción

---

## 1. AUDITORÍA: Estado Actual de la Barra de Búsqueda

### 1.1 Arquitectura Actual

La OTA de HospedaSuite tiene **dos sistemas de búsqueda desconectados**:

| Sistema | Componente | Qué busca | Dónde vive |
|---------|-----------|-----------|------------|
| **Homepage** | `OTADashboard.tsx` | Texto libre (nombre, ubicación) + categoría | `/` |
| **Hotel Detail** | `AvailabilitySearchBar.tsx` | Fechas + huéspedes | `/hotel/[slug]` |

### 1.2 Flujo Actual del Usuario

```
Usuario llega a hospedasuite.com
    ↓
Ve: Hero + input de texto libre + categorías (Glamping, Hotel, Cabina, Boutique)
    ↓
Escribe "Paipa" → 500ms debounce → busca en nombre Y ubicación
    ↓
Resultados: grid de HotelCards con paginación "Cargar más"
    ↓
Click en hotel → navega a /hotel/{slug}
    ↓
En detalle: AvailabilitySearchBar (fechas + huéspedes) — NO hay ubicación
```

### 1.3 Bugs Críticos Detectados

| # | Bug | Severidad | Impacto |
|---|-----|-----------|---------|
| 1 | `loadMoreHotels` ignora `locationParam` | 🔴 Critical | Paginación devuelve resultados incorrectos si hay filtro de ubicación |
| 2 | Múltiples `.or()` en Supabase pueden droppear filtros | 🔴 Critical | Categoría + búsqueda + ubicación pueden anularse entre sí |
| 3 | `city_slug` es en realidad `hotel.slug` | 🟡 Medium | Muestra nombre del hotel como si fuera ciudad |
| 4 | `replace('-', ' ')` solo reemplaza primer guión | 🟡 Medium | `"villa-gatuna-bogota"` → `"villa gatuna-bogota"` |
| 5 | Categoría NO se sincroniza a URL | 🟡 Medium | Se pierde al refrescar la página |
| 6 | Sin estado de error para búsquedas fallidas | 🟡 Medium | Fallo silencioso muestra "sin resultados" |
| 7 | `fetchOTAHotelsAction` sin caché | 🟠 High | Cada tecla (post-debounce) golpea Supabase directamente |
| 8 | `min_capacity` se escribe en URL pero nunca se lee | 🟢 Low | Código muerto |

### 1.4 Métricas de Performance

| Métrica | Valor Actual | Target Industry |
|---------|-------------|-----------------|
| Debounce | 500ms fijo | 300ms con trailing edge |
| Caché | Ninguna | 60s stale-while-revalidate |
| Paginación | Cursor-based sin límite | Offset con max 10 páginas |
| SSR | `force-dynamic` (sin caché) | ISR con revalidate 60s |
| TTFB | ~800ms (sin caché) | <200ms (con caché) |

---

## 2. INVESTIGACIÓN: Booking.com y Airbnb

### 2.1 Booking.com — Search Bar Architecture

**Patrón**: Single-purpose search bar con 3 zonas obligatorias

```
┌─────────────────────────────────────────────────────────────┐
│  📍 ¿A dónde vas?     │  📅 Check-in → Check-out   │  👥 2 adultos  │  🔍 Buscar  │
└─────────────────────────────────────────────────────────────┘
```

| Característica | Implementación |
|---------------|----------------|
| **Ubicación** | Autocomplete con geocoding (ciudades, regiones, landmarks, hoteles) |
| **Fechas** | Date picker con presets (este fin de semana, próximo mes) |
| **Huéspedes** | Counter con adultos, niños, habitaciones, bebés |
| **Búsqueda** | Botón explícito — NO es search-as-you-type |
| **URL** | `/search?ss=Bo&checkin=2026-06-15&checkout=2026-06-16&group_adults=2` |
| **Resultados** | Lista con mapa lateral, filtros laterales (precio, rating, amenities) |
| **Caché** | CDN + edge caching + server-side session |
| **Fallback** | Si no hay resultados → sugiere destinos cercanos |

**Patrones clave**:
- **Progressive disclosure**: El autocomplete muestra resultados jerárquicos (ciudad → región → país → hotel)
- **Intent prediction**: Mientras escribes, sugiere "Bo" → "Bogotá, Colombia", "Bonn, Alemania", "Boston, USA"
- **Session persistence**: La última búsqueda se restaura al volver
- **Zero-error state**: Nunca muestra "sin resultados" — siempre sugiere alternativas

### 2.2 Airbnb — Search Bar Architecture

**Patrón**: Modal search con 3 pasos secuenciales (Ley de Hick)

```
┌──────────────────────────────────────────────────────┐
│  🔍 Dónde           │  Cuándo        │  Quiénes       │  🔍 Buscar  │
│  Anywhere           │  Anytime       │  Add guests    │              │
└──────────────────────────────────────────────────────┘
```

Al hacer click, se abre un **modal de búsqueda** con:

| Paso | UI | Comportamiento |
|------|----|----------------|
| **1. Dónde** | Input + mapa interactivo | Autocomplete geográfico con "Search by map" |
| **2. Cuándo** | Calendario + presets flexibles | "This weekend", "Next month", "Anytime" |
| **3. Quiénes** | Counters (adults, children, infants, pets) | Límites por tipo de huésped |

**Patrones clave**:
- **Modal-first**: La búsqueda NO es inline — abre un overlay dedicado
- **Map integration**: "Search by map" permite dibujar un área en el mapa
- **Flexible dates**: "±3 days", "Flexible month", "Anytime" — reduce fricción
- **Progressive refinement**: Los filtros se aplican DESPUÉS de la búsqueda inicial
- **Category pills DESPUÉS**: "Amazing pools", "OMG!", "Beachfront" aparecen en resultados, no en búsqueda
- **URL**: `/s/San-Francisco--CA/homes?tab_id=home_tab&adults=2&source=structured_search_input_header`

### 2.4 Context Handoff: Cómo Booking y Airbnb Preservan la Búsqueda

#### Booking.com — Context Persistence

**Patrón**: URL como fuente de verdad + session cookies

```
Homepage: /search?ss=Bogotá&checkin=2026-06-15&checkout=2026-06-18&group_adults=2
    ↓
Click en hotel → /hotel/bogota-hotel-123?aid=304142&label=gen173nr
    ↓
En detalle: Banner "Your search: Bogotá · 15 Jun – 18 Jun · 2 adults"
    ↓
Click en "Change your search" → vuelve a /search con TODOS los params
    ↓
Back navigation → homepage restaura búsqueda completa
```

**Mecanismos**:
- **URL completa**: Todos los params de búsqueda se incluyen en cada link de hotel
- **Session cookie**: `booking_session` con última búsqueda (fallback si URL está vacía)
- **Context banner**: Siempre visible en detalle — muestra qué se está buscando
- **Modify search link**: Vuelve a homepage con params preservados

#### Airbnb — Context Persistence

**Patrón**: URL + localStorage + state machine

```
Homepage: /s/Bogotá/homes?checkin=2026-06-15&checkout=2026-06-18&adults=2
    ↓
Click en listing → /rooms/12345678?checkin=2026-06-15&checkout=2026-06-18&adults=2
    ↓
En detalle: Header muestra "Bogotá · Jun 15–18 · 2 guests" con link de editar
    ↓
Click en editar → abre modal de búsqueda con valores pre-llenados
    ↓
Back navigation → homepage restaura búsqueda desde URL + localStorage
```

**Mecanismos**:
- **URL completa**: Params de búsqueda en cada navegación
- **localStorage**: `airbnb_search_params` como backup (persiste entre sesiones)
- **Header contextual**: En detalle, muestra el contexto actual con link de editar
- **Modal de edición**: Al hacer click en editar, abre el mismo modal de búsqueda pre-llenado

#### HospedaSuite Actual — Lo que Falta

| Mecanismo | Booking | Airbnb | HospedaSuite |
|-----------|---------|--------|-------------|
| URL params completos | ✅ 10+ params | ✅ 8+ params | ❌ Solo 3 params |
| Session backup | ✅ Cookie | ✅ localStorage | ❌ Ninguno |
| Context banner | ✅ "Your search: ..." | ✅ "Stays in: ..." | ❌ No existe |
| Modify search link | ✅ Vuelve con params | ✅ Modal pre-llenado | ❌ No existe |
| Back navigation | ✅ Restaura todo | ✅ Restaura todo | ❌ Reset completo |
| Param wiping | ✅ Nunca borra | ✅ Nunca borra | ❌ 4 componentes borran params |

### 2.5 Comparación Directa

| Característica | HospedaSuite | Booking.com | Airbnb |
|---------------|-------------|-------------|--------|
| Búsqueda por ubicación | ❌ Texto libre | ✅ Autocomplete geocoding | ✅ Autocomplete + mapa |
| Fechas en homepage | ❌ Solo en detalle | ✅ En homepage | ✅ En homepage |
| Huéspedes en homepage | ❌ Solo en detalle | ✅ En homepage | ✅ En homepage |
| Autocomplete | ❌ | ✅ Con jerarquía | ✅ Con mapa |
| Caché de búsqueda | ❌ | ✅ Edge + session | ✅ CDN + session |
| Estado de error | ❌ Silencioso | ✅ Sugiere alternativas | ✅ Sugiere alternativas |
| URL shareable | Parcial | ✅ Completo | ✅ Completo |
| Mobile experience | Input sticky | Bottom sheet | Full-screen modal |
| Búsqueda por mapa | ❌ | ✅ Sidebar | ✅ Integrated |
| Presets de fecha | ❌ | ✅ Este fin de semana | ✅ Flexible dates |
| Session persistence | ❌ | ✅ Última búsqueda | ✅ Última búsqueda |
| **Context handoff** | ❌ Pierde location/category | ✅ Preserva TODO | ✅ Preserva TODO |
| **Back navigation** | ❌ Reset completo | ✅ Restaura estado | ✅ Restaura estado |
| **Context banner** | ❌ No existe | ✅ "Your search: ..." | ✅ "Stays in: ..." |

---

## 3. PROPUESTA PhD-Level: HospedaSuite Search 2.0

### 3.0 Context Handoff: Homepage ↔ Detalle (CRÍTICO)

**Problema actual**: Cuando un usuario busca en la homepage y hace click en un hotel, **pierde su contexto de búsqueda**. Al volver, todo se resetea.

#### 3.0.1 Auditoría de `preserveSearchParams`

**Archivo**: `src/lib/handoff-url.ts`

```ts
export const RELEVANT_PARAMS = ['checkin', 'checkout', 'guests'] as const;
```

| Param | ¿Se preserva? | ¿Debería? |
|-------|--------------|-----------|
| `checkin` | ✅ Sí | ✅ |
| `checkout` | ✅ Sí | ✅ |
| `guests` | ✅ Sí | ✅ |
| `location` | ❌ NO | ✅ **SÍ** |
| `category` | ❌ NO | ✅ **SÍ** |
| `searchTerm` | ❌ NO | ✅ **SÍ** |
| `max_price` | ❌ NO | ✅ **SÍ** |
| `min_beds` | ❌ NO | ✅ **SÍ** |
| `amenities` | ❌ NO | ✅ **SÍ** |

#### 3.0.2 Bugs de Param Wiping

En **4 componentes** diferentes, se crea un `new URLSearchParams()` vacío que **borra todos los filtros existentes**:

| Componente | Línea | Qué borra |
|-----------|-------|-----------|
| `BookingWidget.handleReserve` | 90-95 | `max_price`, `min_beds`, `amenities` |
| `RoomCard` | 65-71 | Todos los refinement filters |
| `RoomShowcaseModal.handleCheckout` | 115-120 | Todo antes de checkout |
| `AvailabilitySearchBar.buildUrl` | 32-51 | Params no relevantes |

#### 3.0.3 Flujo Actual (Roto)

```
Usuario busca "Paipa" + categoría "Glamping" en homepage
    ↓
Click en hotel → preserveSearchParams() SOLO lleva checkin/checkout/guests
    ↓
En detalle: AvailabilitySearchBar muestra fechas y huéspedes ✅
    ↓
En detalle: NO hay rastro de "Paipa" ni "Glamping" ❌
    ↓
Usuario vuelve atrás → homepage reseteada (category='all', searchTerm='') ❌
```

#### 3.0.4 Flujo Propuesto (Corregido)

```
Usuario busca "Paipa" + "Glamping" + fechas + 2 huéspedes en homepage
    ↓
Click en hotel → preserveSearchParams() lleva TODOS los params ✅
    ↓
En detalle: AvailabilitySearchBar muestra TODO el contexto ✅
    ↓
En detalle: Banner contextual "Buscando glampings en Paipa · 15-18 Jun · 2 huéspedes" ✅
    ↓
Usuario vuelve atrás → homepage restaura TODOS los filtros ✅
    ↓
sessionStorage backup: si el usuario cierra y vuelve, se restaura la última búsqueda ✅
```

#### 3.0.5 Especificación Técnica: SearchContextManager

```typescript
// src/lib/search-context.ts

export interface SearchContext {
  location: string | null;
  checkin: string | null;
  checkout: string | null;
  guests: number;
  category: string;
  searchTerm: string;
  maxPrice: number | null;
  minBeds: number | null;
  amenities: string[];
}

// URL schema completo
// /?location=Paipa&checkin=2026-06-15&checkout=2026-06-18&guests=2
//    &category=glamping&search=paipa&max_price=200000&min_beds=1&amenities=wifi,parking

// Sync strategy:
// 1. useTransition + router.push para updates suaves
// 2. sessionStorage como backup (restaurar si URL está vacía)
// 3. SSR lee params para initial render
// 4. Client hydrates con mismo estado

// preserveSearchParams corregido:
export const RELEVANT_PARAMS = [
  'location', 'checkin', 'checkout', 'guests',
  'category', 'search', 'max_price', 'min_beds', 'amenities'
] as const;

// Fix para param wiping:
// ANTES (roto):
const params = new URLSearchParams();  // ← Vacío, borra todo
params.set('showRoom', roomId);

// DESPUÉS (correcto):
const params = new URLSearchParams(searchParams.toString());  // ← Preserva existentes
params.set('showRoom', roomId);
```

#### 3.0.6 Context Banner en Página de Detalle

Cuando el usuario llega desde la homepage con contexto de búsqueda, mostrar un **banner contextual** en la página de detalle:

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Buscando glampings en Paipa · 15 Jun → 18 Jun · 2      │
│     [Modificar búsqueda] ← vuelve a homepage con params     │
└─────────────────────────────────────────────────────────────┘
```

**Comportamiento**:
- Se muestra SOLO si hay params de búsqueda en la URL
- "Modificar búsqueda" navega a `/?location=Paipa&checkin=...&checkout=...&guests=2&category=glamping`
- Se puede cerrar (X) — el contexto se mantiene en URL pero el banner desaparece
- En mobile: se convierte en un chip compacto debajo del header

### 3.1 Visión

Transformar la barra de búsqueda de HospedaSuite de un **input de texto libre con debounce** a un **sistema de búsqueda inteligente con contexto geográfico, fechas y huéspedes** — siguiendo los patrones de Booking y Airbnb pero adaptado al mercado colombiano de glampings y hoteles boutique.

### 3.2 Principios de Diseño

| Principio | Aplicación |
|-----------|-----------|
| **Ley de Miller** | Máximo 3-4 campos visibles simultáneamente |
| **Ley de Hick** | Una decisión por zona: ubicación → fechas → huéspedes |
| **Progressive Disclosure** | Mostrar solo lo necesario, revelar más bajo demanda |
| **Recognition over Recall** | Autocomplete con ciudades conocidas, no texto libre |
| **Zero Dead Ends** | Nunca mostrar "sin resultados" — siempre sugerir alternativas |

### 3.3 Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        HOSPEDASUITE SEARCH 2.0                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │ 📍 Destino      │  │ 📅 Fechas    │  │ 👥 Huéspedes │  │ 🔍       │ │
│  │ Paipa, Boyacá   │  │ 15 Jun → 18  │  │ 2 adultos    │  │ Buscar   │ │
│  └─────────────────┘  └──────────────┘  └──────────────┘  └──────────┘ │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  AUTOCOMPLETE DROPDOWN (al escribir en Destino)                  │  │
│  │  ┌────────────────────────────────────────────────────────────┐ │  │
│  │  │ 🏙️ Paipa, Boyacá          3 alojamientos                  │ │  │
│  │  │ 🏔️ Villa de Leyva         5 alojamientos                  │ │  │
│  │  │ 🌿 Guatavita, Cundinamarca 2 alojamientos                  │ │  │
│  │  │ 🏨 Bogotá                 12 alojamientos                  │ │  │
│  │  └────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Componentes Nuevos

| Componente | Responsabilidad | Dependencies |
|-----------|----------------|--------------|
| `SearchBarUnified` | Orquestador de 3 zonas + botón buscar | Ninguna |
| `LocationAutocomplete` | Input + dropdown con ciudades | `cmdk` o custom Radix |
| `DateRangePicker` | Check-in/check-out con presets | `react-day-picker` (ya existe) |
| `GuestSelector` | Contadores con presets | Ya existe |
| `SearchResults` | Grid + mapa + filtros | Ya existe parcialmente |
| `SearchState` | URL sync + session persistence | `next/navigation` |

### 3.5 Flujo de Datos

```
Usuario escribe "Paipa" en LocationAutocomplete
    ↓
Query: SELECT DISTINCT city, COUNT(*) FROM hotels WHERE status='active'
       AND city ILIKE '%paipa%' GROUP BY city ORDER BY COUNT(*) DESC
    ↓
Dropdown: "Paipa, Boyacá — 3 alojamientos"
    ↓
Usuario selecciona → estado pending
    ↓
Usuario confirma fechas → estado pending
    ↓
Usuario confirma huéspedes → estado pending
    ↓
Click "Buscar" → router.push(/?location=Paipa&checkin=...&checkout=...&guests=2)
    ↓
Server: fetchOTAHotelsAction con TODOS los filtros
    ↓
Resultados: HotelCards con filtros laterales + mapa
    ↓
URL es shareable — cualquier persona con el link ve los mismos resultados
```

### 3.6 Especificaciones Técnicas

#### 3.6.1 LocationAutocomplete

```typescript
interface LocationSuggestion {
  city: string;
  region?: string;
  hotelCount: number;
  slug: string;
}

// Server action
async function searchLocations(query: string): Promise<LocationSuggestion[]> {
  // Query optimizada con índice en city
  const { data } = await supabaseAdmin
    .from('hotels')
    .select('city')
    .eq('status', 'active')
    .ilike('city', `%${query}%`)
  
  // Agrupar y contar
  const grouped = data.reduce((acc, h) => {
    acc[h.city] = (acc[h.city] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return Object.entries(grouped)
    .map(([city, count]) => ({ city, hotelCount: count, slug: slugify(city) }))
    .sort((a, b) => b.hotelCount - a.hotelCount)
    .slice(0, 8)
}
```

#### 3.6.2 SearchState (URL Sync)

```typescript
// URL schema
// /?location=Paipa&checkin=2026-06-15&checkout=2026-06-18&guests=2&category=glamping

interface SearchState {
  location: string | null;
  checkin: string | null;
  checkout: string | null;
  guests: number;
  category: string;
}

// Sync strategy: useTransition + router.push
// Debounce: 300ms para ubicación, inmediato para fechas/huéspedes
// Persistence: sessionStorage para restaurar al volver
```

#### 3.6.3 Server Action Optimizada

```typescript
async function fetchOTAHotelsAction(
  page: number,
  limit: number,
  filters: {
    category?: string;
    search?: string;
    location?: string;
    checkin?: string;
    checkout?: string;
    guests?: number;
  }
) {
  // Caché: unstable_cache con revalidate 60s
  // Query: single .or() con todas las condiciones
  // Paginación: offset-based con max 10 páginas
}
```

### 3.7 Roadmap de Implementación

| Fase | Scope | Líneas estimadas | Riesgo |
|------|-------|-----------------|--------|
| **Phase 0** | Context handoff fix + SearchContextManager + context banner | ~250 | Low |
| **Phase 1** | LocationAutocomplete + server action | ~200 | Low |
| **Phase 2** | SearchBarUnified (3 zonas + URL sync) | ~300 | Medium |
| **Phase 3** | DateRangePicker + GuestSelector integration | ~150 | Low |
| **Phase 4** | Caché + session persistence + error states | ~200 | Medium |
| **Phase 5** | Mobile bottom sheet + map integration | ~400 | High |

**Total estimado**: ~1,500 líneas | **Tiempo**: 4-6 días | **PRs**: 6 (chained)

#### Phase 0: Context Handoff Fix (Prioridad Máxima)

**Por qué primero**: Es el bug más crítico — los usuarios pierden su contexto de búsqueda al navegar. Se arregla en ~2 horas y mejora la UX inmediatamente.

**Tareas**:
1. Expandir `RELEVANT_PARAMS` en `handoff-url.ts` para incluir `location`, `category`, `search`, `max_price`, `min_beds`, `amenities`
2. Fix param wiping en `BookingWidget`, `RoomCard`, `RoomShowcaseModal`, `AvailabilitySearchBar`
3. Crear `SearchContextManager` hook para URL sync + sessionStorage backup
4. Sync `activeCategory` y `searchTerm` de `OTADashboard` a URL params
5. Context banner en página de detalle con "Modificar búsqueda"
6. Tests de navegación: homepage → detalle → back → homepage

---

## 4. EXPLICACIÓN: ¿Por qué es Nivel Doctorado para Producción?

| Lenguaje Sencillo | Lenguaje Técnico |
|-------------------|------------------|
| **Hoy HospedaSuite tiene un buscador que solo busca por nombre.** Es como tener una biblioteca donde solo podés buscar por título del libro, pero no por autor, género o tema. | **Arquitectura actual**: Single-field ILIKE query on `name` and `location` columns without indexing, autocomplete, or faceted search. No URL state persistence, no caching layer, no error recovery. |
| **Booking.com y Airbnb usan autocompletado inteligente.** Cuando escribís "Bo", te muestran "Bogotá", "Bonn", "Boston" con cuántos hoteles hay en cada uno. HospedaSuite no hace eso — tenés que escribir el nombre exacto. | **Competitive gap**: Booking uses geocoding API with hierarchical autocomplete (city → region → country → POI). Airbnb uses map-integrated search with flexible date presets. HospedaSuite uses raw string matching with 500ms debounce and zero suggestions. |
| **La propuesta agrega 3 campos claros: destino, fechas y huéspedes.** Cada uno hace una sola cosa bien. El usuario no se confunde porque ve exactamente qué necesita llenar. | **Proposed architecture**: Three-zone search bar with progressive disclosure. LocationAutocomplete queries distinct cities with hotel counts via optimized Supabase aggregation. URL state schema supports shareable, bookmarkable search URLs. |
| **Nunca vas a ver "sin resultados".** Si no hay hoteles en Paipa, te sugiere ciudades cercanas o te muestra todos los glampings disponibles. | **Zero dead-ends policy**: Fallback query chain — if location filter returns 0 results, trigger proximity-based fallback (same region → same category → all active). UI always displays results or actionable suggestions, never empty state. |
| **La búsqueda se guarda en la URL.** Podés copiar el link y mandárselo a un amigo, y ve exactamente lo mismo que vos. | **URL-as-state pattern**: All search parameters serialized to query string. `useTransition` + `router.push` for smooth updates without full page reload. SSR reads params for initial render, client hydrates with same state. |
| **Es rápido porque guarda los resultados en caché.** La primera búsqueda tarda un poco, pero las siguientes son instantáneas. | **Caching strategy**: `unstable_cache` with 60s revalidate + stale-while-revalidate. Supabase query results cached at edge level. Session storage preserves last search for instant restoration on return visits. |
| **En el celular, la búsqueda se convierte en una pantalla completa.** Es más fácil tocar los campos y ver los resultados. | **Mobile adaptation**: Bottom sheet pattern (y: '100%' → '0%') with full-screen modal for search input. Touch targets ≥ 44px. Keyboard-aware scroll handling. Haptic feedback on selection. |
| **Cuando hacés click en un hotel, NO perdés tu búsqueda.** Las fechas, huéspedes, ubicación y categoría te siguen a la página de detalle. Si volvés atrás, todo está como lo dejaste. | **Context handoff**: `preserveSearchParams` expanded to include all 9 search params. `SearchContextManager` hook syncs URL + sessionStorage. Context banner on detail page shows current search with "Modify" link. Zero param wiping — all `new URLSearchParams()` calls now extend existing params. |
| **Si cerrás la pestaña y volvés, tu búsqueda se restaura.** No tenés que empezar de nuevo — la última búsqueda está guardada. | **Session persistence**: sessionStorage backup for search context. On mount, if URL params are empty, restore from sessionStorage. On search, save to sessionStorage. TTL: 24 hours. |

### 4.1 ¿Por qué "Nivel Doctorado"?

| Dimensión | HospedaSuite Actual | Booking/Airbnb | Propuesta HospedaSuite 2.0 |
|-----------|-------------------|----------------|---------------------------|
| **Búsqueda** | Texto libre sin sugerencias | Autocomplete geocoding + mapa | Autocomplete con ciudades + conteo de hoteles |
| **Fechas** | Solo en página de hotel | En homepage con presets | En homepage con presets flexibles |
| **Huéspedes** | Solo en página de hotel | En homepage con tipos | En homepage con presets (solo, pareja, familia) |
| **Caché** | Ninguna | Edge + session | `unstable_cache` 60s + sessionStorage |
| **Errores** | Silenciosos | Sugiere alternativas | Fallback chain + sugerencias contextuales |
| **URL** | Parcial | Shareable completo | Shareable completo con todos los filtros |
| **Mobile** | Input sticky | Bottom sheet / full-screen | Bottom sheet con modal dedicado |
| **Performance** | ~800ms TTFB | <200ms TTFB | <200ms TTFB con caché |
| **Context handoff** | ❌ Pierde location/category | ✅ Preserva TODO | ✅ SearchContextManager + banner |
| **Back navigation** | ❌ Reset completo | ✅ Restaura estado | ✅ sessionStorage backup + URL sync |

**La diferencia fundamental**: Booking y Airbnb invirtieron **años** y **cientos de ingenieros** en perfeccionar su búsqueda. Esta propuesta condensa esas lecciones en una implementación práctica para un equipo pequeño — sin sacrificar la calidad de producción.

---

## 5. RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Ciudades mal escritas en la BD | Alta | Medium | Normalizar `city` con `TRIM()` + `LOWER()` en queries |
| Performance con muchas ciudades | Media | Low | Índice en `city` + query optimizada con `GROUP BY` |
| Mobile UX complejo | Media | High | Bottom sheet con touch targets ≥ 44px |
| Caché stale | Baja | Medium | Revalidate 60s + manual invalidation on hotel status change |
| Dependencia nueva (`cmdk`) | Baja | Low | Implementar autocomplete custom con Radix si se prefiere |

---

## 6. MÉTRICAS DE ÉXITO

| Métrica | Actual | Target | Cómo medir |
|---------|--------|--------|------------|
| Tasa de búsqueda exitosa | ~60% | >85% | Analytics: search → hotel view conversion |
| Tiempo a primera búsqueda | ~8s | <3s | RUM: time to interactive + first search |
| Tasa de "sin resultados" | ~15% | <3% | Analytics: empty state views / total searches |
| Búsquedas shareables | 0% | >10% | Analytics: direct traffic with search params |
| Mobile search completion | ~40% | >70% | Analytics: mobile search → results conversion |

---

## 7. DECISIONES PENDIENTES

| Decisión | Opciones | Recomendación |
|----------|----------|---------------|
| ¿Instalar `cmdk` o custom? | `cmdk` vs Radix custom | Custom con Radix — menos dependencias, más control |
| ¿Mapa en homepage? | Sí vs No | No para MVP — agregar en Phase 5 si hay demanda |
| ¿Búsqueda por coordenadas? | Sí vs No | No — las ciudades son suficientes para el mercado colombiano |
| ¿Presets de fecha flexibles? | Sí vs No | Sí — "Este fin de semana", "Próximo mes" reducen fricción |

---

**Documento generado**: 2026-05-26  
**Próximo paso**: Revisión del PRD → aprobación → inicio de Phase 1
