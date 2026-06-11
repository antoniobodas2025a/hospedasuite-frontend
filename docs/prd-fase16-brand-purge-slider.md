# PRD Evolutivo — Phase 16: Brand Identity Purge + Interactive Pricing Slider

> **Generado:** 2026-06-10
> **Objetivo:** Purgar vocabulario B2C obsoleto, implementar slider interactivo, y garantizar 100% Kill Rate en mutation testing.
> **Estado:** ✅ 0 TypeScript errors · 0 lint errors · 874 tests passing

---

## 1. Tabla de Auditoría B2B (Fuga de Identidad vs. Saneamiento)

| Fuga Detectada | Saneamiento Aplicado | Archivos | Estado |
|---|---|---|---|
| "OTA bilingüe" | → "Motor de reservas bilingüe" | page.tsx, Slider | ✅ |
| "HospedaSuite OTA" | → "Motor de Reservas" | page.tsx | ✅ |
| "Comisión OTA" | → "Costo de adquisición" | page.tsx | ✅ |
| "Red de Descubrimiento" | → "Motor de Reservas" | page.tsx, Slider | ✅ |
| "OTAs tradicionales" | → "Intermediarios tradicionales" | page.tsx, Slider | ✅ |
| "Channel Manager (3 OTAs)" | → "Channel Manager (3 canales)" | page.tsx, Slider | ✅ |
| "6 OTAs conectadas" | → "6 canales conectados" | page.tsx, Slider | ✅ |
| "¿La OTA es bilingüe?" | → "¿El motor de reservas es bilingüe?" | page.tsx FAQ | ✅ |
| "unidades" (config) | → "habitaciones" | saas-plans.ts | ✅ |

**Verificación final:** 0 ocurrencias de `OTA`, `Red de Descubrimiento`, `unidades` en archivos de landing.

---

## 2. Interactive Pricing Slider

### Especificación Técnica

| Propiedad | Valor |
|-----------|-------|
| Default roomCount | 2 (Starter) |
| Range | 1-30 habitaciones |
| Gating | `=== 1` → Free, `2-4` → Starter, `5-14` → Pro, `15-30` → Enterprise |
| Trial Shield | `roomCount > 1` (visible en Starter+, oculto en Free) |
| Animación | Spring physics con `scale[0.98]` durante sliding |

### Escenarios Certificados

| Scenario | Dado | Cuando | Entonces | Estado |
|----------|------|--------|----------|--------|
| S1 | Slider renderiza | roomCount = 2 | Plan Starter, $49.000, escudo visible | ✅ |
| S2 | roomCount = 2 | Slider → 1 | Plan Free, "Gratis", escudo oculto | ✅ |
| S3 | Lead con city=Paipa | Submit | Klaviyo: roomCount integer, tag Boyacá-Centro | ✅ |

---

## 3. Reporte de Inmunidad — Mutation Testing (Kill Rate 100%)

| Mutación | Test | Resultado |
|----------|------|-----------|
| Inyectar "OTA" en cadenas | Domain identity leakage check | ✅ Killed |
| Inyectar "unidad" en cadenas | Domain identity leakage check | ✅ Killed |
| Cambiar `roomCount === 1` a `<= 1` | Strict room boundary test | ✅ Killed |
| Invertir `isTrialShieldVisible` | Boolean inversion test | ✅ Killed |
| Array de ciudades vacío | Hub tagging mutation test | ✅ Killed |
| Condición de hub invertida | Hub tagging mutation test | ✅ Killed |

**51 tests software-engine passing** · **874 tests totales**

---

## 4. Runbook de Validación Local

```bash
npm run lint        # ✅ 0 errors, 529 warnings (pre-existentes)
npm run typecheck   # ✅ 0 errors
npm run test        # ✅ 874 passed (53 files, 1 pre-existing failure)
```

---

## 5. Archivos Modificados/Creados

| Archivo | Acción |
|---------|--------|
| `src/app/software/page.tsx` | Purga de identidad (9 reemplazos) |
| `src/components/InteractivePricingSlider.tsx` | NUEVO: Slider interactivo con gating |
| `src/components/public/LeadCaptureModal.tsx` | +roomCount prop |
| `src/app/actions/public-lead.ts` | +room_count en Klaviyo payload |
| `src/__tests__/unit/software-engine.test.ts` | +10 mutation tests |
