# PRD — HospedaSuite OTA: Search ↔ Map Interaction System

**Documento**: PRD-003  
**Fecha**: 2026-05-27  
**Autor**: Gentle AI (SDD Orchestrator)  
**Estado**: Draft — para revisión  
**Target**: Producción

---

## 1. Contexto y Problema

### 1.1 Estado Actual

Cuando un usuario busca "Medellín" en la OTA:

```
Usuario escribe "Medellín" → debounce 300ms → fetchOTAHotelsAction
    ↓
hotels[] se actualiza en OTADashboard
    ↓
HotelMapView recibe NUEVO array
    ↓
❌ Re-geocodifica TODO desde cero (lento, sin caché inteligente)
❌ Marcadores desaparecen y reaparecen de golpe (sin transición)
❌ El mapa NO vuela a la nueva ubicación (se queda en Bogotá)
❌ No hay feedback visual de "actualizando mapa"
❌ El usuario no sabe si el mapa se actualizó o no
```

### 1.2 Problemas de UX Identificados

| Problema | Principio Violado | Impacto |
|----------|------------------|---------|
| Re-geocodificación innecesaria | Anticipación UX | Latencia innecesaria, desperdicio de API calls |
| Marcadores aparecen/desaparecen sin transición | Affordance Orgánico | Ruido visual, confusión espacial |
| Mapa no se mueve a la nueva ubicación | Contextual Awareness | Usuario tiene que hacer zoom/pan manualmente |
| Sin feedback de estado | Progressive Disclosure | Incertidumbre, sensación de que "no funciona" |
| Lista y mapa desconectados | Reduccionismo Cognitivo | Dos experiencias separadas, no unificadas |

---

## 2. Principios de Diseño

### 2.1 Reduccionismo Cognitivo y Ergonomía Digital

#### Ley de Miller: Máximo 5 "chunks" semánticos

El sistema de búsqueda-map se divide en **4 chunks máximo**:

| Chunk | Elementos | Propósito |
|-------|-----------|-----------|
| **1. Input** | Location + Dates + Guests | Captura de intención |
| **2. Resultados** | Lista de hoteles (grid) | Exploración rápida |
| **3. Mapa** | Marcadores + clusters | Contexto geográfico |
| **4. Detalle** | Popup/Panel del hotel | Decisión de reserva |

**Regla**: Nunca mostrar más de 2 chunks simultáneamente en mobile. En desktop, máximo 3 (input + lista + mapa).

#### Ley de Hick: Decisión Única por Pantalla

| Pantalla | Decisión Primaria | Decisiones Secundarias (ocultas) |
|----------|------------------|----------------------------------|
| **Búsqueda** | "¿A dónde vas?" | Fechas, huéspedes (revelados progresivamente) |
| **Resultados** | "¿Qué hotel te interesa?" | Filtros avanzados (ocultos detrás de "Refinar") |
| **Mapa** | "¿Dónde está ubicado?" | Precio, amenities (en popup al hacer click) |
| **Detalle** | "¿Reservar?" | Políticas, historia (acordeón colapsable) |

#### Saliencia Visual

El **80% de la atención** debe capturarla:
1. **CTA de reserva** (peso tipográfico + escala + espacio negativo)
2. **Precio** (contraste de color secundario, no estridente)
3. **Imagen del hotel** (escala dominante)

**NO usar**: Colores estridentes, bordes gruesos, animaciones distractores.

---

### 2.2 Arquitectura de Información Invisible

#### Progressive Disclosure: Capas de Complejidad

```
Capa 1 (Siempre visible):
├── Barra de búsqueda (3 zonas: destino, fechas, huéspedes)
├── Lista de hoteles (grid)
└── Toggle "Ver mapa"

Capa 2 (Al hacer click en mapa):
├── Marcadores con precio
├── Clusters con count
└── Popups al hacer click

Capa 3 (Al hacer click en popup):
├── Imagen del hotel
├── Nombre + ubicación
├── Precio /noche
└── CTA "Ver hotel →"

Capa 4 (Al navegar a detalle):
├── Galería de fotos
├── Habitaciones disponibles
├── Amenidades
├── Políticas
└── Booking widget
```

#### Anticipación UX: Transiciones Predictivas

