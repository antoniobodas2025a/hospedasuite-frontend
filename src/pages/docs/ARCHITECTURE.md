---

### 2. La Biblia Técnica (`/docs/ARCHITECTURE.md`)

Crea una carpeta `docs` y dentro este archivo. Aquí documentamos las decisiones difíciles que tomamos (como el "Warm Start" o la optimización del calendario).

**Archivo:** `docs/ARCHITECTURE.md`

```markdown
# 🏛️ Arquitectura de HospedaSuite

Este documento detalla las decisiones técnicas críticas y patrones de diseño.

## 1. Estrategia de "Warm Start" (Marketing)

**Problema:** Al lanzar en una nueva ciudad (ej: Villa de Leyva), mostrar "0 cupos vendidos" genera desconfianza.
**Solución:** Implementamos una lógica de inyección visual en `LandingPage.jsx`.

- **Lógica:** `visualTaken = realTaken + OFFLINE_FOUNDERS (3)`.
- **Comportamiento:** Si la BD dice 0, el usuario ve 3. Si la BD dice 1, el usuario ve 4.
- **Objetivo:** Generar validación social inmediata sin ensuciar la base de datos con datos falsos.

## 2. Optimización del Calendario (Performance)

**Problema:** Renderizar un calendario con 50 reservas usando `.find()` en cada celda generaba una complejidad O(N\*M).
**Solución:** Implementación de `Hash Map` con `useMemo`.

- Convertimos el array de reservas en un `Map<string, Booking>`.
- La clave es compuesta: `${room_id}-${YYYY-MM-DD}`.
- La búsqueda en el renderizado pasa a ser O(1) (instantánea).

## 3. Seguridad de API Keys (Evolution API)

**Vulnerabilidad Detectada (P0):** Exposición de `VITE_EVOLUTION_API_KEY` en el frontend.
**Corrección:** Implementación de **Supabase Edge Function**.

- **Ruta:** `/supabase/functions/send-whatsapp/index.ts`
- **Flujo:**
  1. Frontend envía `phone` y `message` a la Edge Function.
  2. Edge Function recupera la API Key de `Deno.env.get()`.
  3. Edge Function hace la petición a Evolution API.
  4. Frontend nunca ve la credencial.

## 4. Esquema de Base de Datos (Supabase)

### Tabla `hotels` (Tenants)

- `id`: UUID (Primary Key)
- `settings`: JSONB (Configuración flexible de colores, logos, reglas).
- `plan_tier`: Control de acceso a features (Free, Pro, Enterprise).

### Tabla `leads` (Embudo)

- `metadata`: JSONB para guardar contexto (User Agent, Fuente de tráfico, Ciudad de interés).
- Protegida con RLS estricto.
```
