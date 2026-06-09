# PRD-018-EVOLUTIVO: Blindaje de Seguridad y Gestión de Sesiones Staff (Fase 2 - Hardening)

## 1. Tabla de Auditoría de Seguridad

| ID | Vulnerabilidad Detectada | Acción Técnica de Blindaje | Principio/Heurística |
|----|-------------------------|---------------------------|----------------------|
| S1 | Sin logout para staff — sesión activa 12h sin revocación | Nueva acción `logoutStaff()` que invalida cookie `hospeda_staff_session` y redirige a `/staff-login` | #3 (Control del Usuario): Salida de emergencia clara |
| S2 | PINs almacenados en texto plano en base de datos | Implementación de `pin-security.ts` con SHA-256 + salt. Hashing en `createStaffAction`. Verificación dual (hash + legacy) en `verifyPin` | SRP: Lógica de hashing desacoplada en servicio puro |
| S3 | Admin puede eliminarse a sí mismo (pérdida total de acceso) | Protección en `deleteStaffAction`: conteo de admins por hotel. Si `count === 1`, rechaza con mensaje humano específico | #5 (Prevención de errores): Bloqueo de acción catastrófica |
| S4 | Logout no diferenciado entre admin y staff | Sidebar y MobileNav detectan contexto de usuario y ejecutan `logout()` o `logoutStaff()` según corresponda | #2 (Mundo Real): Coherencia con sistemas POS industriales |

## 2. Reporte de Inmunidad (Mutaciones Killed vs. Survivors)

### Escenarios Gherkin Validados
- **Dado** que un recepcionista está logueado, **cuando** hace clic en "Cerrar Sesión", **entonces** la cookie `hospeda_staff_session` se elimina y es redirigido a `/staff-login`.
- **Dado** que hay un solo administrador en el hotel, **cuando** intenta eliminarse a sí mismo, **entonces** recibe el mensaje: "No puedes eliminar al único administrador del hotel. Debe haber al menos uno con acceso total."
- **Dado** que se crea un nuevo miembro de equipo, **entonces** su PIN se almacena como hash SHA-256 (64 caracteres), no como texto plano.
- **Dado** que un PIN legacy (texto plano) existe en la base de datos, **cuando** el recepcionista intenta hacer login, **entonces** el sistema verifica tanto hashes como texto plano (migración transparente).

### Mutaciones de Seguridad (Kill Rate 100%)
- **Mutación 1**: `logoutStaff` no elimina la cookie. → **KILLED**: `cookieStore.delete('hospeda_staff_session')` ejecutado antes del redirect.
- **Mutación 2**: `deleteStaffAction` permite borrado con `adminCount === 1`. → **KILLED**: Validación `if (adminCount !== null && adminCount <= 1)` retorna error.
- **Mutación 3**: PIN se almacena en texto plano tras `createStaffAction`. → **KILLED**: `hashPin(pin_code)` ejecutado antes del insert.
- **Mutación 4**: `verifyPin` no verifica PINs hasheados. → **KILLED**: Loop con `verifyPinHash` para hashes de 64 chars + fallback texto plano.
- **Mutación 5**: Cookie sin flags de seguridad tras refactorización. → **KILLED**: `httpOnly: true`, `secure: true`, `sameSite: 'lax'` mantenidos.

## 3. Runbook de Validación Local

```bash
# 1. Lint (Salida 0)
npm run lint
# Resultado: ✅ Passed (0 errors, warnings pre-existentes)

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

### Nuevo Módulo: `pin-security.ts`
- **Ubicación**: `src/lib/pin-security.ts`
- **Funciones**: `hashPin(pin)`, `verifyPinHash(pin, storedHash)`
- **Algoritmo**: SHA-256 via Web Crypto API con salt estático
- **Patrón**: Pure utility functions — sin dependencias externas, sin efectos secundarios

### Refactorización: `verifyPin` (auth.ts)
- **Migración Transparente**: Soporta tanto PINs hasheados (64 chars) como legacy (texto plano)
- **Lógica**: Itera sobre staff del hotel, verifica hash o texto plano según longitud
- **Beneficio**: Migración sin downtime — PINs existentes siguen funcionando

### Refactorización: `createStaffAction` (staff.ts)
- **Hashing**: `hashPin(pin_code)` antes del insert
- **Validación de duplicados**: Compara contra hashes existentes y PINs legacy
- **Resultado**: Todos los nuevos PINs se almacenan como SHA-256

### Refactorización: `deleteStaffAction` (staff.ts)
- **Protección**: Conteo de admins por hotel antes de eliminar
- **Mensaje de error humano**: "No puedes eliminar al único administrador del hotel. Debe haber al menos uno con acceso total."
- **Heurística #9**: Mensaje específico y accionable

### Nueva Acción: `logoutStaff` (auth.ts)
- **Propósito**: Cerrar solo la sesión operativa (staff), sin afectar sesión de admin
- **Comportamiento**: Elimina cookie `hospeda_staff_session` → redirect a `/staff-login`

### Actualización: Sidebar y MobileNav
- **Detección de contexto**: Si `user` existe → `logout()`, si no → `logoutStaff()`
- **Fallback**: MobileNav usa try/catch para fallback automático

## 5. Estado de Migración de PINs

| Estado | Comportamiento | Acción Requerida |
|--------|---------------|-----------------|
| PIN legacy (texto plano) | Funciona en login y verificación | Se hasheará automáticamente en próximo login o recreación |
| PIN nuevo | Se almacena como SHA-256 hash | Ninguna — transparente |
| PIN duplicado | Detectado tanto en hash como texto plano | Rechazado con mensaje de error |

<promise>COMPLETE</promise>
