# PRD-007: Mapa Interactivo con Búsqueda — El Mapa Sobrevive Sin Hoteles

**Status**: Draft  
**Created**: 2026-05-29  
**Parent**: PRD-006 (Map-First Discovery)  
**Priority**: Critical  
**Driver**: Bug forense — el mapa desaparece al buscar una ciudad sin hoteles

---

## 1. Problema

### 1.1 Bug Actual

Cuando el usuario busca una ciudad (ej: "Medellín") y no hay hoteles en esa ciudad:
- `fetchOTAHotelsAction` retorna `[]`
- `sortedHotels.length === 0` → el mapa **desaparece completamente**
- El usuario ve solo el empty state "No hay alojamientos"
- No hay feedback visual de DÓNDE está buscando

### 1.2 Segundo Bug: Mapa No Vuela a la Ciudad Buscada

Incluso cuando SÍ hay hoteles, si el usuario busca "Cartagena" pero los hoteles están en "Minca":
- El mapa se monta (porque hay hoteles)
- Pero el mapa muestra **Bogotá por defecto** (`center={[4.6097, -74.0817]}`)
- `MapTransitionController` recibe `centerLocation="Cartagena"` pero `geocodeLocation` puede fallar o tardar
- El usuario no ve la ciudad que buscó — ve un mapa genérico

### 1.3 Tercer Bug: Hoteles Sin Coordenadas No Aparecen

Los hoteles tienen `location: "Cartagena"` pero:
- `getCachedCoords("Cartagena")` depende del geo-cache pre-seedado
- Si la ciudad no está en el cache → `undefined` → el marker nunca se crea
- El usuario ve el mapa vacío sin markers

---

## 2. Principios de Diseño Aplicados

### 2.1 Reduccionismo Cognitivo

| Principio | Aplicación |
|-----------|------------|
| **Ley de Miller** | El mapa es 1 chunk — no se fragmenta en "modo lista" vs "modo mapa" |
| **Ley de Hick** | 1 decisión por pantalla: búsqueda → mapa responde automáticamente |
| **Saliencia Visual** | El CTA del mapa es el mapa mismo — 80% del viewport en mobile |

### 2.2 Arquitectura de Información Invisible

```
Capa 1 (siempre visible): Mapa con la ciudad buscada centrada
Capa 2 (si hay hoteles): Markers con precios
Capa 3 (si hay 1 hotel): Card expandida
Capa 4 (si hay 0 hoteles): Empty state sobre el mapa "No hay hoteles aquí — explorá otra zona"
```

**Anticipación UX**: El mapa SIEMPRE muestra la ciudad buscada, haya hoteles o no.

### 2.3 Estética Mac 2026

- Empty state sobre el mapa con glassmorphism (backdrop-blur 20px)
- Spring physics en la transición flyTo (duration: 1.2s, easeLinearity: 0.25)
- Squircles en el empty state card
- Specular highlight en el borde del empty state

### 2.4 Affordance Orgánico

- Si no hay hoteles: el mapa hace un "shake" sutil + empty state glassmorphic
- Si la ciudad no se encuentra: el mapa vuela a Colombia (default) con toast sutil
- Si hay hoteles pero sin coordenadas: markers placeholder con animación pulse

---

## 3. Solución Técnica

### 3.1 Mapa Independiente de la Lista

**Antes:**
```tsx
{sortedHotels.length > 0 && <HotelMapView ... />}
```

**Después:**
```tsx
{/* Mapa SIEMPRE visible */}
<HotelMapView
  hotels={sortedHotels}  // puede ser []
  centerLocation={urlLocation}  // vuela a la ciudad buscada
  fallbackCenter={DEFAULT_COLOMBIA_CENTER}  // si no geocodifica
/>

{/* Empty state SOBRE el mapa, no reemplazándolo */}
{sortedHotels.length === 0 && (
  <div className="absolute inset-0 flex items-center justify-center z-10">
    <GlassPanel>
      <MapPin size={48} />
      <p>No hay hoteles en {urlLocation}</p>
      <p className="text-sm">Explorá otra zona o ajustá los filtros</p>
    </GlassPanel>
  </div>
)}
```

### 3.2 Geo-Cache Fallback

**Problema actual:** `getCachedCoords()` retorna `undefined` si la ciudad no está pre-seedada.

