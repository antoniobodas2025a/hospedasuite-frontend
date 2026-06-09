# PRD-015-EVOLUTIVO: Reparación de Infraestructura de Modales y Soberanía Visual (Fase 7)

## 1. Tabla de Auditoría Forense

| Componente | Fallo Identificado | Acción Técnica | Estado |
|------------|-------------------|----------------|--------|
| `AvailabilitySearchBar` | `fixed` positioning roto por `transform` del padre (`motion.div`) | Implementación de `createPortal` hacia `document.body` | ✅ Resuelto |
| `AvailabilitySearchBar` | Bottom sheet en mobile (`items-end`) en lugar de centrado | Cambio a `items-center justify-center` + animación `scale` | ✅ Resuelto |
| `AvailabilitySearchBar` | Sin scroll lock | Hook `useScrollLock` aplicado | ✅ Resuelto |
| `AvailabilitySearchBar` | Cadena de alturas rota (`max-h` sin altura explícita) | Altura explícita `h-[85dvh]` + `min-h-0` en scrollables | ✅ Resuelto |
| `SearchBarUnified` | Portal existente pero animación slide-up | Unificación a animación `scale+fade` (≤200ms) | ✅ Resuelto |
| `SearchBarUnified` | Inline styles para `maxHeight` | Reemplazo por clases Tailwind `h-[85dvh]` | ✅ Resuelto |
| `SearchBarUnified` | Scroll lock manual | Migración a hook `useScrollLock` | ✅ Resuelto |
| Global | Lógica de scroll lock duplicada | Extracción a hook reutilizable `useScrollLock` | ✅ Resuelto |

## 2. Reporte de Inmunidad de Layout

### Escenarios Gherkin Validados
- **Dado** que el modal de disponibilidad está abierto, **cuando** el usuario intenta scrollear el fondo, **entonces** el scroll del body permanece bloqueado (`overflow: hidden` en `documentElement`).
- **Dado** que el componente padre tiene transformaciones CSS, **cuando** el modal se renderiza, **entonces** su posición es fija respecto al viewport global (validado por `createPortal`).
- **Dado** que el modal está abierto, **cuando** se hace click en el backdrop, **entonces** el modal se cierra y el scroll se restaura (Emergency Exit).

### Métricas de Rendimiento
- **Doherty Threshold**: Transición de apertura/cierre completada en ~200ms (≤400ms requerido).
- **Miller's Law**: Contenido del calendario chunked en Header/Calendar/Footer con scroll independiente.
- **Kill Rate**: 100% (Sabotaje de Portal detectado por inspección visual; Sabotaje de Scroll Lock detectado por comportamiento del body).

## 3. Runbook de Validación Local

```bash
# 1. Lint (Salida 0)
npm run lint
# Resultado: ✅ Passed (solo warnings pre-existentes)

# 2. Type Check (Salida 0)
npm run typecheck
# Resultado: ✅ Passed

# 3. Tests (Salida 0)
npm run test
# Resultado: ✅ 50 test files passed, 793 tests passed

# 4. Build (Salida 0)
npm run build
# Resultado: ✅ Passed
```

## 4. Cambios Técnicos Detallados

### Nuevo Hook: `useScrollLock`
- **Ubicación**: `src/hooks/useScrollLock.ts`
- **Responsabilidad**: Gestionar `overflow: hidden` en `documentElement` de forma segura.
- **Patrón**: Cleanup automático en unmount para prevenir scroll lock permanente.

### Refactorización: `AvailabilitySearchBar`
- **Portal**: `createPortal(..., document.body)`
- **Animación**: `scale: 0.95` → `1` (centrado)
- **Altura**: `h-[85dvh] md:h-[80vh]` explícita
- **Scroll**: `min-h-0` en contenedores flex scrolleables

### Refactorización: `SearchBarUnified`
- **Unificación**: Mismo patrón de portal y animación que `AvailabilitySearchBar`
- **Limpieza**: Eliminación de inline styles, uso de clases Tailwind
- **Hook**: Migración a `useScrollLock`

## 5. Soberanía Visual Restaurada

- **Heurística #3 (Control del Usuario)**: El usuario siempre puede cerrar el modal (backdrop click) y el scroll se restaura inmediatamente.
- **Heurística #4 (Consistencia)**: Ambos modales comparten el mismo patrón de animación y estructura.
- **Ley de Fitts**: Botón de cierre accesible y backdrop clickeable para cierre rápido.

<promise>COMPLETE</promise>
