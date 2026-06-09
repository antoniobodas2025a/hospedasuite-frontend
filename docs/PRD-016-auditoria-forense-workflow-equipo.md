# AUDITORÍA FORENSE — Workflow de Equipo (Staff Management)

**Fecha**: 2026-06-09  
**Alcance**: Sistema completo de gestión de equipo, autenticación y autorización  
**Estado**: 🔴 CRÍTICO — Hallazgos de seguridad y UX detectados

---

## 1. ARQUITECTURA DE AUTENTICACIÓN

### 1.1 Dos Sistemas de Login Paralelos

| Sistema | Usuario | Método | Cookie | Expiración |
|---------|---------|--------|--------|------------|
| **Admin Login** | Dueño/Admin | Email + Password (Supabase Auth) | `sb-*` (Supabase session) | 30 días (default Supabase) |
| **Staff Login** | Recepcionista | PIN 4 dígitos | `hospeda_staff_session` | 12 horas |

### 1.2 Flujo de Autenticación del Administrador

```
┌─────────────────────────────────────────────────────────────┐
│ 1. /login (LoginPage.tsx)                                   │
│    → Email + Password                                       │
│    → Server Action: login()                                 │
│    → Supabase Auth: signInWithPassword()                    │
│    → Cookie: sb-* (session JWT)                             │
│    → Redirect: /dashboard                                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Middleware (updateSession)                               │
│    → Verifica usuario autenticado                           │
│    → Bloquea /dashboard y /admin sin auth                   │
│    → Zero-Trust para /admin (solo superadmin)               │
─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Hotel Context (getCurrentHotel)                          │
│    → Lee cookie `hospeda_active_tenant`                     │
│    → Query: staff table WHERE user_id = auth.user.id        │
│    → Resuelve hotel vinculado al usuario                    │
│    → Si no tiene hotel → redirect /software/onboarding      │
└─────────────────────────────────────────────────────────────┘
```

**Hallazgo**: El admin se autentica vía Supabase Auth (email/password) y se vincula a un hotel a través de la tabla `staff` donde `user_id` coincide con el UUID de Supabase.

