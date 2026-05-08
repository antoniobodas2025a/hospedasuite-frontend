# Radiografía del Modelo de Negocio — HospedaSuite

> **Auditoría Forense de Código | v1.0**  
> Fecha: 2026-05-08  
> Stack: Next.js 16.1.5, React 19.2.3, Supabase SSR, Tailwind v4, Zustand

---

## 1. Resumen Ejecutivo y Arquitectura General

HospedaSuite es una plataforma SaaS multi-tenant de gestión hotelera (PMS + Channel Manager + Booking Engine) orientada al mercado colombiano. Opera bajo un modelo freemium/pro con cobro a través de Wompi.

### Capas de Negocio

| Capa | Descripción |
|------|-------------|
| **Direct Booking** | Motor de reservas directas para huéspedes (`/book/[slug]`) |
| **OTA Marketplace** | Listado público de hoteles con motor de disponibilidad (`/hotel/[slug]`) |
| **Admin Dashboard** | Panel de control completo para hoteleros (`/dashboard/*`) |
| **Super Admin** | Consola HQ para gestión de tenants (`/admin`) |
| **HQ SaaS** | Facturación y onboarding de nuevos hoteles |

### Arquitectura de Alto Nivel

```
┌─────────────────┐  ┌──────────────┐  ┌──────────────────┐
│   Huésped/OTA   │  │  Hotelero    │  │   Super Admin    │
└────────┬────────┘  └──────┬───────┘  └────────┬─────────┘
         │                  │                    │
    ┌────▼──────────────────▼────────────────────▼────┐
    │           Next.js 16 App Router                 │
    │  ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
    │  │   RSC    │ │  Client  │ │ Server Actions │  │
    │  └──────────┘ └──────────┘ └────────────────┘  │
    └─────────────────────┬───────────────────────────┘
                          │
              ┌───────────▼────────────┐
              │      Supabase          │
              │  (Auth + Postgres +    │
              │   Storage + Edge)      │
              └────────────────────────┘
```

---

## 2. Modelo de Datos y Entidades de Negocio

### Tablas Identificadas en Código

| Tabla | Rol | Relaciones Clave |
|-------|-----|------------------|
| `hotels` | Tenant maestro | `owner_id` → auth.users |
| `rooms` | Inventario de unidades | `hotel_id`, `ical_import_url` |
| `bookings` | Folios de reserva | `hotel_id`, `room_id`, `guest_id`, `external_id` |
| `guests` | Huéspedes indexados | `hotel_id`, `doc_number` (único por hotel) |
| `payments` | Ledger financiero | `booking_id`, `staff_id` |
| `tenant_payments` | Facturación SaaS | `hotel_id`, `wompi_transaction_id` |
| `payment_links` | Órdenes de pago pendiente | `reservation_id` |
| `service_items` | Consumos extra (POS) | `booking_id`, `room_id` |
| `services` / `menu_items` | Catálogo de servicios | `hotel_id` |
| `staff` | Personal operativo | `hotel_id`, `user_id`, `pin_code` |
| `inventory` | Stock de artículos | `hotel_id` |
| `profiles` | Perfiles de usuario (Supabase) | `id` → auth.users |
| `user_roles` | Roles y permisos | `user_id` |
| `hunted_leads` / `platform_leads` | CRM de prospección | `hotel_id` |

### Estados del Dominio

**Reservas (`bookings.status`)**: `PENDING` → `CONFIRMED` → `checked_in` → `checked_out` | `cancelled`, `EXPIRED`, `blocked_ota`, `maintenance`

**Habitaciones (`rooms.status`)**: `active`, `occupied`, `dirty`, `maintenance`

**Pagos (`payments.method`)**: `cash`, `transfer`, `wompi`

### Multi-tenancy

Aislamiento por `hotel_id` en **todas** las tablas operativas. Contexto resuelto vía `getCurrentHotel()` con memoización `cache()` de React.

---

## 3. Flujos de Negocio Principales

### 3.1 Reserva Directa (Direct Booking)

```
Huésped → /book/[slug] → selecciona habitación → /checkout?room=ID&checkin=X&checkout=Y
  → CheckoutForm → createPendingBookingAction → PENDING → Payment Link → Wompi
  → Webhook /api/webhooks/tenant/wompi → CONFIRMED + Payment insert + Email
```

- El motor de checkout soporta flag OTA: `resolvedParams.ref === 'ota'`
- Precios se calculan server-side en checkout (`room.price * nights`)
- Validación de colisiones temporales vía constraint PostgreSQL `no_overlapping_bookings`

### 3.2 Check-in / Check-out Operativo

```
Admin Dashboard → processCheckInAction(bookingId)
  → Valida room.status (dirty/maintenance/occupied) → Aborta si conflicto
  → UPDATE bookings.status = 'checked_in'
  → UPDATE rooms.status = 'occupied'

Checkout Terminal → finalizeCheckoutAction(bookingId, roomId, serviceIds)
  → UPDATE bookings.status = 'checked_out'
  → UPDATE rooms.status = 'dirty'
  → UPDATE service_items.status = 'paid'
```