| Acción del Usuario | Respuesta Predictiva |
|-------------------|---------------------|
| Escribe "Medellín" | Mapa pre-calcula geocoding en background (sin esperar confirmación) |
| Selecciona fechas | Mapa filtra marcadores por disponibilidad (sin recargar) |
| Hace zoom out | Clusters se forman automáticamente con spring animation |
| Hace zoom in | Clusters se expanden con spiderfied animation |
| Click en marcador | Popup aparece con fly-to animation (mapa se centra suavemente) |
| Click en "Ver hotel" | Transición compartida (shared element) del marcador al hero image |

---

### 2.3 Estética Mac 2026: El Triunfo de la Profundidad

#### Morfología de Objetos: Squircles

Todos los elementos del mapa usan **radios de curvatura continua**:

```css
/* Superellipse-based squircles */
--radius-squircle-sm: 8px;    /* Badges, chips */
--radius-squircle-md: 12px;   /* Buttons, inputs */
--radius-squircle-lg: 16px;   /* Cards, popups */
--radius-squircle-xl: 24px;   /* Map container */
--radius-squircle-2xl: 32px;  /* Modals, sheets */
```

#### Estratificación: Glassmorphism 2.0

| Elemento | Backdrop Blur | Border | Shadow | Z-index |
|----------|--------------|--------|--------|---------|
| **Mapa base** | 0px | 1px solid border/30 | shadow-sm | 0 |
| **Marcadores** | 8px | 1px solid border/50 | shadow-md | 10 |
| **Popups** | 16px | 1px solid border/60 | shadow-lg | 20 |
| **Clusters** | 12px | 2px solid white/80 | shadow-md | 15 |
| **Overlay de carga** | 24px | 1px solid border/40 | shadow-xl | 30 |
| **Hotel list overlay** | 32px | 1px solid border/50 | shadow-2xl | 40 |

**Specular Highlights**: Bordes superiores con `border-top: 1px solid rgba(255,255,255,0.1)` para simular luz incidente.

#### Tipografía de Precisión

| Elemento | Font | Size | Weight | Tracking | Leading |
|----------|------|------|--------|----------|---------|
| **Precio en marcador** | Geist Mono | 11px | 700 | -0.02em | 1.2 |
| **Nombre en popup** | Geist | 13px | 700 | -0.01em | 1.3 |
| **Ubicación en popup** | Geist | 11px | 400 | 0 | 1.4 |
| **CTA en popup** | Geist | 11px | 600 | 0.01em | 1.2 |
| **Count en cluster** | Geist | 14px | 800 | -0.03em | 1.0 |

**Espacio Negativo Activo**: El padding dentro de popups es `12px` (no `8px`), creando respiro visual que guía la mirada hacia el CTA.

---

### 2.4 Affordance Orgánico y Física de Materiales

#### Micro-interacciones: Spring Physics

Todas las animaciones usan **spring physics** (masa, rigidez, amortiguación):

```typescript
// Spring configurations
const springs = {
  snappy: { mass: 0.8, stiffness: 300, damping: 25 },    // Clicks, toggles
  gentle: { mass: 1.2, stiffness: 180, damping: 20 },    // Transitions, reveals
  bounce: { mass: 0.6, stiffness: 400, damping: 18 },    // CTAs, confirmations
  mapFly: { mass: 1.5, stiffness: 120, damping: 22 },    // Map fly-to
  cluster: { mass: 1.0, stiffness: 200, damping: 24 },   // Cluster expand/collapse
};
```

**Aplicación**:
- **Click en marcador**: Spring `snappy` → popup aparece con scale 0.95→1.0
- **Zoom in/out**: Spring `gentle` → clusters se forman/desforman suavemente
- **Fly-to**: Spring `mapFly` → mapa vuela a nueva ubicación con easing orgánico
- **CTA hover**: Spring `bounce` → botón escala 1.0→1.02→1.0

#### Feedback Háptico Visual

| Estado | Respuesta Visual | Duración |
|--------|-----------------|----------|
| **Geocoding exitoso** | Marcador aparece con fade-in + scale 0.8→1.0 | 300ms |
| **Geocoding fallido** | Marcador NO aparece, toast sutil "Ubicación no encontrada" | 200ms |
| **Búsqueda actualizada** | Loading overlay con progress ring (no spinner infinito) | Variable |
| **Sin resultados** | Mapa hace "shake" sutil + mensaje "No hay hoteles aquí" | 400ms |
| **Click en cluster** | Cluster se expande con spiderfied animation | 500ms |

