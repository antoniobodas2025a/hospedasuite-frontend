# PRD-008: Búsqueda Inteligente Nivel Airbnb — Pipeline de 5 Capas

**Status**: Draft  
**Created**: 2026-05-29  
**Parent**: PRD-007 (Mapa Interactivo con Búsqueda)  
**Priority**: Critical  
**Driver**: Investigación forense de Airbnb — cómo su búsqueda SIEMPRE encuentra resultados

---

## 1. El Problema Actual (Explicado Sencillo)

### Cómo busca HospedaSuite HOY

```
Usuario escribe "medellin"
  ↓
Servidor hace: WHERE location ILIKE '%medellin%'
  ↓
Si hay coincidencia exacta → muestra resultados
Si NO hay coincidencia → "No hay alojamientos" ← FIN
```

**Problema**: Es como buscar en un diccionario solo si escribís la palabra PERFECTA. Un typo, un acento, o una ciudad que no está en la base de datos → resultado vacío.

### Cómo busca Airbnb (y cómo DEBERÍA buscar HospedaSuite)

```
Usuario escribe "medellin cerca al parque lleras"
  ↓
Capa 1: ENTENDER qué quiere (corrige typos, entiende "cerca a")
Capa 2: ENCONTRAR dónde es (geocodifica "Parque Lleras" → coordenadas)
Capa 3: BUSCAR candidatos (hoteles en radio de 2km, con fechas disponibles)
Capa 4: ORDENAR por relevancia (mejor valorados, mejor precio, más populares)
Capa 5: MOSTRAR inteligente (mapa + lista, sugerencias si no hay exactos)
```

**Diferencia clave**: Airbnb NUNCA dice "0 resultados". Si no encuentra exactos, expande, sugiere, relaja filtros.

---

## 2. Los 5 Principios de Airbnb (Adaptados a HospedaSuite)

### Principio 1: La Búsqueda es un PIPELINE, no una Query

**Explicación sencilla**: Imaginá que buscar hoteles es como pedir comida en un restaurante:

1. **Entender el pedido** → "Quiero algo liviano" = ensalada, no hamburguesa
2. **Ver qué hay disponible** → El chef revisa la cocina
3. **Ordenar por preferencia** → Lo más fresco primero, lo más pedido después
4. **Presentar bien** → Plato bonito, no servido en la olla

**HospedaSuite hoy solo hace el paso 2** (y mal). Necesitamos los 4 pasos.

### Principio 2: Perdón > Precisión

**Explicación sencilla**: Si el usuario escribe "medellin" (sin tilde), "Cartagena de Indias" (nombre largo), o "cerca al centro" (vago), el sistema debe ENTENDER, no rechazar.

**Airbnb hace esto con**:
- **Fuzzy matching**: "medellin" → "Medellín" (corrige acentos)
- **Phonetic matching**: "Cartahena" → "Cartagena" (corrige por sonido)
- **Semantic matching**: "cerca al parque" → busca coordenadas del parque más cercano
- **Knowledge graph**: "CDMX" = "Ciudad de México" = "Mexico City" (sinónimos)

### Principio 3: Velocidad se Siente más que Precisión

**Explicación sencilla**: El usuario prefiere resultados "bastante buenos" en 200ms que resultados "perfectos" en 3 segundos.

**Airbnb logra esto con**:
- **Caching multi-nivel**: Edge CDN → Apollo cache → Query cache → Pre-computed
- **Stale-while-revalidate**: Muestra lo cacheado mientras actualiza en background
- **Debouncing**: Espera 300ms antes de buscar (no busca con cada tecla)
- **Virtualización**: Solo renderiza las cards visibles en pantalla

### Principio 4: El Mapa ES la Interfaz

**Explicación sencilla**: Cuando buscás alojamiento, no querés una lista — querés VER dónde estás quedando. El mapa no es un "extra", es la forma principal de explorar.

**Airbnb hace esto con**:
- Split-view: mapa + lista siempre visibles
- Clusters: cuando hay muchos pins, los agrupa por zona
- Hover sync: pasás el mouse sobre una card → el pin se ilumina
- Bounds filtering: solo muestra hoteles en la zona visible del mapa

### Principio 5: Nunca Dead-End (Sin Salida)

**Explicación sencilla**: Si no hay resultados exactos, el sistema NUNCA dice "0 resultados" y se queda ahí. Siempre ofrece alternativas.