- Check-in blindado con validación de invariantes físicos (habitación sucia = bloqueo)
- No hay transacción atómica real entre booking+room (rollback manual en código)

### 3.3 Canal OTA (Booking/Airbnb)

```
Cron /api/cron/sync-channels → Fan-out QStash → /api/webhooks/qstash/sync-hotel
  → Descarga iCal por habitación (ical_import_url)
  → Parsea VEVENT → INSERT bookings (status='blocked_ota', external_id=UID)
  → Guest genérico OTA-GUEST-000
```

- Deduplicación por `external_id`
- Eventos pasados (`checkOut <= today`) se ignoran

### 3.4 Facturación SaaS (HQ)

```
Onboarding /software/onboarding → Wompi pago (referencia ONB-[UUID]-[TS])
  → Webhook /api/webhooks/hq/wompi → tenant_payments insert
  → hotels.status = 'active', subscription_plan = 'pro'
  → Si DECLINED/ERROR → hotels.status = 'suspended'
```

### 3.5 POS y Estado de Cuenta

```
getAccountStatementAction(bookingId, roomId)
  → Suma room charge + service_items pending - payments = balance
  → Fallback de precio: booking.total_price → clientCalculatedPrice → calculateStayPrice()
```

- `calculateStayPrice()` aplica tarifa weekend (viernes=5, sábado=6)
- Zona horaria hardcodeada: `America/Bogota` (en dashboard y billing)

### 3.6 Arqueo de Caja

```
getShiftReportAction() → Últimas 12h de payments
  → Agregación por método: cash, transfer, wompi
  → Filtro por staff (no admin = solo sus pagos)
```

---

## 4. Arquitectura Técnica y Patrones de Diseño

### Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 16.1.5 (App Router) |
| Runtime | React 19.2.3 |
| Estilos | Tailwind CSS v4 |
| Estado Global | Zustand |
| Base de Datos | Supabase (Postgres) |
| Auth | Supabase Auth |
| Storage | Supabase Storage (buckets: gallery, hotel-assets, hotel-media) |
| Jobs | Upstash QStash |
| Pagos | Wompi ( Colombia) |
| OCR | Acciones propias (`src/app/actions/ocr.ts`) |

### Patrones Arquitectónicos

| Patrón | Implementación |
|--------|----------------|
| **Multi-tenant** | `hotel_id` en todas las tablas + `getCurrentHotel()` |
| **Service Role Bypass** | `supabaseAdmin` para mutaciones (bypass RLS) |
| **SSR Auth** | `createClient()` de `@/utils/supabase/server` |
| **Server Actions** | CRUD principal vía `'use server'` |
| **Revalidación** | `revalidatePath('/dashboard/calendar')` post-mutación |
| **Memoización** | `cache()` de React en `getCurrentHotel()` |
| **Factory Client** | `getSupabaseAdmin()` con `.trim()` en variables env |

### Seguridad

- **Zero-Trust en webhooks**: Verificación de firma Wompi por tenant (secreto por hotel)
- **Contexto de firma polimórfica**: `generateWompiSignature()` usa secreto de hotel si existe, si no, secreto HQ
- **PIN de 4 dígitos** para staff (único por hotel)
- **God Mode** para super admin (magic links)

---

## 5. Integraciones Externas y APIs

### Wompi (Pasarela de Pagos)

| Endpoint | Rol |
|----------|-----|
| `POST /api/webhooks/tenant/wompi` | Recepción de pagos de huéspedes |
| `POST /api/webhooks/hq/wompi` | Recepción de pagos SaaS (onboarding) |
| `actions/wompi.ts` | Generación de firma de integridad SHA-256 |

### Upstash QStash (Job Queue)

| Endpoint | Rol |
|----------|-----|
| `GET /api/cron/sync-channels` | Cron fan-out a workers por hotel |
| `GET /api/cron/release-inventory` | Expira reservas PENDING > 15 min |
| `POST /api/webhooks/qstash/sync-hotel` | Worker de sincronización iCal |

### iCal / Channel Manager

- Importación one-way desde URLs iCal de Booking/Airbnb
- No hay exportación iCal (no se detecta generación de feed para OTAs)

### Storage Buckets

- `gallery`, `hotel-assets`, `hotel-media`

---

## 6. Hallazgos Críticos y Deuda Técnica

### 🚨 CRÍTICO — Bugs de Runtime

| Severidad | Archivo | Problema | Impacto |
|-----------|---------|----------|---------|
| **CRÍTICO** | `(direct)/book/[slug]/page.tsx:45` | Variable `roomId` usada sin definir | Crash en runtime al cargar página de hotel |
| **CRÍTICO** | `(direct)/book/[slug]/page.tsx:1-5` | Doble import de `notFound` (`next/navigation`) | Warning/build potencial |
| **ALTO** | `(direct)/book/[slug]/page.tsx:70` | Campo `hotel.address` / `hotel.location` no están en select | Puede renderizar `undefined` silenciosamente |

### 🔒 Seguridad

