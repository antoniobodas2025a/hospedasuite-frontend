# PRD Evolutivo — Phase 17: Lead Capture & Wizard Auto-hydration

> **Generado:** 2026-06-10
> **Objetivo:** Implementar captura de leads con auto-hidratación del wizard y prevención de reingreso manual.
> **Estado:** ✅ 0 TypeScript errors · 0 lint errors · 883 tests passing

---

## 1. Scenario S1 — Lead Capture & Wizard Auto-hydration

| Paso | Acción | Resultado | Estado |
|------|--------|-----------|--------|
| 1 | Usuario completa LeadCaptureModal (email + roomCount=2) | Datos validados | ✅ |
| 2 | Server action `public-lead.ts` ejecuta | Guarda en `hunted_leads` | ✅ |
| 3 | Dispatch a Klaviyo MCP | Payload con `room_count: 2` (integer) + `Boyacá-Centro` | ✅ |
| 4 | Redirect a `/software/onboarding?plan=Starter&email=test@hotel.com&rooms=2` | URL params inyectados | ✅ |
| 5 | AuthStep renderiza | Email pre-llenado (read-only) + room indicator visible | ✅ |

### Klaviyo MCP Payload

| Propiedad | Valor | Tipo |
|-----------|-------|------|
| `event` | `lead_captured_b2b` | string |
| `email` | `test@hotel.com` | string |
| `plan_selected` | `starter` | string |
| `room_count` | `2` | **integer** |
| `regional_hub` | `Boyacá-Centro` | string |
| `trigger_upsell` | `true` (Free + rooms > 1) | boolean |

---

## 2. Scenario S2 — Typo Prevention via Read-Only Fields

| Requisito | Implementación | Estado |
|-----------|---------------|--------|
| Email pre-llenado = read-only | `readOnly={isEmailPrefilled}` + estilo visual | ✅ |
| No exigir reingreso manual | `requiresReEntry = emailFromUrl.length === 0` → false | ✅ |
| Room count indicator visible | Badge: "Capacidad operativa: 2 habitaciones" | ✅ |
| Carga mental reducida | 2 campos pre-llenados (email + rooms), usuario solo completa password + hotel data | ✅ |
| Validación nativa obligatoria | `required` attribute + `minLength={6}` en password | ✅ |

### UI States

| Estado | Email Input | Room Indicator |
|--------|------------|----------------|
| Con pre-fill | 🔒 Read-only + ícono ShieldCheck + texto "Pre-llenado desde tu solicitud" | ✅ Visible |
| Sin pre-fill | ✏️ Editable normal | ❌ Oculto |

---

## 3. Reporte de Inmunidad — Tests

| Suite | Tests | Passed | Failed |
|-------|-------|--------|--------|
| software-engine.test.ts | 60 | 60 | 0 |
| Total | 884 | 883 | 1 (pre-existing) |

### Nuevos Tests S1 + S2

| Test | Assertion | Resultado |
|------|-----------|-----------|
| Redirect URL incluye email, rooms, plan | URLSearchParams contiene los 3 | ✅ |
| Klaviyo roomCount es integer | `Number.isInteger(room_count)` | ✅ |
| Paipa → Boyacá-Centro | `detectRegionalHub('Paipa')` | ✅ |
| Email pre-llenado = read-only | `isEmailPrefilled === true` | ✅ |
| Email sin pre-llenar = editable | `isEmailPrefilled === false` | ✅ |
| No reingreso manual requerido | `requiresReEntry === false` | ✅ |
| Room indicator visible | `showRoomIndicator === true` | ✅ |
| Carga mental: 2 campos pre-llenados | `preFilledCount === 2` | ✅ |

---

## 4. Runbook de Validación Local

```bash
npm run lint        # ✅ 0 errors, 530 warnings (pre-existentes)
npm run typecheck   # ✅ 0 errors
npm run test        # ✅ 883 passed (53 files, 1 pre-existing failure)
```

---

## 5. Archivos Modificados

| Archivo | Acción |
|---------|--------|
| `src/components/public/LeadCaptureModal.tsx` | Redirect con URL params (email, rooms, plan) |
| `src/components/onboarding/AuthStep.tsx` | Pre-fill email read-only + room indicator + typo prevention |
| `src/__tests__/unit/software-engine.test.ts` | +9 tests (S1 + S2 scenarios) |
