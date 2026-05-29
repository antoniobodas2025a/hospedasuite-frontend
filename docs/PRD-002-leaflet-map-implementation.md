# PRD — HospedaSuite OTA: Interactive Map with Leaflet

**Documento**: PRD-002  
**Fecha**: 2026-05-27  
**Autor**: Gentle AI (SDD Orchestrator)  
**Estado**: Draft — para revisión  
**Target**: Producción

---

## 1. Contexto y Problema

### 1.1 Estado Actual

La OTA de HospedaSuite usa un **iframe de Google Maps Embed** que:
- ❌ No muestra marcadores de hoteles
- ❌ No permite clustering
- ❌ No tiene popups con info del hotel
- ❌ Muestra "Este contenido está bloqueado" sin API key
- ❌ No es interactivo (solo centro + zoom)

### 1.2 Investigación de Competencia

| Platform | Mapa | Marcadores | Clustering | Popups |
|----------|------|-----------|-----------|--------|
| **Booking.com** | Google Maps | ✅ Con precio | ❌ | ✅ Con info del hotel |
| **Airbnb** | Mapbox GL | ✅ Con precio | ✅ Nativo | ✅ Con foto + precio |
| **Expedia** | Mapbox GL | ✅ Con rating | ✅ Nativo | ✅ Con amenities |
| **HospedaSuite** | Google Embed | ❌ | ❌ | ❌ |

### 1.3 Evaluación de Opciones

| Opción | Costo | Bundle | Marcadores | Clustering | API Key |
|--------|-------|--------|-----------|-----------|---------|
| **Google Embed** | Gratis | 0 KB | ❌ | ❌ | ❌ |
| **Leaflet + OSM** | Gratis | 42 KB | ✅ | ✅ Plugin | ❌ |
| **Mapbox GL JS** | Gratis (50K/mes) | 210 KB | ✅ | ✅ Nativo | ⚠️ Token |
| **MapLibre GL JS** | Gratis | 180 KB | ✅ | ✅ Nativo | ❌ |

### 1.4 Decisión: Leaflet + OpenStreetMap

**Por qué Leaflet sobre Mapbox/MapLibre**:

1. **Zero costo, zero API key** — OpenStreetMap tiles son completamente gratuitos
2. **Bundle mínimo** — 42 KB vs 180-210 KB de alternativas vectoriales
3. **Suficiente para el caso de uso** — Marcadores + clustering + popups es todo lo necesario
4. **Madurez** — 14 años de desarrollo, 1000+ plugins, comunidad enorme
5. **Sin vendor lock-in** — Si mañana querés cambiar tiles, cambiás la URL del TileLayer
6. **No necesitamos 3D** — Vista 3D con pitch no aporta valor a una OTA de glampings

---

## 2. Especificaciones Técnicas

### 2.1 Stack

| Componente | Versión | Propósito |
|-----------|---------|-----------|
| `leaflet` | ^1.9.x | Motor de mapas |
| `react-leaflet` | ^4.2.x | Componentes React |
| `@react-leaflet/core` | ^2.1.x | Core (peer dependency) |
| `leaflet.markercluster` | ^1.5.x | Clustering de marcadores |
| `@types/leaflet` | ^1.9.x | TypeScript definitions |
| `@types/leaflet.markercluster` | ^1.5.x | TypeScript definitions |

**Total bundle estimado**: ~42 KB (gzip) — sin impacto significativo en LCP

### 2.2 Arquitectura del Componente

```
HotelMapView (client component)
├── MapContainer (react-leaflet)
│   ├── TileLayer (OpenStreetMap)
│   ├── MarkerClusterGroup (leaflet.markercluster)
│   │   ├── HotelMarker × N
│   │   │   ├── Marker (react-leaflet)
│   │   │   ├── Custom Icon (divIcon)
│   │   │   └── Popup (react-leaflet)
│   │   │       ├── Hotel name
│   │   │       ├── Price per night
│   │   │       ├── "Ver hotel" button
│   │   │       └── Thumbnail image
│   │   └── Custom Cluster Icon (divIcon)
│   │       ├── Count badge
│   │       └── Spring animation
│   └── MapControls (zoom, fit bounds)
└── HotelListOverlay (bottom sheet)
    └── Hotel chips × 5
```

### 2.3 Data Flow

```
OTADashboard (server)
    ↓ fetchOTAHotelsAction
Hotels array: [{ id, name, location, address, min_price, slug, lat?, lng? }]
    ↓
HotelMapView (client)
    ↓ Geocode location if no lat/lng
    ↓ (cache geocoded results in sessionStorage)
    ↓
MarkerClusterGroup
    ↓ Render markers with custom icons
    ↓ Cluster overlapping markers
    ↓ Show popups on click
    ↓
User clicks marker → navigate to /hotel/{slug}
```

### 2.4 Geocoding Strategy

**Problema**: Los hoteles en la BD tienen `location` (string) pero NO tienen `lat/lng`.