| Severidad | Archivo | Problema |
|-----------|---------|----------|
| **ALTO** | `actions/bookings.ts` | Uso de `any` en `isTemporalCollision(error: any)` |
| **ALTO** | `actions/bookings.ts:374` | Casting `as any` en `booking.rooms` |
| **MEDIO** | `actions/super-admin.ts:54` | Slug generado sin sanitización completa (posible colisión) |
| **MEDIO** | Múltiples | `process.env.SUPABASE_SERVICE_ROLE_KEY!` con non-null assertion sin validación previa |

### 🏗️ Arquitectura / Mantenibilidad

| Severidad | Archivo | Problema |
|-----------|---------|----------|
| **ALTO** | `types/index.ts` | Tipos mínimos; la mayoría de tipos están inline en hooks/actions |
| **ALTO** | Todo el proyecto | **Cero tests** — no hay test runner, ni unit, ni integración, ni E2E |
| **ALTO** | `actions/bookings.ts:393-409` | Check-in no atómico: si falla update de room, hace rollback manual. Race condition posible |
| **MEDIO** | `actions/payments.ts:164-176` | Checkout finaliza pago antes de liberar habitación; si falla room update, booking queda checked_out con room ocupada |
| **MEDIO** | `actions/ota.ts:62` | Fallback a imagen Unsplash externa hardcodeada (latencia + dependencia) |

### 📁 Estructura

| Severidad | Problema |
|-----------|----------|
| **MEDIO** | Desfase en paths de API: documentación menciona `/api/wompi/webhook/ical/[roomId]/route.ts` pero archivos reales están en `/api/webhooks/tenant/...` y `/api/webhooks/hq/...` |
| **BAJO** | `page.tsx` del booking directo tiene un bloque instrumentado (líneas 42-54) que parece código de debug/auditoría que intenta buscar una habitación por `roomId` antes de listar todas — probablemente residual de sesión de debug |

---

## 7. Recomendaciones y Roadmap Prioritario

### Fase 1 — Estabilización Inmediata (Antes de cualquier PR)

1. **Corregir `roomId` indefinido** en `(direct)/book/[slug]/page.tsx` — eliminar el bloque instrumentado de líneas 42-54 o definir `roomId` correctamente
2. **Eliminar import duplicado** de `notFound`
3. **Agregar validación de env vars** al inicio de Server Actions (no usar `!` sin verificar)
4. **Crear tipos compartidos** robustos en `src/types/` para todas las entidades

### Fase 2 — Testing (Crítico antes de escalar)

5. **Instalar Vitest + React Testing Library + Playwright**
6. **Cubrir con tests**:
   - Motor de pricing (`calculateStayPrice`)
   - Verificación de firma Wompi
   - Flujo de check-in/check-out (estados y transiciones)
   - Webhook handlers (casos APPROVED, DECLINED, VOIDED, idempotencia)
   - `getCurrentHotel()` (autenticación y contexto multi-tenant)

### Fase 3 — Seguridad y Robustez

7. **Reemplazar `any`** en `isTemporalCollision` y en casts de `booking.rooms`
8. **Hacer transacciones atómicas** usando RPC de Supabase o transacciones manuales con rollback automático
9. **Rate limiting** en endpoints de webhook y Server Actions públicas
10. **Sanitizar slugs** con biblioteca dedicada (`slugify` o similar) para evitar colisiones

### Fase 4 — Escalabilidad

11. **Implementar exportación iCal** (feed por habitación) para cerrar el loop del channel manager
12. **Agregar cola de jobs propia** o migrar todo a QStash para operaciones pesadas (sync, notificaciones masivas)
13. **Refactorizar OTA marketplace** para usar caching (`unstable_cache` o Redis) en `fetchOTAHotelsAction`
14. **Considerar migración parcial** de Server Actions a API Routes para operaciones que requieren más control de request/response

---

## Apéndice: Inventario de Archivos Core

| Archivo | Responsabilidad |
|---------|-----------------|
| `src/app/(direct)/book/[slug]/page.tsx` | Landing de hotel + listado de habitaciones (BUG: `roomId` indefinido) |
| `src/app/(direct)/book/[slug]/checkout/page.tsx` | Checkout con cálculo de noches y precios |
| `src/app/actions/bookings.ts` | CRUD de reservas + check-in blindado |
| `src/app/actions/payments.ts` | Estado de cuenta, pagos, checkout final |
| `src/app/actions/wompi.ts` | Firma criptográfica polimórfica |
| `src/app/api/webhooks/tenant/wompi/route.ts` | Reconciliación de pagos de huéspedes |
| `src/app/api/webhooks/hq/wompi/route.ts` | Reconciliación de pagos SaaS |
| `src/app/api/webhooks/qstash/sync-hotel/route.ts` | Worker de importación iCal |
| `src/app/api/cron/sync-channels/route.ts` | Cron de sincronización fan-out |
| `src/app/api/cron/release-inventory/route.ts` | Expiración de reservas PENDING |
| `src/lib/hotel-context.ts` | Resolución de contexto multi-tenant |
| `src/utils/supabase/pricing.ts` | Cálculo de precios con weekend rate |
| `src/types/index.ts` | Tipos mínimos (incompleto) |

---

*Documento generado durante auditoría forense del código. Para uso interno de mantenedores.*
