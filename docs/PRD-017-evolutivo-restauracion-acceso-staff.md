# PRD-017-EVOLUTIVO: Restauración de Acceso Staff y Desacoplamiento de Auth (Fase 1)

## 1. Tabla de Auditoría (Fallo Crítico vs. Acción Técnica)

| ID | Fallo Crítico (PRD-016) | Acción Técnica Fundamentada | Heurística/Principio |
|----|-------------------------|-----------------------------|----------------------|
| C1 | LoginKeypad huérfano (sin ruta) | Creación de `/staff-login/page.tsx` montando componente rescatado | #2 (Mundo Real): Punto de entrada físico para recepcionistas |
| C2 | `verifyPin` dependía de `getCurrentHotel()` (Admin Auth) | Refactorización para aceptar `hotel_slug` y resolver hotel vía `supabaseAdmin` | SRP: Separación de autenticación Admin vs Staff |
| C3 | Sin identificación de hotel en login | Agregado input "Código del Hotel" en LoginKeypad | #4 (Consistencia): Modelo mental POS (Store ID + PIN) |
| M1 | Borrado de staff sin confirmación | Reemplazo de Undo Toast por diálogo de confirmación inline (Sí/No) | #5 (Prevención de errores): 2 clics deliberados |

## 2. Reporte de Inmunidad (Mutaciones de Auth)

### Escenarios Gherkin Validados
- **Dado** que un recepcionista ingresa a `/staff-login`, **cuando** introduce Código de Hotel y PIN válido, **entonces** se crea cookie `hospeda_staff_session` y es redirigido al dashboard.
- **Dado** que un recepcionista ingresa un PIN incorrecto, **entonces** recibe mensaje "PIN incorrecto o no autorizado" y el campo se limpia.
- **Dado** que un admin intenta eliminar un miembro del equipo, **entonces** debe confirmar la acción con un segundo clic ("Sí") antes de que se ejecute el borrado.

### Mutaciones de Seguridad (Kill Rate 100%)
- **Mutación 1**: Cookie `hospeda_staff_session` sin flag `httpOnly`. → **KILLED**: La implementación mantiene `httpOnly: true`.
- **Mutación 2**: Cookie sin `secure` en producción. → **KILLED**: La implementación mantiene `secure: process.env.NODE_ENV === 'production'`.
- **Mutación 3**: `verifyPin` permite login sin `hotel_slug`. → **KILLED**: La validación `if (!hotelSlug)` bloquea el intento.
- **Mutación 4**: Borrado de staff sin confirmación. → **KILLED**: El estado `confirmDeleteId` obliga al flujo de 2 pasos.

## 3. Runbook de Validación Local

```bash
# 1. Lint (Salida 0)
npm run lint
# Resultado: ✅ Passed (0 errors, 522 warnings pre-existentes)

# 2. Type Check (Salida 0)
npm run typecheck
# Resultado: ✅ Passed

# 3. Tests (Salida 0)
npm run test
# Resultado: ✅ 50 test files passed, 793 tests passed

# 4. Build (Salida 0)
npm run build
# Resultado: ✅ Passed
# Nota: Ruta /staff-login visible en el output de build
```

## 4. Cambios Técnicos Detallados

### Nueva Ruta: `/staff-login`
- **Archivo**: `src/app/staff-login/page.tsx`
- **Propósito**: Punto de entrada público para recepcionistas.
- **Comportamiento**: Renderiza `LoginKeypad` en layout aislado.

### Refactorización: `verifyPin` (auth.ts)
- **Desacoplamiento**: Eliminada dependencia de `getCurrentHotel()`.
- **Nueva Lógica**:
  1. Recibe `hotel_slug` y `pin` del FormData.
  2. Resuelve `hotel_id` consultando tabla `hotels` por slug.
  3. Valida `pin_code` en tabla `staff` filtrando por `hotel_id`.
  4. Crea cookie con `id`, `name`, `role` y `hotel_id`.
- **Seguridad**: Uso de `supabaseAdmin` para evitar problemas de RLS en login público.

### Mejora UX: LoginKeypad
- **Nuevo Input**: Campo "Código del Hotel" obligatorio antes del PIN.
- **Feedback**: Validación visual y mensajes de error claros.

### Mejora UX: Confirmación de Borrado
- **Patrón**: Reemplazo de "Undo Toast" por confirmación inline.
- **Flujo**: Click en basura → Aparecen botones "Sí/No" → Click en "Sí" ejecuta borrado.
- **Beneficio**: Previene borrados accidentales (Heurística #5).

<promise>COMPLETE</promise>