**Solución**: Geocoding client-side con **Nominatim** (gratis, sin API key):

```typescript
// Nominatim geocoding (free, 1 request/second limit)
async function geocodeLocation(query: string): Promise<[number, number] | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
  );
  const data = await res.json();
  if (data.length > 0) {
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  }
  return null;
}
```

**Optimización**: Cache de geocoding en `sessionStorage` para evitar re-fetch:

```typescript
const GEOCACHE_KEY = 'hospedasuite_geocache';

function getCachedCoords(location: string): [number, number] | null {
  const cache = JSON.parse(sessionStorage.getItem(GEOCACHE_KEY) || '{}');
  return cache[location] || null;
}

function setCachedCoords(location: string, coords: [number, number]) {
  const cache = JSON.parse(sessionStorage.getItem(GEOCACHE_KEY) || '{}');
  cache[location] = coords;
  sessionStorage.setItem(GEOCACHE_KEY, JSON.stringify(cache));
}
```

**Fallback**: Si Nominatim falla o no encuentra, usar coordenadas por defecto de Colombia:
```typescript
const DEFAULT_CENTER: [number, number] = [4.6097, -74.0817]; // Bogotá
```

### 2.5 Custom Marker Icon

```typescript
// Mac 2026 aesthetic: squircle marker with price badge
function createHotelIcon(price: number, isSelected: boolean): L.DivIcon {
  return L.divIcon({
    className: 'hotel-marker',
    html: `
      <div class="marker-pin ${isSelected ? 'selected' : ''}">
        <span class="marker-price">$${price.toLocaleString()}</span>
      </div>
    `,
    iconSize: [80, 40],
    iconAnchor: [40, 20],
    popupAnchor: [0, -20],
  });
}
```

### 2.6 Custom Cluster Icon

```typescript
// Spring-physics inspired cluster icon
function createClusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount();
  const size = count < 5 ? 'sm' : count < 15 ? 'md' : 'lg';

  return L.divIcon({
    html: `<div class="cluster-badge ${size}">${count}</div>`,
    className: 'cluster-wrapper',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}
```

### 2.7 Popup Content

```tsx
// Popup HTML with hotel info
const popupContent = `
  <div class="hotel-popup">
    <img src="${hotel.thumbnail}" alt="${hotel.name}" class="popup-image" />
    <div class="popup-info">
      <h3 class="popup-name">${hotel.name}</h3>
      <p class="popup-location">${hotel.location}</p>
      <p class="popup-price">
        <span class="price-amount">$${hotel.min_price.toLocaleString()}</span>
        <span class="price-period">/noche</span>
      </p>
      <a href="/hotel/${hotel.slug}" class="popup-cta">Ver hotel →</a>
    </div>
  </div>
`;
```

---

## 3. Requisitos Funcionales

### 3.1 Core Features

| # | Feature | Descripción | Prioridad |
|---|---------|-------------|-----------|
| F1 | Mapa interactivo | OpenStreetMap con zoom, pan, touch gestures | P0 |
| F2 | Marcadores de hoteles | Pin con precio, custom icon Mac 2026 | P0 |
| F3 | Clustering | Agrupar hoteles cercanos con badge de count | P0 |
| F4 | Popups | Info del hotel con imagen, precio, CTA | P0 |
| F5 | Geocoding | Convertir location string → lat/lng con caché | P0 |
| F6 | Fit bounds | Auto-zoom para mostrar todos los hoteles | P1 |
| F7 | Hotel list overlay | Chips de hoteles en bottom del mapa | P1 |
| F8 | Selected state | Highlight marker seleccionado | P2 |
| F9 | Spiderfied markers | Animación al hacer click en cluster con pocos markers | P2 |

### 3.2 Non-Functional Requirements

| # | Requisito | Target | Cómo medir |
|---|-----------|--------|------------|
| NF1 | Bundle size | < 50 KB (gzip) | `npm run build` + analyze |
| NF2 | LCP impact | < 100ms | Web Vitals |
| NF3 | Geocoding latency | < 500ms (cache hit), < 2s (cache miss) | Performance observer |
| NF4 | Nominatim rate limit | ≤ 1 req/second | Throttle requests |
| NF5 | Mobile touch | Gestures nativos (pinch zoom, pan) | Manual testing |
| NF6 | Accessibility | ARIA labels, keyboard navigation | axe-core audit |

---

## 4. Diseño Visual

### 4.1 Mac 2026 Aesthetic

```
┌─────────────────────────────────────────────────────────────┐
│  🗺️ MAPA INTERACTIVO                                        │
│                                                             │
│         ⊕5                                                  │
│      (cluster)                                              │
│                                                             │
│   💲120K    💲85K    💲200K                                 │
│  (marker)  (marker)  (marker)                               │
│                                                             │
│              💲95K                                          │
│             (selected)                                      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [Patio del Mundo] [Refugio Glamping] [Hostal La Cande...]  │
│  ← hotel chips (bottom overlay) →                           │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Marker Design

```
  ┌──────────────┐
  │  $120.000    │  ← Squircle badge con precio
  └──────┬───────┘
         │
         ▼
        ●        ← Pin point (CSS triangle)