**Airbnb hace esto con una cadena de relajación**:
1. ¿Coincidencia exacta? → Mostrá
2. ¿No? → Expandí fechas ±1-2 días
3. ¿No? → Sacá el filtro menos importante
4. ¿No? → Expandí radio geográfico (2km → 5km → 10km)
5. ¿No? → Mostrá populares en la región
6. ¿Realmente cero? → "No encontramos en X, pero mirá estas alternativas en Y"

---

## 3. Arquitectura de Búsqueda Propuesta para HospedaSuite

### Pipeline de 5 Capas

```
┌─────────────────────────────────────────────────────────────────┐
│                    HOSPEDASUITE SEARCH PIPELINE                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Capa 1: QUERY UNDERSTANDING (Entendimiento)                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ • Fuzzy matching: "medellin" → "Medellín"                 │  │
│  │ • Phonetic: "Cartahena" → "Cartagena"                     │  │
│  │ • Accent-insensitive: "Bogotá" = "Bogota"                 │  │
│  │ • Intent detection: "barato" → filter by price            │  │
│  │ • Synonym graph: "glamping" = "domo" = "cabaña luxe"      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  Capa 2: CANDIDATE RETRIEVAL (Búsqueda de candidatos)          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ • Full-text search: nombre, descripción, amenities        │  │
│  │ • Geo-spatial: hoteles en radio de X km                   │  │
│  │ • Availability pre-filter: solo disponibles en fechas     │  │
│  │ • Category filter: "glamping", "hostal", "hotel"          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  Capa 3: RANKING (Ordenamiento inteligente)                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ • Quality score: reviews + fotos + respuesta del host     │  │
│  │ • Price competitiveness: vs similares en la zona          │  │
│  │ • Popularity: clicks recientes, reservas                  │  │
│  │ • Personalization: búsquedas previas del usuario          │  │
│  │ • Diversity: no mostrar 10 del mismo tipo seguidos        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  Capa 4: BUSINESS RULES (Reglas de negocio)                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ • Superhost boost: hoteles verificados primero            │  │
│  │ • New listing promotion: nuevos hoteles tienen chance     │  │
│  │ • Price fairness: no mostrar caros si hay baratos cerca   │  │
│  │ • Commission priority: OTA vs direct (10% vs 0%)          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  Capa 5: PRESENTATION (Presentación inteligente)               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ • Map + list hybrid: split-view siempre visible           │  │
│  │ • Progressive disclosure: filtros aparecen cuando нужны   │  │
│  │ • No-results fallback: cadena de relajación               │  │
│  │ • Smart suggestions: "¿Querías decir Medellín?"           │  │
│  │ • Flexible dates: calendario con precios                  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Cómo Funciona Cada Capa (Explicación Sencilla)

### Capa 1: Entendimiento — "¿Qué querés?"

**Problema que resuelve**: El usuario no siempre sabe cómo se escribe el lugar, o usa palabras vagas.

**Cómo funciona**:

```
Usuario escribe: "medellin barato cerca al parque"
  ↓
1. Corrección ortográfica:
   "medellin" → "Medellín" (agrega tilde)
   
2. Entendimiento de intención:
   "barato" → filter: max_price = bajo
   "cerca al parque" → geocodificar "parque" en Medellín
   
3. Búsqueda de entidad:
   ¿Qué parque? → Parque Arví, Parque Lleras, Parque Berrío
   → Usar el más popular (Parque Lleras tiene más búsquedas)
   
4. Resultado de esta capa:
   {
     location: "Medellín",
     coords: { lat: 6.2476, lng: -75.5658 },
     filters: { max_price: 150000 },
     intent: "budget_friendly"
   }
```

**Implementación en HospedaSuite**:
- Usar `fuse.js` o `Meilisearch` para fuzzy matching
- Knowledge graph simple: JSON con sinónimos de ciudades
- Intent detection: regex simple ("barato", "lujo", "familia", "pareja")

### Capa 2: Búsqueda de Candidatos — "¿Qué hay disponible?"

**Problema que resuelve**: De miles de hoteles, encontrar los que matchean con lo que el usuario quiere.

**Cómo funciona**:

```
Input de Capa 1: { location: "Medellín", coords: {...}, filters: {...} }
  ↓
1. Búsqueda textual (Elasticsearch/Meilisearch):
   - Buscar en: nombre, descripción, amenities
   - Query: "Medellín" + filtros aplicados
   
2. Búsqueda geoespacial:
   - Hoteles en radio de 5km del centro de Medellín
   - ORDER BY distancia ASC (más cercanos primero)
   