**Solución:**
```typescript
// geo-cache.ts
export async function getCoordsWithFallback(city: string): Promise<{ lat: number; lng: number } | null> {
  // 1. Cache pre-seedado
  const cached = getCachedCoords(city);
  if (cached) return cached;

  // 2. Geocoding API (Nominatim)
  const result = await geocodeLocation(city);
  if (result) return { lat: result.lat, lng: result.lng };

  // 3. Fallback: centro de Colombia
  return { lat: 4.6097, lng: -74.0817 };
}
```

### 3.3 MapTransitionController Mejorado

**Problema actual:** Solo vuela si `centerLocation` cambia, pero no maneja el caso de "no hay hoteles".

**Solución:**
```typescript
// Effect 1: Siempre vuela a la ciudad buscada (independiente de hoteles)
useEffect(() => {
  if (!centerLocation) return;
  geocodeLocation(centerLocation).then(result => {
    if (result) {
      setInternalMove();
      map.flyTo([result.lat, result.lng], 12, { duration: 1.2 });
    }
  });
}, [centerLocation]);

// Effect 2: Si NO hay hoteles Y NO hay centerLocation → fitBounds de Colombia
useEffect(() => {
  if (hotels.length === 0 && !centerLocation) {
    map.flyTo(DEFAULT_COLOMBIA_CENTER, 6, { duration: 1.0 });
  }
}, [hotels.length, centerLocation]);
```

---

## 4. Roadmap de Implementación

### Phase 1: Mapa Independiente (~100 líneas)

| Feature | Archivos | Esfuerzo |
|---------|----------|----------|
| Mapa siempre visible (eliminar condición `sortedHotels.length > 0`) | `OTADashboard.tsx` | 🟢 1h |
| Empty state sobre el mapa (glassmorphic) | `OTADashboard.tsx`, `map.css` | 🟡 2h |
| Fallback center en HotelMapView | `HotelMapView.tsx` | 🟢 0.5h |

### Phase 2: Geo-Cache Fallback (~80 líneas)

| Feature | Archivos | Esfuerzo |
|---------|----------|----------|
| `getCoordsWithFallback()` en geo-cache | `geo-cache.ts` | 🟡 2h |
| MarkerLifecycleManager usa fallback | `MarkerLifecycleManager.tsx` | 🟡 1h |
| Markers placeholder para hoteles sin coords | `MarkerLifecycleManager.tsx`, `map.css` | 🟡 2h |

### Phase 3: MapTransition Robust (~60 líneas)

| Feature | Archivos | Esfuerzo |
|---------|----------|----------|
| flyTo siempre que cambie centerLocation | `MapTransitionController.tsx` | 🟢 1h |
| Fallback a Colombia si no geocodifica | `MapTransitionController.tsx` | 🟢 0.5h |
| Loading state durante geocoding | `HotelMapView.tsx` | 🟢 1h |

### Phase 4: Tests + Polish (~80 líneas)

| Feature | Archivos | Esfuerzo |
|---------|----------|----------|
| Tests: mapa sin hoteles, geo fallback, flyTo | `__tests__/unit/prd-007-features.test.ts` | 🟡 2h |
| Empty state animations (spring, shake) | `map.css` | 🟢 1h |
| TypeScript + lint | — | 🟢 0.5h |

**Total estimado**: ~320 líneas, 4 phases, 1-2 días

---

## 5. Métricas de Éxito

| Métrica | Baseline | Target | Cómo medir |
|---------|----------|--------|------------|
| Mapa visible al buscar | 0% (si no hay hoteles) | 100% | Manual testing |
| Ciudad buscada centrada | ~30% (solo si hay hoteles) | >90% | Geocoding success rate |
| Hotels con markers | ~60% (solo cacheados) | >95% | Marker count / hotel count |
| Empty state sobre mapa | N/A | Implementado | Visual audit |

---

## 6. Criterios de Aceptación

- [ ] Mapa visible SIEMPRE, haya hoteles o no
- [ ] Empty state glassmorphic sobre el mapa cuando no hay hoteles
- [ ] Mapa vuela a la ciudad buscada (geocoding con fallback)
- [ ] Hoteles sin coordenadas muestran marker placeholder
- [ ] Si la ciudad no geocodifica → vuela a Colombia con toast sutil
- [ ] Spring physics en todas las transiciones
- [ ] Zero regresiones en split-view desktop
- [ ] Zero regresiones en mobile bottom sheet
- [ ] TypeScript 0 errores, ESLint 0 errores
- [ ] Tests unitarios para geo fallback y flyTo logic