**NO usar**: Pop-ups de error disruptivos, spinners infinitos, colores rojos estridentes.

---

## 3. Arquitectura Técnica

### 3.1 Data Flow: Search ↔ Map Sync

```
┌─────────────────────────────────────────────────────────────────┐
│  OTADashboard (state manager)                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  searchState: { location, checkin, checkout, guests }     │  │
│  │  hotels[]: filtered results                               │  │
│  │  mapState: { visible, center, zoom, selectedHotel }       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         ↓                          ↓                          ↓
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  SearchBar      │    │  HotelList      │    │  HotelMapView   │
│  (input zone)   │    │  (grid zone)    │    │  (map zone)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ↓                          ↓                          ↓
  onSearch()               onHotelClick()               onMarkerClick()
         ↓                          ↓                          ↓
  updateSearchState()        navigateToHotel()          flyToMarker()
```

### 3.2 Geocoding Strategy: Intelligent Caching

```typescript
// Multi-level caching strategy
interface GeoCache {
  // Level 1: In-memory (current session)
  memory: Map<string, GeoResult>;
  
  // Level 2: Session storage (survives refresh)
  session: Map<string, GeoResult>;
  
  // Level 3: Pre-computed (for known cities)
  precomputed: {
    'Medellín': [6.2442, -75.5812],
    'Bogotá': [4.6097, -74.0817],
    'Cartagena': [10.3910, -75.5144],
    // ... top 50 Colombian cities
  };
}

// Geocoding flow:
// 1. Check precomputed → instant hit
// 2. Check memory → instant hit
// 3. Check session → instant hit
// 4. Call Nominatim → cache in all 3 levels
```

### 3.3 Marker Lifecycle Management

```typescript
interface MarkerState {
  id: string;
  position: [number, number];
  status: 'geocoding' | 'active' | 'error' | 'removed';
  hotel: Hotel;
}

// Lifecycle:
// 1. CREATE: Hotel added to results → geocode → create marker
// 2. UPDATE: Hotel data changes → update popup content (no re-geocode)
// 3. REMOVE: Hotel removed from results → fade-out → remove marker
// 4. REUSE: Same hotel in new search → reuse existing marker (no re-geocode)
```

### 3.4 Map Transition System

```typescript
interface MapTransition {
  type: 'flyTo' | 'panTo' | 'zoomTo' | 'fitBounds';
  target: L.LatLngExpression | L.LatLngBounds;
  duration: number;
  spring: SpringConfig;
}

// Transition queue:
// - Only one transition at a time
// - New transitions cancel pending ones
// - Current transition completes before next starts
```

---

## 4. Especificaciones de Implementación

### 4.1 Componentes Nuevos

| Componente | Responsabilidad | Dependencies |
|-----------|----------------|--------------|
| `MapSearchSync` | Sync search state ↔ map state | react-leaflet, framer-motion |
| `GeoCacheManager` | Multi-level geocoding cache | None |
| `MarkerLifecycleManager` | CRUD markers with transitions | leaflet, leaflet.markercluster |
| `MapTransitionController` | Queue and execute map transitions | leaflet |
| `MapLoadingOverlay` | Progress ring during geocoding | framer-motion |
| `MapEmptyState` | Shake animation + message when no results | framer-motion |

### 4.2 API de Interacción

```typescript
// OTADashboard → HotelMapView
interface HotelMapViewProps {
  hotels: Hotel[];
  centerLocation?: string;
  selectedHotelId?: string;
  onMarkerClick?: (hotel: Hotel) => void;
  onMapReady?: () => void;
}

// HotelMapView → OTADashboard
interface HotelMapViewCallbacks {
  onMarkerClick: (hotel: Hotel) => void;
  onClusterClick: (hotels: Hotel[]) => void;
  onMapBoundsChange: (bounds: L.LatLngBounds) => void;
  onGeocodingProgress: (current: number, total: number) => void;
}
```

### 4.3 CSS: Mac 2026 Map Styles

