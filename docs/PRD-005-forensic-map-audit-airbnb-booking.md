# PRD-005: Refactor Forense OTA — Homepage + Mapa

**Status**: Draft  
**Created**: 2026-05-29  
**Updated**: 2026-05-29  
**Parent**: PRD-003 (Search ↔ Map), PRD-004 (Integration)  
**Priority**: Critical  

---

## 1. Hallazgo Central

**El 80% de las búsquedas en Airbnb vienen del mapa** (panear/zoom), no de la caja de búsqueda. El mapa NO es un complemento — ES la interfaz principal de descubrimiento.

**HospedaSuite actual**: El mapa es un toggle opcional. La homepage muestra demasiados elementos simultáneos (53+ en primer scroll) sin jerarquía visual clara. El hero es texto sin función.

---

## 2. Auditoría Forense: Homepage Actual

### 2.1 Estructura Actual (Sección por Sección)

```
Header (glass-pill, fixed)
  └─ [H] HospedaSuite + LanguageSwitcher + Acceso Hotelero
  └─ 5 elementos visuales ✅

Hero (texto puro)
  └─ "Encuentra tu lugar" + "seguro" (brand-500)
  └─ 2 elementos ⚠️ Sin función, sin CTA, sin animación

Search Bar (sticky, 3 zonas)
  └─ 📍 Destino + 📅 Estadía + 👤 Huéspedes
  └─ 9+ elementos visuales 🔴 3 decisiones simultáneas

Hotel Count + Map Toggle
  └─ "12 alojamientos" + "Ver mapa"
  └─ 2 elementos ✅

Categories (2 pills + dropdown)
  └─ [Glamping] [Hoteles] [Todo ▾]
  └─ 3-7 elementos ✅

Hotel Grid (4 columnas)
  └─ 4 cards × 8 elementos = 32+ elementos por viewport 🔴
  └─ Sin sorting, sin featured, sin guía visual

Load More Button
  └─ "Mostrar más alojamientos"
  └─ 1-2 elementos ✅
```

### 2.2 Conteo de Elementos Visuales

| Sección | Desktop | Mobile | Miller (≤7) |
|---------|---------|--------|-------------|
| Header | 5 | 3 | ✅ |
| Hero | 2 | 2 | ✅ |
| Search Bar | 9+ | 1 | 🔴 |
| Categories | 3-7 | 3-7 | ✅ |
| Hotel Grid (4 cols) | 32+ | 8+ | 🔴 |
| **TOTAL above fold** | **~21** | **~16** | 🔴 |
| **TOTAL primer scroll** | **~53+** | **~24+** | 🔴 |

### 2.3 Violaciones de Principios

| Principio | Sección | Violación | Impacto |
|-----------|---------|-----------|---------|
| **Ley de Miller** | Hotel Grid | 32+ elementos por viewport | Parálisis visual |
| **Ley de Miller** | Mobile Map | 5 elementos flotantes | Ruido en mapa |
| **Ley de Hick** | Search Bar | 3 decisiones simultáneas | Fricción inicial |
| **Ley de Hick** | Hotel Grid | N hoteles sin guía | Parálisis de elección |
| **Progressive Disclosure** | Search Bar | 3 zonas visibles a la vez | Sobrecarga inicial |
| **Affordance** | Hero | Cero animación, cero CTA | Espacio desperdiciado |

### 2.4 Lo que Funciona Bien

| Elemento | Por qué |
|----------|---------|
| Header | Limpio, 3 chunks, glass-pill, spring hide/show |
| Categories | 2+1 pattern, dropdown oculta opciones menos populares |
| MobileSearchSheet | Linear flow, progressive disclosure, spring animations |
| HotelCard (individual) | Squircles, springBounce, hover lift, image zoom |
| Design system tokens | Squircles, glassmorphism, springs, shadows — todo definido |

**El problema no es estético. Es estructural.** La base de diseño es excelente; la página intenta mostrar demasiado a la vez.

---

## 3. Auditoría Forense: Mapa (Airbnb vs Booking vs HospedaSuite)

### 3.1 Tabla Comparativa