3. Pre-filtro de disponibilidad:
   - Solo hoteles con habitaciones disponibles en las fechas
   - NO mostrar hoteles que ya están full
   
4. Filtro de categoría:
   - Si usuario eligió "glamping" → solo glampings
   - Si no eligió → todos los tipos
   
5. Resultado: ~50-200 candidatos (de miles totales)
```

**Implementación en HospedaSuite**:
- Supabase ya tiene `pg_search` (full-text search en Postgres)
- PostGIS para búsquedas geoespaciales (`ST_DWithin`)
- Availability check: JOIN con rooms WHERE status = 'active' AND capacity >= guests

### Capa 3: Ranking — "¿Cuál es el mejor?"

**Problema que resuelve**: De 200 candidatos, ¿cuáles mostrar primero?

**Cómo funciona**:

```
Input de Capa 2: ~200 candidatos
  ↓
Cada hotel recibe un "score" compuesto:

score = (
  quality_score * 0.35 +      // Reviews, fotos, completitud
  price_score * 0.25 +         // Competitividad de precio
  popularity_score * 0.20 +    // Clicks, reservas recientes
  distance_score * 0.15 +      // Cercanía al centro/búsqueda
  personalization_score * 0.05 // Historial del usuario
)

Ejemplo:
Hotel A: quality=0.9, price=0.7, popularity=0.8, distance=0.6, personal=0.5
  → score = 0.9*0.35 + 0.7*0.25 + 0.8*0.20 + 0.6*0.15 + 0.5*0.05
  → score = 0.315 + 0.175 + 0.160 + 0.090 + 0.025 = 0.765

Hotel B: quality=0.7, price=0.9, popularity=0.5, distance=0.9, personal=0.3
  → score = 0.245 + 0.225 + 0.100 + 0.135 + 0.015 = 0.720

→ Hotel A aparece primero (0.765 > 0.720)
```

**Implementación en HospedaSuite**:
- Empezar con scoring simple (SQL weighted sum)
- Después migrar a XGBoost si hay suficientes datos
- Personalization: usar cookies/localStorage para historial de sesión

### Capa 4: Reglas de Negocio — "¿Qué conviene al negocio?"

**Problema que resuelve**: A veces el "mejor" hotel no es el que más conviene mostrar.

**Cómo funciona**:

```
Input de Capa 3: 200 candidatos ordenados por score
  ↓
Ajustes post-ranking:

1. Superhost boost:
   - Hoteles verificados suben 3 posiciones
   
2. New listing promotion:
   - Hoteles nuevos (< 30 días) tienen chance de aparecer
   - Evita el "cold start problem" (nuevos nunca aparecen)
   
3. Price fairness:
   - Si hay 10 hoteles caros seguidos → intercalar uno barato
   - El usuario no debe sentir que todo es caro
   
4. Commission priority:
   - OTA bookings (10% comisión) tienen leve boost
   - Pero no tanto que degrade la experiencia del usuario
   
5. Diversity constraint:
   - No mostrar 5 "glampings" seguidos
   - Mezclar tipos: hotel, hostal, glamping, cabaña
   
Resultado final: lista optimizada para usuario Y negocio
```

**Implementación en HospedaSuite**:
- Reglas simples en JavaScript después del ranking
- Diversity: algoritmo de round-robin por categoría
- Commission boost: +5% al score si `source === 'ota'`

### Capa 5: Presentación — "¿Cómo se lo mostramos?"

**Problema que resuelve**: Incluso los mejores resultados no sirven si se muestran mal.

**Cómo funciona**:

```
Input de Capa 4: lista final ordenada
  ↓
Presentación inteligente:

1. Map + List Hybrid (siempre visible):
   - Desktop: split-view 40% lista / 60% mapa
   - Mobile: mapa full + bottom sheet draggable
   
2. Progressive Disclosure:
   - Primero: ubicación + fechas (lo esencial)
   - Después: filtros avanzados (solo si el usuario los pide)
   - Nunca abrumar con 15 filtros de entrada
   
3. No-Results Fallback Chain:
   Si no hay resultados:
   a. ¿Fechas flexibles? → Expandir ±2 días
   b. ¿Radio expandible? → 5km → 10km → 20km
   c. ¿Filtros relajables? → Sacar el menos importante
   d. ¿Región alternativa? → Mostrar ciudades cercanas
   e. ¿Realmente cero? → "Explorá estas alternativas" + sugerencias
   
