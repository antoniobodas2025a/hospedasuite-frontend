# PRD-014: Navegación en Dos Etapas — Tarjetas Primero, Mapa Bajo Demanda

**Status**: Draft
**Created**: 2026-06-03
**Parent**: PRD-006 (Map-First Discovery) — corrección de rumbo
**Priority**: High

---

## 1. Problema

PRD-006 implementó "map-first": el mapa visible inmediatamente después de buscar. Pero la UX real de Airbnb es distinta:

### 1.1 Flujo Real de Airbnb

```
Usuario busca "Minca"
  ↓
Tarjetas (3 columnas, sin mapa)  ← clean, focused
  ↓
Usuario explora tarjetas
  ↓
Opcional: "Mostrar mapa"  ← split-view con mapa
  ↓
Mapa + lista sincronizados
```

### 1.2 Flujo Actual de Hospedasuite (PRD-006)

```
Usuario busca "Minca"
  ↓
Split-view: lista (40%) + mapa (60%)  ← mapa obligatorio
  ↓
Usuario interactúa con ambos simultáneamente
```

**Problema**: El mapa ocupa el 60% del viewport incluso cuando el usuario solo quiere ver tarjetas. Es ruido visual innecesario en la etapa de descubrimiento inicial.

### 1.3 Por qué Airbnb lo hace así

| Razón | Explicación |
|---|---|
| **Carga cognitiva** | El usuario está decidiendo DÓNDE ir. Las tarjetas muestran precio, rating, fotos. El mapa distrae. |
| **Performance** | Cargar el mapa (Leaflet + tiles + markers) tiene costo. Si el usuario no lo usa, es desperdicio. |
| **Mobile-first** | En mobile, mapa + tarjetas simultáneos es imposible sin bottom sheet. La UX nativa es tarjetas → toggle mapa. |
| **Progressive disclosure** | Primero el usuario explora opciones. Después decide DÓNDE en el mapa quiere estar. |

---

## 2. Propuesta: Navegación en Dos Etapas

### 2.1 Estado 1: Solo Tarjetas (default post-búsqueda)

```
┌─────────────────────────────────────┐
│ HEADER                              │
├─────────────────────────────────────┤
│ SEARCH (sticky, compacta)           │
├─────────────────────────────────────┤
│                                     │
│ CATEGORIES (horizontal scroll)      │
│                                     │
│ [Featured Card]                     │
│                                     │
│ SORTING (Recomendados / Precio)     │
│                                     │
│ HOTEL GRID (3 cols desktop)         │
│ [Card] [Card] [Card]                │
│ [Card] [Card] [Card]                │
│                                     │
│          [Mostrar más]              │
│                                     │
│ ┌───────────────────────────────┐   │
│ │  🗺️  Ver mapa (12 alojamientos)│   │  ← Toggle para ir a Estado 2
│ └───────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

**Características**:
- Mapa NO se carga hasta que el usuario pide verlo (lazy load)
- Grid de 3 columnas en desktop, 1 columna en mobile
- Toggle "Ver mapa" visible pero no intrusivo
- Proximidad en cards ("X km del centro") — ya implementado
- Sorting — ya implementado
- Featured card — ya implementado

### 2.2 Estado 2: Split-View con Mapa (bajo demanda)

```
┌─────────────────────────────────────┐
│ HEADER                              │
├─────────────────────────────────────┤
│ SEARCH (sticky)                     │
├─────────────────────────────────────┤
│ ┌────────────────┬────────────────┐ │
│ │ LISTA (40%)    │  MAPA (60%)    │ │
│ │                │                │ │
│ │ • Featured     │  • Mini-pins   │ │
│ │ • Grid 2 cols  │  • Bounds auto │ │
│ │ • Sorting      │  • Clustering  │ │
│ │ • Scroll indep │  • Sticky      │ │
│ │                │                │ │
│ └────────────────┴────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

**Características**:
- Todo lo implementado en PRD-006 (split-view, mini-pins, bounds filtering, sync)
- Mapa se carga la primera vez que el usuario hace toggle (lazy import)
- El estado del mapa se preserva al alternar entre estados
- Transición animada entre Estado 1 y Estado 2

### 2.3 Mobile: Tarjetas Full + Botón Mapa

```
Estado 1 (mobile):               Estado 2 (mobile):
┌──────────────────┐             ┌──────────────────┐
│ HEADER           │             │ HEADER           │
├──────────────────┤             ├──────────────────┤
│ SEARCH           │             │ SEARCH           │
├──────────────────┤             ├──────────────────┤
│                  │             │                  │
│ CARDS            │             │ MAPA (100%)      │
│ (scroll)         │             │                  │
│                  │             │                  │
│                  │             ├──────────────────┤
│                  │             │ Bottom Sheet     │
│                  │             │ (tarjetas)       │
│                  │             └──────────────────┘
│                  │
│ [🗺️ Ver mapa]    │
└──────────────────┘
```