```css
/* Marker Pin */
.hotel-marker-pin {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-top: 1px solid rgba(255, 255, 255, 0.15); /* specular highlight */
  border-radius: var(--radius-squircle-lg);
  padding: 4px 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-family: 'Geist Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-foreground);
  white-space: nowrap;
  transition: transform 0.2s var(--spring-snappy);
}

.hotel-marker-pin:hover {
  transform: scale(1.05);
}

.hotel-marker-pin.selected {
  background: var(--bg-brand-500);
  color: white;
  border-color: var(--bg-brand-600);
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
}

/* Cluster Badge */
.cluster-badge {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Geist', sans-serif;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(4px);
}

.cluster-badge.sm {
  width: 32px;
  height: 32px;
  font-size: 12px;
  background: linear-gradient(135deg, var(--bg-brand-400), var(--bg-brand-500));
}

.cluster-badge.md {
  width: 40px;
  height: 40px;
  font-size: 14px;
  background: linear-gradient(135deg, var(--bg-brand-500), var(--bg-brand-600));
}

.cluster-badge.lg {
  width: 48px;
  height: 48px;
  font-size: 16px;
  background: linear-gradient(135deg, var(--bg-brand-600), var(--bg-brand-700));
}

/* Popup */
.leaflet-popup-content-wrapper {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-squircle-xl) !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  padding: 0;
  overflow: hidden;
}

.hotel-popup .popup-image {
  width: 100%;
  height: 80px;
  object-fit: cover;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.hotel-popup .popup-info {
  padding: 12px; /* Active negative space */
}

.hotel-popup .popup-cta {
  display: block;
  text-align: center;
  background: var(--bg-brand-500);
  color: white;
  padding: 8px;
  border-radius: var(--radius-squircle-md);
  text-decoration: none;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
  transition: all 0.2s var(--spring-bounce);
}

.hotel-popup .popup-cta:hover {
  background: var(--bg-brand-600);
  transform: scale(1.02);
}

/* Loading Overlay */
.map-loading-overlay {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-squircle-xl);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

/* Empty State Shake Animation */
@keyframes map-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-2px); }
  80% { transform: translateX(2px); }
}

.map-empty-state {
  animation: map-shake 0.4s var(--spring-snappy);
}
```

---

## 5. Roadmap de Implementación

| Fase | Scope | Líneas | Tiempo |
|------|-------|--------|--------|
| **Phase 1** | GeoCacheManager (multi-level cache) | ~120 | 1.5 horas |
| **Phase 2** | MarkerLifecycleManager (CRUD con transiciones) | ~180 | 2 horas |
| **Phase 3** | MapTransitionController (flyTo, fitBounds) | ~100 | 1 hora |
| **Phase 4** | MapSearchSync (sync state ↔ map) | ~150 | 1.5 horas |
| **Phase 5** | UI polish (loading overlay, empty state, springs) | ~120 | 1 hora |
| **Total** | | ~670 | ~7 horas |

---

## 6. Métricas de Éxito

| Métrica | Actual | Target | Cómo medir |
|---------|--------|--------|------------|
| Geocoding cache hit rate | 0% | >80% | Performance observer |
| Marker transition smoothness | ❌ Snap | ✅ Spring animation | Visual inspection |
| Map fly-to on search | ❌ No | ✅ Yes | Visual inspection |
| Loading feedback | ❌ Spinner | ✅ Progress ring | Visual inspection |
| Empty state feedback | ❌ Silent | ✅ Shake + message | Visual inspection |
| Search-map sync latency | ~2s | <500ms | Performance observer |
| User confusion rate | High | Low | Analytics (bounce rate on map view) |

---

## 7. Decisiones Pendientes

| Decisión | Opciones | Recomendación |
|----------|----------|---------------|
| ¿Pre-computed cities? | Top 50 vs Top 100 | Top 50 (cubre 95% de búsquedas) |
| ¿Geocoding server-side? | Client vs Server | Client + cache (simpler, faster) |
| ¿Shared element transition? | Framer Motion vs CSS | Framer Motion (más control) |
| ¿Map style alternativo? | OSM vs CartoDB vs Stadia | OSM (gratis, sin key) |

---

**Documento generado**: 2026-05-27  
**Próximo paso**: Revisión del PRD → aprobación → inicio de Phase 1
