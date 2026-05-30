# PRD-006: Map-First Discovery — El Mapa COMO la Búsqueda

**Status**: Draft  
**Created**: 2026-05-29  
**Parent**: PRD-005 (Homepage + Map Refactor)  
**Priority**: Critical  
**Driver**: Hallazgo central de PRD-005 — "El 80% de las búsquedas en Airbnb vienen del mapa"

---

## 1. Problema

**El mapa actual es un toggle opcional**. Aparece oculto por defecto (`showMap = false`), el usuario debe hacer click en "Ver mapa" para activarlo. Esto trata al mapa como un **complemento**, cuando los datos de Airbnb demuestran que es la **interfaz principal de descubrimiento**.

### 1.1 Flujo Actual (Incorrecto)

```
Usuario busca "Medellín"
  ↓
Lista de 12 hoteles (grid 3 cols)
  ↓
Usuario ve "Ver mapa" → click opcional
  ↓
Mapa aparece (si el usuario lo pidió)
```

**Problema**: El 80% de los usuarios quieren el mapa PRIMERO. Los que no lo piden explícitamente pierden la herramienta de descubrimiento más poderosa.

### 1.2 Flujo Target (Airbnb)

```
Usuario busca "Medellín"
  ↓
Split-view: Lista (izq) + Mapa (der) — AMBOS visibles
  ↓
Usuario interactúa con el mapa (pan/zoom) como búsqueda principal
  ↓
Lista se filtra por bounds visibles
```

---

## 2. Estado Actual vs Target

| Dimensión | Actual | Target | Gap |
|-----------|--------|--------|-----|
| **Visibilidad** | Oculto (toggle) | Visible por defecto | 🔴 |
| **Layout desktop** | Lista full-width | Split 60/40 o 50/50 | 🔴 |
| **Layout mobile** | Toggle full-screen | Mapa full + lista como bottom sheet | 🟡 |
| **Interacción primaria** | Scroll de lista | Pan/zoom del mapa | 🔴 |
| **Filtrado** | Manual (categorías) | Bounds-based automático | 🟡 |
| **Persistencia** | Se pierde al navegar | Estado de mapa en URL | 🔴 |

---

## 3. Principios de Diseño

### 3.1 El Mapa ES la Búsqueda

> "Los usuarios no buscan hoteles — buscan ubicaciones. El mapa traduce 'quiero estar cerca de X' en resultados concretos."

- El mapa no es un "extra" — es el **motor de descubrimiento**
- La lista es un **complemento** para comparar detalles
- Pan/zoom del mapa = nueva búsqueda (no scroll de lista)

### 3.2 Progressive Disclosure Espacial

```
Capa 1 (siempre visible): Mapa con mini-pins
Capa 2 (hover en pin): Precio + nombre + mini-popup
Capa 3 (click en pin): Card expandida con detalles
Capa 4 (click en card): Página de hotel
```

### 3.3 Zero Friction

- Mapa visible inmediatamente después de la primera búsqueda
- No requiere click para activarlo
- El estado del mapa (zoom, centro, bounds) se persiste en URL

---

## 4. Propuesta: Nueva Estructura

### 4.1 Desktop — Split-View