### 1.3 Flujo de Autenticación del Staff (Recepcionista)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. LoginKeypad.tsx (Componente existe pero NO está usado)   │
│    → Teclado numérico 0-9                                   │
│    → PIN de 4 dígitos                                       │
│    → Server Action: verifyPin()                             │
│    → Cookie: hospeda_staff_session (httpOnly)               │
│    → Redirect: /dashboard                                   │
─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. verifyPin() (auth.ts)                                    │
│    A. Valida que dispositivo está vinculado a un hotel      │
│       → getCurrentHotel() (requiere admin auth primero)     │
│    B. Busca staff WHERE hotel_id = X AND pin_code = PIN     │
│    C. Crea cookie httpOnly con {id, name, role}             │
│    D. Expira en 12 horas                                    │
└─────────────────────────────────────────────────────────────┘
```

**🔴 HALLAZGO CRÍTICO #1**: El `LoginKeypad` existe como componente pero **NO está montado en ninguna página**. Los recepcionistas NO tienen forma de hacer login con PIN. El componente está huérfano.

**🔴 HALLAZGO CRÍTICO #2**: `verifyPin()` depende de `getCurrentHotel()` que requiere autenticación de admin primero. Esto significa que un recepcionista NO puede hacer login independientemente — necesita que un admin ya haya autenticado el dispositivo.

---

## 2. GESTIÓN DE EQUIPO (CRUD)

### 2.1 Crear Miembro (`createStaffAction`)

```typescript
// src/app/actions/staff.ts:8-48
1. getCurrentHotel() → Verifica admin autenticado
2. checkStaffLimit() → Verifica límite del plan
3. Valida PIN único dentro del hotel
4. Inserta en tabla staff: {hotel_id, name, role, pin_code}
5. revalidatePath('/dashboard/settings')
```

**Límites por Plan**:
| Plan | Máx Staff |
|------|-----------|
| Starter | 2 |
| Pro | 5 |
| Enterprise | 15 |

### 2.2 Eliminar Miembro (`deleteStaffAction`)

```typescript
// src/app/actions/staff.ts:51-68
1. getCurrentHotel() → Verifica admin autenticado
2. DELETE FROM staff WHERE id = X AND hotel_id = Y
3. revalidatePath('/dashboard/settings')
```

**🟡 HALLAZGO MEDIO**: No hay validación de rol al eliminar. Un admin podría eliminarse a sí mismo accidentalmente, quedando sin acceso.

### 2.3 UI de Gestión (`SettingsPanel.tsx`)

- **Ubicación**: Pestaña "Equipo" en `/dashboard/settings`
- **Solo accesible por**: Usuarios autenticados con hotel vinculado
- **Campos**: Nombre + PIN (4 dígitos)
- **Visualización**: Lista con avatar (inicial), nombre, rol, botón eliminar
- **Seguridad UI**: No hay confirmación antes de eliminar (solo optimistic delete con undo toast)

---

## 3. BASE DE DATOS — Tabla `staff`

### 3.1 Estructura Inferida

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | Identificador único |
| `hotel_id` | UUID | FK → hotels.id |
| `user_id` | UUID | FK → auth.users.id (solo para admins) |
| `name` | TEXT | Nombre del miembro |
| `role` | TEXT | 'Administrador' \| 'Recepcionista' \| otros |
| `pin_code` | TEXT | PIN de 4 dígitos (solo staff) |
| `created_at` | TIMESTAMPTZ | Fecha de creación |

### 3.2 Roles Detectados en el Código

| Rol | Acceso | Autenticación |
|-----|--------|---------------|
| `Administrador` | Dashboard completo, Settings, POS, Pagos | Email + Password (Supabase Auth) |
| `Recepcionista` | Dashboard operativo, POS, Bookings | PIN 4 dígitos (cookie session) |
| `superadmin` | Panel `/admin` (gestión multi-tenant) | Email + Password + tabla `user_roles` |

**🟡 HALLAZGO MEDIO**: La tabla `staff` mezcla dos conceptos distintos:
1. **Vinculación admin-hotel** (`user_id` + `hotel_id`)
2. **Cuentas operativas** (`pin_code` + `hotel_id`)

Esto crea confusión semántica. Un "Administrador" tiene `user_id` vinculado a Supabase Auth, mientras que un "Recepcionista" solo tiene `pin_code`.

---

## 4. AUTORIZACIÓN Y PERMISOS

### 4.1 Middleware de Protección

| Ruta | Protección | Requisito |
|------|-----------|-----------|
| `/dashboard/*` | Middleware | Usuario autenticado (Supabase) |
| `/admin/*` | Middleware + Zero-Trust | `user_roles.role = 'superadmin'` |
| `/login` | Redirección | Si ya está auth → /dashboard |

### 4.2 Autorización por Rol en Acciones

| Acción | Verificación | Archivo |
|--------|-------------|---------|
| Crear booking | `getActiveStaffId()` → lee cookie `hospeda_staff_session` | `bookings.ts:75-81` |
| Registrar pago | `getActiveStaff()` → filtra por `staff_id` si no es Admin | `payments.ts:222-223` |
| POS | Lee `hospeda_staff_session` para `staff_id` | `pos.ts:135-140` |
| Settings (Equipo) | `getCurrentHotel()` → requiere admin auth | `staff.ts:10-11` |

### 4.3 Cookie de Sesión Staff

```typescript
// auth.ts:76-86
cookieStore.set('hospeda_staff_session', JSON.stringify({
  id: staffMember.id,
  name: staffMember.name,
  role: staffMember.role
}), {
  httpOnly: true,    // ✅ Protege contra XSS
  secure: true,      // ✅ Solo HTTPS en producción
  sameSite: 'lax',   // ✅ Protege contra CSRF
  maxAge: 43200      // ⚠️ 12 horas — ¿suficiente?
});
```

**🟢 POSITIVO**: La cookie usa `httpOnly`, `secure` y `sameSite: 'lax'` — configuración segura.

**🟡 HALLAZGO MEDIO**: No hay mecanismo de logout para staff. La cookie expira en 12 horas pero no hay forma de revocarla manualmente antes.

---

## 5. FLUJOS DE USUARIO COMPLETOS

### 5.1 Flujo: Admin configura equipo

```
1. Admin hace login en /login (email + password)
2. Es redirigido a /dashboard
3. Navega a /dashboard/settings → pestaña "Equipo"
4. Ingresa nombre + PIN del nuevo recepcionista
5. Click en ✓ → createStaffAction()
6. Verificación de límite de plan
7. Validación de PIN único
8. Inserción en DB
9. Recepcionista aparece en la lista
```

### 5.2 Flujo: Recepcionista accede al sistema

```
⚠️ FLUJO ROTO — No existe página de login para staff

Estado actual:
- LoginKeypad.tsx existe pero no está montado en ninguna ruta
- verifyPin() existe pero depende de getCurrentHotel() (requiere admin auth)
- No hay forma documentada de cómo un recepcionista hace login

Flujo esperado (NO implementado):
1. Recepcionista va a /staff-login (ruta no existe)
2. Ve LoginKeypad con teclado numérico
3. Ingresa PIN de 4 dígitos
4. verifyPin() valida contra tabla staff
5. Cookie hospeda_staff_session creada
6. Redirect a /dashboard
```

---

## 6. HALLAZGOS DE SEGURIDAD

### 🔴 CRÍTICOS

| # | Hallazgo | Impacto | Archivo |
|---|----------|---------|---------|
| C1 | LoginKeypad huérfano — recepcionistas no pueden hacer login | Bloqueo total de acceso para staff | `components/auth/LoginKeypad.tsx` |
| C2 | verifyPin depende de getCurrentHotel (admin auth) | Imposible login independiente de staff | `actions/auth.ts:55-58` |
| C3 | No hay ruta `/staff-login` | No existe punto de entrada para staff | N/A |

### 🟡 MEDIOS

| # | Hallazgo | Impacto | Archivo |
|---|----------|---------|---------|
| M1 | No hay confirmación antes de eliminar staff | Borrado accidental sin recuperación | `SettingsPanel.tsx:347-356` |
| M2 | No hay logout para staff | Sesión activa hasta expiración (12h) | N/A |
| M3 | Admin puede eliminarse a sí mismo | Pérdida de acceso al sistema | `staff.ts:56-59` |
| M4 | PIN se almacena en texto plano | Si la DB se compromete, PINs son visibles | `staff` table |

###  POSITIVOS

| # | Hallazgo | Beneficio |
|---|----------|-----------|
| P1 | Cookie staff usa httpOnly + secure + sameSite | Protección contra XSS y CSRF |
| P2 | Validación de PIN único por hotel | Evita colisiones de acceso |
| P3 | Plan gating en creación de staff | Control de costos por plan |
| P4 | Middleware protege /dashboard y /admin | Zero-trust en rutas sensibles |

---

## 7. RECOMENDACIONES PRIORIZADAS

### Fase 1 (Inmediata)
1. **Crear ruta `/staff-login`** que monte `LoginKeypad`
2. **Desacoplar `verifyPin`** de `getCurrentHotel` — debe funcionar independientemente
3. **Agregar confirmación** antes de eliminar staff

### Fase 2 (Corto plazo)
4. **Implementar logout para staff** (botón + invalidación de cookie)
5. **Prevenir auto-eliminación** del último admin
6. **Hash de PINs** en base de datos (bcrypt o similar)

### Fase 3 (Mediano plazo)
7. **Separar tabla `staff`** en `hotel_members` (vinculación) y `staff_accounts` (acceso operativo)
8. **Auditoría de accesos** — log de quién hizo login y cuándo
9. **Rate limiting** específico para intentos de PIN

---

## 8. MAPA DE ARCHIVOS RELEVANTES

| Archivo | Responsabilidad | Estado |
|---------|----------------|--------|
| `src/app/actions/staff.ts` | CRUD de staff | ✅ Funcional |
| `src/app/actions/auth.ts` | Login admin + verifyPin | ⚠️ verifyPin roto |
| `src/components/auth/LoginKeypad.tsx` | UI login staff | 🔴 Huérfano |
| `src/components/dashboard/SettingsPanel.tsx` | UI gestión equipo | ✅ Funcional |
| `src/lib/hotel-context.ts` | Resolución de hotel | ✅ Funcional |
| `src/utils/supabase/middleware.ts` | Protección de rutas | ✅ Funcional |
| `src/data/plan-guard.ts` | Límites por plan | ✅ Funcional |
| `src/config/saas-plans.ts` | Definición de planes | ✅ Funcional |

---

**FIN DEL REPORTE**  
*Este documento es de solo lectura. No se realizaron cambios en el código.*