```

**CSS**:
```css
.marker-pin {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-squircle-lg);
  padding: 4px 8px;
  box-shadow: var(--shadow-md);
  font-size: 11px;
  font-weight: 700;
  color: var(--text-foreground);
  white-space: nowrap;
}

.marker-pin.selected {
  background: var(--bg-brand-500);
  color: white;
  border-color: var(--bg-brand-600);
}
```

### 4.3 Cluster Design

```
  ┌──────┐
  │  12  │  ← Circle badge con count
  └──────┘
```

**CSS**:
```css
.cluster-badge {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  color: white;
}

.cluster-badge.sm { width: 32px; height: 32px; font-size: 12px; background: var(--bg-brand-400); }
.cluster-badge.md { width: 40px; height: 40px; font-size: 14px; background: var(--bg-brand-500); }
.cluster-badge.lg { width: 48px; height: 48px; font-size: 16px; background: var(--bg-brand-600); }
```

---

## 5. Implementación

### 5.1 Estructura de Archivos

```
src/
├── components/ota/
│   ├── HotelMapView.tsx          ← Main component (rewrite)
│   ├── HotelMapMarker.tsx        ← Individual marker component
│   ├── HotelMapCluster.tsx       ← Cluster icon component
│   └── HotelMapPopup.tsx         ← Popup content component
├── lib/
│   ├── geocoding.ts              ← Nominatim client + cache
│   └── map-utils.ts              ← Icon factories, helpers
└── styles/
    └── map.css                   ← Leaflet + custom styles
```

### 5.2 Dependencies

```json
{
  "dependencies": {
    "leaflet": "^1.9.4",
    "react-leaflet": "^4.2.1",
    "leaflet.markercluster": "^1.5.3"
  },
  "devDependencies": {
    "@types/leaflet": "^1.9.12",
    "@types/leaflet.markercluster": "^1.5.4"
  }
}
```

### 5.3 CSS Imports

```tsx
// In HotelMapView.tsx or layout
import 'leaflet/dist/leaflet.css';
import '@/styles/map.css'; // Custom overrides
```

### 5.4 Next.js Considerations

**Leaflet es client-only** — requiere `use client` y dynamic import para SSR:

```tsx
// Option A: use client directive
'use client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

// Option B: Dynamic import (preferred for SSR)
const HotelMapView = dynamic(() => import('@/components/ota/HotelMapView'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});
```

---

## 6. Roadmap

| Fase | Scope | Líneas | Tiempo |
|------|-------|--------|--------|
| **Phase 1** | Install deps + basic map + tiles | ~80 | 1 hora |
| **Phase 2** | Geocoding + markers + cache | ~150 | 2 horas |
| **Phase 3** | Clustering + custom icons | ~120 | 1.5 horas |
| **Phase 4** | Popups + hotel info + CTA | ~100 | 1 hora |
| **Phase 5** | Mobile overlay + fit bounds | ~80 | 1 hora |
| **Total** | | ~530 | ~6.5 horas |

---

## 7. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Nominatim rate limit (1 req/s) | Alta | Medium | Throttle requests, cache aggressively |
| Geocoding fails for some locations | Media | Low | Fallback to default center (Bogotá) |
| Leaflet CSS conflicts | Baja | Low | Scoped CSS, reset Leaflet defaults |
| Mobile performance with many markers | Media | Medium | Clustering handles this automatically |
| Bundle size impact | Baja | Low | 42 KB is negligible vs current bundle |

---

## 8. Métricas de Éxito

| Métrica | Actual | Target | Cómo medir |
|---------|--------|--------|------------|
| Mapa funcional | ❌ Embed roto | ✅ Interactivo | Manual testing |
| Marcadores visibles | 0 | N (todos los hoteles) | Visual inspection |
| Clustering activo | ❌ | ✅ | Zoom in/out test |
| Popups con info | ❌ | ✅ Nombre + precio + CTA | Click test |
| Bundle impact | 0 KB | < 50 KB | `npm run build --analyze` |
| LCP impact | N/A | < 100ms | Web Vitals |
| Mobile UX | ❌ Iframe | ✅ Touch gestures | Device testing |

---

## 9. Decisiones Pendientes

| Decisión | Opciones | Recomendación |
|----------|----------|---------------|
| ¿Tile layer alternativo? | OSM vs CartoDB vs Stadia | OSM (gratis, sin key) |
| ¿Geocoding server-side? | Nominatim server vs client | Client + cache (simpler) |
| ¿Agregar coordenadas a BD? | Migrar hotels con lat/lng | Phase 2 (mejora futura) |
| ¿Dark mode map? | CartoDB Dark vs OSM | OSM (suficiente para MVP) |

---

**Documento generado**: 2026-05-27  
**Próximo paso**: Revisión del PRD → aprobación → inicio de Phase 1