4. Smart Suggestions:
   - "¿Querías decir Medellín?" (si hay typo)
   - "50 resultados en Medellín, 120 en el Área Metropolitana"
   - "Los precios más bajos son el martes"
   
5. Flexible Dates:
   - Calendario con precios por día
   - "Fin de semana", "Semana", "Mes" presets
   - Highlight de días baratos
```

**Implementación en HospedaSuite**:
- Ya tenemos split-view (PRD-006)
- Fallback chain: nueva lógica en OTADashboard
- Suggestions: componente nuevo `SearchSuggestions.tsx`
- Flexible dates: extensión del date picker existente

---

## 5. Principios de Diseño Aplicados

### 5.1 Reduccionismo Cognitivo (Miller + Hick)

| Principio | Implementación |
|-----------|----------------|
| **Ley de Miller** (≤5 chunks) | Search bar: 3 controles máximo (ubicación, fechas, huéspedes). Filtros avanzados ocultos detrás de "Refinar" |
| **Ley de Hick** (1 decisión/pantalla) | Paso 1: ¿Dónde? → Paso 2: ¿Cuándo? → Paso 3: ¿Cuántos? → Resultados. Nunca 3 decisiones a la vez |
| **Saliencia Visual** | El CTA principal (buscar/reservar) usa peso tipográfico + escala, no color estridente. 80% de atención en el mapa + card principal |

### 5.2 Arquitectura de Información Invisible

| Principio | Implementación |
|-----------|----------------|
| **Progressive Disclosure** | Capa 1 (query understanding) es invisible. Capa 2 (retrieval) invisible. Capa 3 (ranking) invisible. Solo la Capa 5 (presentación) es visible |
| **Anticipación UX** | Si el usuario selecciona fechas → la UI transiciona a mostrar disponibilidad. Si selecciona ubicación → el mapa vuela ahí automáticamente |

### 5.3 Estética Mac 2026

| Principio | Implementación |
|-----------|----------------|
| **Squircles** | Todos los bordes usan `--radius-squircle-*` (superelipses, no border-radius estándar) |
| **Glassmorphism 2.0** | Search bar: backdrop-blur 20px, border 1px con opacidad 10%. Empty state: backdrop-blur 30px, specular highlight |
| **Tipografía de Precisión** | Geist font, tracking dinámico (-0.02em para headings, 0 para body). Leading: 1.2 para headings, 1.5 para body |
| **Espacio Negativo Activo** | El blanco entre cards no es vacío — guía la mirada del usuario hacia el CTA |

### 5.4 Affordance Orgánico

| Principio | Implementación |
|-----------|----------------|
| **Spring Physics** | flyTo del mapa: duration 1.2s, easeLinearity 0.25. Cards: springBounce (mass: 0.8, stiffness: 180, damping: 14) |
| **Feedback Háptico Visual** | Si no hay resultados: el mapa hace un sutil "pulse" (scale 0.99 → 1.0). Si hay typo: el search bar vibra (translateX ±2px con spring) |
| **Micro-interacciones** | Cada click tiene respuesta física: scale 0.97 en tap, spring en release. Hover en cards: translateY -4px con shadow increase |

---

## 6. Roadmap de Implementación

### Phase 1: Foundation — Query Understanding (~200 líneas)

| Feature | Archivos | Esfuerzo |
|---------|----------|----------|
| Fuzzy matching con fuse.js | `lib/fuzzy-search.ts` (nuevo) | 🟡 2h |
| Accent-insensitive search | `lib/geocoding.ts` (modificar) | 🟢 1h |
| Intent detection (regex simple) | `lib/intent-detection.ts` (nuevo) | 🟢 1h |
| Synonym graph (JSON simple) | `lib/synonym-graph.json` (nuevo) | 🟢 0.5h |
| Location autocomplete mejorado | `components/ota/LocationAutocomplete.tsx` | 🟡 2h |

### Phase 2: Retrieval — Candidate Search (~250 líneas)

| Feature | Archivos | Esfuerzo |
|---------|----------|----------|
| Full-text search con pg_search | `app/actions/ota.ts` (modificar) | 🟡 3h |
| Geo-spatial search con PostGIS | `app/actions/ota.ts` (modificar) | 🟡 3h |
| Availability pre-filter | `app/actions/ota.ts` (modificar) | 🟡 2h |
| Stale-while-revalidate caching | `lib/search-cache.ts` (mejorar) | 🟡 2h |

### Phase 3: Ranking — Scoring Inteligente (~200 líneas)

| Feature | Archivos | Esfuerzo |
|---------|----------|----------|
| Quality score (reviews + fotos) | `lib/ranking.ts` (nuevo) | 🟡 2h |
| Price competitiveness | `lib/ranking.ts` (nuevo) | 🟡 2h |
| Popularity score (clicks) | `lib/ranking.ts` (nuevo) | 🟡 2h |
| Weighted composite ranking | `lib/ranking.ts` (nuevo) | 🟡 1h |
| Diversity constraint (round-robin) | `lib/ranking.ts` (nuevo) | 🟢 1h |

### Phase 4: Presentation — UX Inteligente (~300 líneas)

| Feature | Archivos | Esfuerzo |
|---------|----------|----------|
| No-results fallback chain | `components/ota/OTADashboard.tsx` | 🟡 3h |
| Smart suggestions component | `components/ota/SearchSuggestions.tsx` (nuevo) | 🟡 2h |
| Flexible dates calendar | `components/ota/FlexibleDates.tsx` (nuevo) | 🟡 4h |
| Typo correction UI | `components/ota/SearchSuggestions.tsx` | 🟢 1h |
| Spring animations polish | `lib/mac2026/spring.ts` + CSS | 🟢 2h |

### Phase 5: Tests + Polish (~150 líneas)

| Feature | Archivos | Esfuerzo |
|---------|----------|----------|
| Tests: fuzzy matching, ranking, fallback | `__tests__/unit/prd-008-features.test.ts` | 🟡 3h |
| Performance audit (Lighthouse) | — | 🟡 1h |
| TypeScript + lint | — | 🟢 0.5h |

**Total estimado**: ~1,100 líneas, 5 phases, 3-4 días

---

## 7. Métricas de Éxito

| Métrica | Baseline | Target | Cómo medir |
|---------|----------|--------|------------|
| Búsquedas con resultados | ~60% (solo coincidencias exactas) | >95% (fuzzy + fallback) | Analytics |
| Tiempo a primer resultado | ~2s (espera server) | <500ms (cache + SWR) | Performance timing |
| Typos corregidos | 0% | >90% | Fuzzy match hit rate |
| No-results dead-ends | ~40% de búsquedas fallidas | <5% | Fallback chain success |
| User satisfaction | N/A | >4.0/5 | Post-search survey |

---

## 8. Criterios de Aceptación

- [ ] Fuzzy matching: "medellin" → "Medellín", "Cartahena" → "Cartagena"
- [ ] Accent-insensitive: "Bogotá" = "Bogota" = "bogota"
- [ ] Intent detection: "barato" → filter by max_price
- [ ] Full-text search: buscar en nombre, descripción, amenities
- [ ] Geo-spatial: hoteles en radio de X km
- [ ] Availability pre-filter: solo mostrar disponibles
- [ ] Ranking compuesto: quality + price + popularity + distance
- [ ] Diversity constraint: no mostrar 5 del mismo tipo seguidos
- [ ] No-results fallback chain: 5 niveles de relajación
- [ ] Smart suggestions: "¿Querías decir X?"
- [ ] Flexible dates: calendario con precios
- [ ] Spring physics en todas las transiciones
- [ ] Zero regresiones en split-view desktop
- [ ] Zero regresiones en mobile bottom sheet
- [ ] TypeScript 0 errores, ESLint 0 errores
- [ ] Tests unitarios para fuzzy, ranking, fallback chain

---

## 9. Glosario Sencillo

| Término | Qué significa |
|---------|---------------|
| **Fuzzy matching** | Encontrar resultados aunque el usuario escriba mal ("medellin" → "Medellín") |
| **Phonetic matching** | Encontrar resultados por sonido ("Cartahena" suena como "Cartagena") |
| **Knowledge graph** | Base de datos de sinónimos y relaciones ("CDMX" = "Ciudad de México") |
| **Stale-while-revalidate** | Mostrar lo cacheado mientras se actualiza en background |
| **Ranking** | Ordenar resultados por relevancia, no al azar |
| **Fallback chain** | Si no hay resultados, probar alternativas en cascada |
| **Progressive disclosure** | Mostrar complejidad solo cuando el usuario la necesita |
| **Spring physics** | Animaciones que rebotan como un resorte, no lineales |
| **Glassmorphism** | Efecto de vidrio esmerilado (blur + transparencia) |
| **Squircle** | Esquina redondeada perfecta (superelipse), no un arco simple |
