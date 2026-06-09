# PRD-015: Auditoría Forense — Sistema de Modales de Calendario

## Contexto
El usuario reporta que el modal de calendario se sale de la pantalla cuando hay scroll previo, y no permanece centrado. Se realizó una auditoría forense de los 3 componentes que manejan calendarios.

## Hallazgos Forenses

### 1. SearchBarUnified.tsx (Dashboard OTA)
**Ubicación**: `src/components/ota/SearchBarUnified.tsx`

**Problemas identificados**:
- ✅ Ya usa `createPortal` a `document.body` (correcto)
- ✅ Ya tiene scroll lock (`document.body.style.overflow = "hidden"`)
- ❌ **Cadena de alturas rota**: `max-h-[85dvh]` no define altura explícita, solo un máximo. `flex-1` no funciona sin altura definida en el padre.
- ❌ **Falta `min-h-0`** en contenedores flex scrolleables (bug conocido de flexbox)
- ❌ **Animación slide-up**: `y: "100%"` → `y: 0` es para bottom sheets, no para modales centrados

### 2. AvailabilitySearchBar.tsx (Página de Hotel)
**Ubicación**: `src/components/ota/AvailabilitySearchBar.tsx`

**Problemas críticos**:
- ❌ **NO usa portal**: El modal está anidado dentro de `<div className="relative w-full z-[var(--z-dropdown)]">`
- ❌ **`fixed` positioning roto**: Al estar dentro de un contenedor con `transform` (motion.div padre en OTADashboard), el `fixed` se comporta como `absolute` relativo al padre
- ❌ **Bottom sheet en mobile**: `items-end md:items-center` — en mobile aparece desde abajo, no centrado
-  **Sin scroll lock**: No bloquea el scroll del body cuando el modal está abierto
- ❌ **Cadena de alturas rota**: Mismo problema que SearchBarUnified

### 3. MobileSearchSheet.tsx (Sheet móvil de búsqueda)
**Ubicación**: `src/components/ota/MobileSearchSheet.tsx`

**Estado**: Funciona correctamente como bottom sheet. El calendario se muestra inline dentro del sheet, no como modal separado.

**Problemas menores**:
- ❌ El calendario inline no tiene contención de altura cuando el sheet es pequeño

## Root Cause Analysis

### Problema #1: `fixed` positioning roto por `transform` del padre
Cuando un elemento con `position: fixed` está dentro de un contenedor con `transform` (como `motion.div` con animaciones), el `fixed` se comporta como `absolute` relativo a ese contenedor.

**Evidencia**:
```tsx
// OTADashboard.tsx line ~1022
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}  // <-- transform crea nuevo stacking context
  animate={{ opacity: 1, scale: 1 }}
>
  <SearchBarUnified />  // <-- el modal fixed queda atrapado aquí
</motion.div>
```

**Solución**: Usar `createPortal` para renderizar el modal directamente en `document.body`.

### Problema #2: Cadena de alturas flexbox rota
`flex-1` no funciona si el padre no tiene altura explícita. `max-h` no es suficiente.

**Evidencia**:
```tsx
<div className="flex flex-col max-h-[85dvh]">  // <-- max-h no define altura
  <div className="flex-1 overflow-y-auto">     // <-- flex-1 no tiene referencia
```

**Solución**: Usar `h-[85dvh]` o `style={{ maxHeight: "min(85dvh, 600px)" }}` con altura explícita en el padre.

### Problema #3: Scroll del body no bloqueado
Cuando el modal está abierto, el body sigue scrolleando, lo que hace que el modal se mueva con la página.

**Solución**: `document.body.style.overflow = "hidden"` cuando el modal está abierto.

### Problema #4: Animación de bottom sheet en lugar de modal centrado
`y: "100%"` → `y: 0` es para bottom sheets que suben desde abajo. Para modales centrados se necesita `scale: 0.95` → `1` con `items-center justify-center`.

## Plan de Solución

### Fase 1: Fix AvailabilitySearchBar (prioridad alta)
1. Agregar `createPortal` para renderizar el modal en `document.body`
2. Agregar scroll lock cuando el modal está abierto
3. Cambiar a modal centrado en mobile y desktop
4. Fixear cadena de alturas con `min-h-0` y altura explícita

### Fase 2: Fix SearchBarUnified (prioridad media)
1. Verificar que el portal funcione correctamente
2. Fixear cadena de alturas con `min-h-0`
3. Cambiar animación a scale+fade en lugar de slide-up

### Fase 3: Fix MobileSearchSheet (prioridad baja)
1. Agregar contención de altura al calendario inline

## Criterios de Aceptación

- [ ] El modal de calendario aparece centrado en la pantalla en mobile y desktop
- [ ] El modal permanece fijo cuando se hace scroll en la página
- [ ] El calendario se ve completo sin cortarse por arriba ni por abajo
- [ ] El scroll del body está bloqueado cuando el modal está abierto
- [ ] La animación de apertura es scale+fade (no slide-up)
- [ ] El modal se cierra al hacer click en el backdrop
- [ ] Funciona correctamente en todos los breakpoints (mobile, tablet, desktop)

## Impacto Estimado
- **Archivos modificados**: 2 (`SearchBarUnified.tsx`, `AvailabilitySearchBar.tsx`)
- **Líneas cambiadas**: ~80-100
- **Riesgo**: Bajo (solo afecta modales de calendario)
- **Testing requerido**: Manual en mobile y desktop