| Feature | Airbnb | Booking.com | HospedaSuite | Gap |
|---------|--------|-------------|--------------|-----|
| Split-view desktop | ✅ 60/40 | ❌ Toggle | ❌ Toggle | 🔴 |
| Map-first search (80%) | ✅ Central | ❌ Secundario | ❌ Secundario | 🔴 |
| Hover sync bidireccional | ✅ Gold | ⚠️ Unidireccional | ✅ Parcial | 🟡 |
| Mini-pins (2-tier) | ✅ +1.9% bookings | ❌ | ❌ | 🔴 |
| Clustering | ❌ Mini-pins | ✅ Numéricos | ✅ Numéricos | 🟢 |
| "Search this area" | ✅ Auto | ✅ Dibujar | ✅ Botón | 🟢 |
| Bottom sheet mobile | ✅ Swipeable | ⚠️ Simple | ⚠️ Básico | 🟡 |
| Proximity context | ✅ | ✅ En todo | ❌ | 🔴 |
| Zero API keys | ❌ Custom | ❌ Google ($$$) | ✅ Leaflet | 🟢 |
| Spring animations | ❌ Linear | ❌ Linear | ✅ | 🟢 |
| Glassmorphism | ❌ | ❌ | ✅ | 🟢 |

### 3.2 Hallazgos Clave del Mapa

1. **Airbnb: 80% de búsquedas vienen del mapa** → El mapa ES la búsqueda
2. **Mini-pins = +1.9% bookings** → Menos ruido visual = más conversiones
3. **Sync bidireccional es table stakes** → Los usuarios lo esperan
4. **Proximity context en cada card** → Reduce necesidad de abrir mapa
5. **HospedaSuite ya supera a ambos en estética** → El gap es UX, no visual

---

## 4. Principios de Diseño Aplicados al Refactor

### 4.1 Reduccionismo Cognitivo (Miller + Hick)

**Meta**: Máximo 5 chunks por sección, 1 decisión por pantalla.

| Sección Actual | Chunks | Target | Cambio |
|----------------|--------|--------|--------|
| Search Bar | 9 (3 zonas × 3 sub) | 3 (1 zona visible a la vez) | Progressive disclosure |
| Hotel Grid | 32+ (4 cols × 8 elem) | 18 (3 cols × 6 elem) | Menos columnas, menos cards |
| Mobile Map | 5 flotantes | 2 (bottom bar unificado) | Consolidar controles |

### 4.2 Arquitectura de Información Invisible

**Progressive Disclosure en la homepage**:
```
Capa 1 (siempre visible): Hero + Location input → "¿A dónde?"
Capa 2 (después de ubicación): Dates + Guests + Buscar → "¿Cuándo y cuántos?"
Capa 3 (resultados): Categories + Grid → "Elegí tu alojamiento"
Capa 4 (mapa): Pins + filtros → "Explorá la zona"
Capa 5 (detalle): Rooms + booking → "Reservá"
```

**Anticipación UX**:
- Hero → scroll indicator apunta a la search bar
- Location completado → Dates + Guests aparecen automáticamente
- Búsqueda ejecutada → categories se muestran, grid carga
- Hover en card → mapa vuela al marker (ya implementado)
- Click en marker → card hace scroll y se resalta (pendiente)

### 4.3 Estética Mac 2026

**Ya implementado** (no cambiar):
- ✅ Squircles (`radius-squircle-*`)
- ✅ Glassmorphism (`backdrop-blur`, `bg-white/5`)
- ✅ Spring physics (`springSnappy`, `springGentle`, `springBounce`)
- ✅ Specular highlights (`::before` gradient en map)
- ✅ Shadow elevation (`shadow-elev-*`)

**Agregar**:
- Hero entrance animation (fade-in-up con springGentle)
- Scroll indicator animado (bounce infinito sutil)
- Featured card con layout diferenciado
- Active negative space en hero (el blanco como conductor)

### 4.4 Affordance Orgánico

**Ya implementado**:
- ✅ whileTap scale en botones
- ✅ whileHover lift en cards
- ✅ Layout animations en grid
- ✅ Loading spinners
- ✅ Selected ring en cards

**Agregar**:
- Hero text entrance animation
- Search bar progressive reveal animation
- Feedback háptico visual al fallar búsqueda (desaturación sutil)
- Marker click ripple effect

---

## 5. Propuesta: Nueva Estructura de Homepage