---

## 3. Cambios Requeridos

### 3.1 Estado Global

```typescript
type ViewMode = 'cards' | 'map';

const [viewMode, setViewMode] = useState<ViewMode>('cards');
```

- Default después de buscar: `'cards'`
- Toggle: `'map'`
- Se persiste en URL: `?view=map`

### 3.2 Lazy Load del Mapa

```typescript
// En Estado 1: NO se importa el mapa
// En Estado 2: dynamic import con loading fallback
const HotelMapView = dynamic(() => import('./HotelMapView'), {
  ssr: false,
  loading: () => <MapSkeleton />
});
```

### 3.3 Toggle "Ver mapa"

Componente `MapToggle`:
- Muestra: "🗺️ Ver mapa (12 alojamientos)"
- En Estado 2: "📋 Ver lista"
- Animación spring al alternar
- Posición: debajo del grid de tarjetas

### 3.4 Transición entre Estados

```typescript
<AnimatePresence mode="wait">
  {viewMode === 'cards' ? (
    <motion.div key="cards" /* ... */>
      <HotelGrid />
      <MapToggle onClick={() => setViewMode('map')} />
    </motion.div>
  ) : (
    <motion.div key="map" /* ... */>
      <SplitView />
    </motion.div>
  )}
</AnimatePresence>
```

### 3.5 Preservar Estado del Mapa

Cuando el usuario alterna entre estados:
- La posición del mapa (zoom, centro) se mantiene
- Los bounds aplicados se mantienen
- El `IntersectionObserver` se limpia al salir del Estado 2

---

## 4. Impacto en lo Ya Implementado

| Feature | PRD-005/006 | PRD-014 | Cambio |
|---|---|---|---|
| Split-view inicial | ✅ Siempre visible | ❌ Solo en Estado 2 | `viewMode` state |
| Mini-pins 2-tier | ✅ | ✅ Sin cambios | Se preserva |
| Bounds auto-filter | ✅ | ✅ Sin cambios | Solo en Estado 2 |
| Card↔Map sync | ✅ | ✅ Sin cambios | Solo en Estado 2 |
| Search progressive | ✅ | ✅ Sin cambios | Igual en ambos estados |
| Hero | ✅ | ✅ Sin cambios | Igual |
| URL state (map) | ✅ | ✅ Ampliado | Agregar `?view=` |
| Lazy map import | ❌ | ✅ Nuevo | No carga mapa hasta toggle |

---

## 5. Roadmap

### Sprint 1: Estado 1 (Solo Tarjetas) — ~100 líneas

| Tarea | Archivo | Esfuerzo |
|---|---|---|
| Agregar `viewMode` state (cards/map) | `OTADashboard.tsx` | 30min |
| Condicionar split-view render a `viewMode === 'map'` | `OTADashboard.tsx` | 30min |
| Crear `MapToggle` component | `MapToggle.tsx` (nuevo) | 1h |
| Lazy import del mapa (solo en Estado 2) | `OTADashboard.tsx` | 30min |
| URL persistence (`?view=map`) | `OTADashboard.tsx`, `handoff-url.ts` | 30min |

### Sprint 2: Transiciones — ~50 líneas

| Tarea | Archivo | Esfuerzo |
|---|---|---|
| AnimatePresence para transición cards↔map | `OTADashboard.tsx` | 1h |
| Preservar estado del mapa al hacer toggle | `OTADashboard.tsx` | 30min |
| Limpiar IntersectionObserver al salir de Estado 2 | `OTADashboard.tsx` | 15min |

### Sprint 3: Mobile — ~50 líneas

| Tarea | Archivo | Esfuerzo |
|---|---|---|
| Mobile: cards full → toggle → mapa + bottom sheet | `OTADashboard.tsx` | 1h |
| Mobile MapToggle sticky al fondo | `MapToggle.tsx` | 30min |

**Total estimado**: ~200 líneas, 4-5 horas

---

## 6. Métricas de Éxito

| Métrica | Baseline | Target |
|---|---|---|
| Mapa cargado en búsqueda | 100% | <30% de sesiones |
| Tiempo hasta interactividad post-búsqueda | ~2s (carga Leaflet) | <500ms |
| Usuarios que usan toggle "Ver mapa" | 0% (no existe) | >40% |
| Bounce rate | — | Sin cambios |

---

## 7. Out of Scope

- Map-first como opción configurable (MVP: siempre cards-first)
- Heatmaps o capas adicionales en el mapa
- "Search this area" automático con server re-fetch (ya implementado client-side)
- Google Maps migration

---

## 8. Riesgos

| Riesgo | Mitigación |
|---|---|
| Usuarios no descubren el mapa | Toggle visible, animado, con conteo de hoteles |
| Transición lenta al cargar mapa | Lazy + skeleton + preconnect a tile server |
| Estado del mapa se pierde | Preservar bounds/zoom en state, no solo en URL |