```
┌─────────────────────────────────────────────────────┐
│ HEADER (glass-pill, fixed)                          │
├─────────────────────────────────────────────────────┤
│ HERO + SEARCH (progressive disclosure)              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────┬──────────────────────────┐ │
│  │                     │                          │ │
│  │   LISTA (40%)       │    MAPA (60%)            │ │
│  │                     │                          │ │
│  │  • Featured card    │  • Mini-pins 2-tier      │ │
│  │  • Grid 2 cols      │  • Clustering            │ │
│  │  • Sorting          │  • Bounds filter         │ │
│  │  • Scrollable       │  • Sticky                │ │
│  │                     │                          │ │
│  └─────────────────────┴──────────────────────────┘ │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Características**:
- Mapa ocupa 60% del viewport (prioridad visual)
- Lista ocupa 40%, scrollable independientemente
- Featured card se muestra arriba de la lista (compacta)
- Grid de 2 columnas (no 3) para adaptarse al espacio reducido
- Mapa es sticky — no se pierde al hacer scroll en la lista

### 4.2 Mobile — Mapa Full + Bottom Sheet

```
┌─────────────────────┐
│ HEADER              │
├─────────────────────┤
│ SEARCH BAR          │
├─────────────────────┤
│                     │
│                     │
│    MAPA (100%)      │
│                     │
│                     │
│                     │
├─────────────────────┤
│ ┌─────────────────┐ │ ← Bottom sheet
│ │ Lista (draggable│ │   (30% height)
│ │  cards)         │ │
│ └─────────────────┘ │
└─────────────────────┘
```

**Características**:
- Mapa ocupa 100% del viewport
- Lista aparece como bottom sheet draggable (como Airbnb mobile)
- Sheet se puede expandir a 60% o colapsar a mini-strip
- Bottom bar de controles (ya implementado en Sprint 3)

---

## 5. Roadmap de Implementación

### Phase 1: Split-View Desktop (~150 líneas)

| Feature | Archivos | Esfuerzo |
|---------|----------|----------|
| Layout split 60/40 con CSS Grid | `OTADashboard.tsx` | 🟢 1h |
| Mapa sticky en lado derecho | `OTADashboard.tsx`, `map.css` | 🟢 1h |
| Lista scrollable independientemente | `OTADashboard.tsx` | 🟢 1h |
| Featured card compacta para split | `FeaturedCard.tsx` | 🟡 2h |
| Grid 2 cols en lugar de 3 | `OTADashboard.tsx` | 🟢 0.5h |

### Phase 2: URL State Persistence (~100 líneas)

| Feature | Archivos | Esfuerzo |
|---------|----------|----------|
| Persistir zoom/center en URL | `MapSearchSync.tsx`, `handoff-url.ts` | 🟡 3h |
| Restaurar estado de mapa al cargar | `HotelMapView.tsx` | 🟡 2h |
| Bounds como parámetro de búsqueda | `bounds-filter.ts` | 🟡 2h |

### Phase 3: Mobile Bottom Sheet (~200 líneas)

| Feature | Archivos | Esfuerzo |
|---------|----------|----------|
| Bottom sheet draggable para lista | `OTADashboard.tsx`, nuevo componente | 🟡 4h |
| Sheet expandable/collapsible | framer-motion drag | 🟡 3h |
| Sync sheet height con mapa | `MapSearchSync.tsx` | 🟡 2h |

### Phase 4: Map-First Search (~100 líneas)

| Feature | Archivos | Esfuerzo |
|---------|----------|----------|
| Pan/zoom del mapa dispara búsqueda | `MapSearchSync.tsx` | 🟡 3h |
| "Search this area" auto-trigger | `bounds-filter.ts` | 🟢 1h |
| Loading states durante pan | `HotelMapView.tsx` | 🟢 1h |

**Total estimado**: ~550 líneas, 4 phases, 2-3 días

---

## 6. Métricas de Éxito

| Métrica | Baseline | Target | Cómo medir |
|---------|----------|--------|------------|
| Mapa visible al buscar | 0% (toggle) | 100% | Analytics |
| Interacciones con mapa | ~15% de sesiones | >60% | Event tracking |
| Tiempo en mapa | ~30s | >90s | Session recording |
| Clicks en "Ver mapa" | 100% de usuarios | 0% (eliminado) | Analytics |
| Bookings desde mapa | ~20% | >50% | Conversion tracking |

---

## 7. Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Mapa consume más recursos | Performance | Lazy load tiles, debounce pan |
| Lista muy estrecha en split | UX | Min-width 320px, 2 cols |
| Mobile sheet bloquea mapa | UX | Sheet draggable, max 60% height |
| URL params muy largos | Shareability | Comprimir bounds a hash |

---

## 8. Decisiones Técnicas

### 8.1 ¿Por qué 60/40 y no 50/50?

El mapa necesita espacio para ser útil. 50% en pantallas de 1280px = 640px de mapa, que a zoom 12 muestra ~5km de ancho. 60% = 768px, que muestra ~7km. La diferencia es significativa para descubrimiento.

### 8.2 ¿Por qué lista scrollable independientemente?

El usuario quiere scrollear hoteles SIN perder el contexto del mapa. Si el mapa scrollea con la lista, se pierde la referencia espacial.

### 8.3 ¿Por qué bottom sheet en mobile y no toggle?

Airbnb lo hace así porque el mapa ES la interfaz. El toggle implica "modo lista" vs "modo mapa" — falsa dicotomía. El usuario necesita AMBOS simultáneamente.

---

## 9. Dependencias

| Dependencia | Estado |
|-------------|--------|
| PRD-005 (Sprints 1-4) | ✅ Completado |
| Mini-pins 2-tier | ✅ Implementado |
| Bounds filtering | ✅ Implementado |
| Bidirectional sync | ✅ Implementado |
| Mobile bottom bar | ✅ Implementado |
| Swipeable sheet | ✅ Implementado (MobileSearchSheet) |

---

## 10. Criterios de Aceptación

- [ ] Mapa visible inmediatamente después de primera búsqueda (sin toggle)
- [ ] Desktop: split-view 60/40 con lista scrollable independiente
- [ ] Mobile: mapa full + lista como bottom sheet draggable
- [ ] Estado del mapa persiste en URL (zoom, center, bounds)
- [ ] Pan/zoom del mapa dispara re-búsqueda automática
- [ ] Featured card se adapta a layout compacto en split-view
- [ ] Grid de 2 columnas en split-view desktop
- [ ] Zero regresiones en accesibilidad (ARIA, keyboard)
- [ ] Performance: mapa carga en <2s, pan debounce 500ms