```
┌─────────────────────────────────────────────────────┐
│ HEADER (glass-pill, fixed)                          │  ← 3 chunks
│ [H] HospedaSuite          [ES/EN]  [Acceso]         │
├─────────────────────────────────────────────────────┤
│                                                     │
│ HERO (1 chunk, con animación)                       │  ← 1 chunk
│ ╔═══════════════════════════════════════════╗       │
│ ║  Encuentra tu lugar seguro                ║       │
│ ║  Reserva directo · Sin comisiones         ║  NEW  │
│ ║  ↓ (scroll indicator animado)             ║  NEW  │
│ ╚═══════════════════════════════════════════╝       │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ SEARCH (progressive disclosure)                     │  ← 1-3 chunks
│                                                     │
│ Estado 1 (inicial):                                 │
│ ┌─────────────────────────────────────────────┐     │
│ │ 📍 ¿A dónde querés escapar?                 │     │  ← Solo ubicación
│ └─────────────────────────────────────────────┘     │
│                                                     │
│ Estado 2 (después de elegir ubicación):             │
│ ┌────────────┬────────────┬──────────┬──────┐       │
│ │ 📍 Minca   │ 📅 15-20   │ 👤 2     │ 🔍   │  NEW  │
│ └────────────┴────────────┴──────────┴──────┘       │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ CATEGORIES (3 chunks)                               │  ← 3 chunks
│ [⛺ Glamping]  [🏨 Hoteles]  [⚙️ Más ▾]            │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ RESULTS HEADER (3 chunks)                           │  ← 3 chunks
│ 12 alojamientos    [Ver mapa]                       │
│ [Recomendados ▾]  [Precio ▾]  [Rating ▾]     NEW   │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ FEATURED CARD (1 chunk, rompe la grilla)      NEW   │  ← 1 chunk
│ ╔═══════════════════════════════════════════╗       │
│ ║  ⭐ Selección HospedaSuite                ║       │
│ ║  [Imagen más grande + info destacada]     ║       │
│ ╚═══════════════════════════════════════════╝       │
│                                                     │
│ HOTEL GRID (3 cols, 6 cards iniciales)              │  ← 18 elementos
│ [Card]  [Card]  [Card]                              │
│ [Card]  [Card]  [Card]                              │
│                                                     │
│                 [Mostrar más]                       │  ← 1 chunk
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Cambios Clave

| # | Cambio | Principio | Impacto |
|---|--------|-----------|---------|
| 1 | Hero con subtitle + scroll indicator | Affordance orgánico | Espacio desperdiciado → guía visual |
| 2 | Search bar progressive disclosure | Hick (1 decisión a la vez) | 3 decisiones → 1 decisión |
| 3 | Botón "Buscar" explícito en desktop | Affordance | Búsqueda implícita → commit claro |
| 4 | Sorting controls (Recomendados, Precio, Rating) | Hick (marco de decisión) | Elección libre → elección guiada |
| 5 | Featured card rompe la grilla | Miller (guía el ojo) | Grid uniforme → punto focal |
| 6 | Grid 3 cols (no 4), 6 cards (no 24) | Miller (32→18 elementos) | Ruido visual → espacio negativo |
| 7 | Click marker → scroll a card | Sync bidireccional | Mapa aislado → puente visual |
| 8 | "X km del centro" en cards | Progressive disclosure | Sin contexto → contexto inmediato |
| 9 | Mini-pins (2-tier) en mapa | Miller (reducir ruido) | Todos gritan → jerarquía visual |
| 10 | Mobile bottom bar unificado | Miller (5→2 flotantes) | Mapa cluttered → limpio |

---

## 6. Roadmap de Implementación

### Sprint 1: Homepage Core (~200 líneas, 2-3 días)

| Feature | Archivos | Esfuerzo |
|---------|----------|----------|
| Hero redesign (subtitle + scroll indicator + animation) | `OTADashboard.tsx` | 🟢 1h |
| Search bar progressive disclosure | `SearchBarUnified.tsx`, `OTADashboard.tsx` | 🟡 3h |
| Sorting controls | `OTADashboard.tsx` | 🟢 2h |
| Grid 3 cols, 6 cards iniciales | `OTADashboard.tsx` | 🟢 1h |

### Sprint 2: Featured Card + Proximity (~200 líneas, 2-3 días)

| Feature | Archivos | Esfuerzo |
|---------|----------|----------|
| Featured card ("Selección HospedaSuite") | `FeaturedCard.tsx` (new), `OTADashboard.tsx` | 🟡 3h |
| Proximity context en cards ("X km del centro") | `HotelCard.tsx`, `bounds-filter.ts` | 🟡 3h |
| Click marker → scroll a card (sync completa) | `MarkerLifecycleManager.tsx`, `OTADashboard.tsx` | 🟢 2h |

### Sprint 3: Mini-Pins + Map Polish (~250 líneas, 3-4 días)

| Feature | Archivos | Esfuerzo |
|---------|----------|----------|
| Mini-pins (2-tier system) | `MarkerLifecycleManager.tsx`, `map.css` | 🟡 4h |
| Map re-centering inteligente | `MapTransitionController.tsx` | 🟡 3h |
| Mobile bottom bar unificado | `OTADashboard.tsx`, `map.css` | 🟡 3h |

### Sprint 4: Bottom Sheet + Tests (~150 líneas, 2-3 días)

| Feature | Archivos | Esfuerzo |
|---------|----------|----------|
| Bottom sheet swipeable (mobile) | `MobileSearchSheet.tsx` | 🟡 4h |
| Tests para nuevas features | `__tests__/unit/` | 🟡 3h |
| Polish final + accessibility | Varios | 🟢 2h |

**Total estimado**: ~800 líneas, 4 sprints, 10-13 días

---

## 7. Métricas de Éxito

| Métrica | Baseline | Target | Cómo medir |
|---------|----------|--------|------------|
| Elementos above fold | ~21 | ≤15 | Conteo manual |
| Elementos primer scroll | ~53+ | ≤30 | Conteo manual |
| Miller violations | 2 | 0 | Audit heurístico |
| Hick violations | 2 | 0 | Audit heurístico |
| Map engagement | Toggle opcional | 50%+ usuarios | Event `map_view` |
| Card ↔ map sync usage | 0 | 30%+ interacciones | Events `marker_click`, `card_hover` |
| Time to first click | ~8s | <5s | Performance observer |
| Bounce rate (map users) | N/A | <25% | Analytics |

---

## 8. Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Progressive disclosure confunde | Media | Alto | A/B test con 50% usuarios |
| Featured card parece publicidad | Baja | Medio | Diseño orgánico, no banner |
| Mini-pins confunden usuarios | Media | Alto | Tooltip al hover: "X alojamientos más en esta zona" |
| Scroll automático molesto | Baja | Medio | Solo si card fuera de viewport |
| Performance con muchos markers | Media | Alto | Mini-pins reducen carga de render |

---

## 9. Out of Scope

- ML ranking para pins (requiere infra de datos)
- A/B testing framework (separate PRD)
- Draw zones on map (power user, bajo ROI)
- Google Maps migration (Leaflet es suficiente)
- Location score numérico (Booking-style 9.4/10)
- Split-view desktop 60/40 (requiere refactor mayor del layout)

---

## 10. Appendix: Referencia de Principios

### Ley de Miller (7 ± 2 chunks)
- Máximo 5 elementos visuales simultáneos por sección
- Mini-pins = 1 chunk (awareness), pins = 1 chunk (precio), clusters = 1 chunk (densidad)
- Grid: 3 cols × 6 cards = 18 elementos (dentro del límite con agrupación)

### Ley de Hick (parálisis por elección)
- Una acción primaria por pantalla
- Search bar: 1 decisión a la vez (ubicación → fechas → huéspedes)
- Grid: sorting controls dan marco de decisión

### Progressive Disclosure
- Capa 1: Hero + Location → "¿A dónde?"
- Capa 2: Dates + Guests + Buscar → "¿Cuándo y cuántos?"
- Capa 3: Categories + Grid → "Elegí"
- Capa 4: Mapa → "Explorá"
- Capa 5: Detalle → "Reservá"

### Mac 2026
- Squircles en todos los elementos interactivos
- Glassmorphism 2.0 (backdrop blur 10-40px)
- Spring physics (cubic-bezier 0.34, 1.56, 0.64, 1)
- Specular highlights (::before gradient)
- Espacio negativo activo como conductor de mirada

### Affordance Orgánico
- Micro-interacciones en cada click (whileTap, whileHover)
- Feedback háptico visual (desaturación en error, no pop-ups)
- Animaciones de entrada (hero fade-in-up, search reveal)
- Scroll indicator como affordance direccional
