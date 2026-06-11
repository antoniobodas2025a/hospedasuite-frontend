# PRD Evolutivo — Phase 15.5: Pricing Hotfix + Klaviyo MCP Ingestion

> **Generado:** 2026-06-10
> **Objetivo:** Corregir copy del Plan Free + integrar Klaviyo MCP con tagging regional Boyacá-Centro.
> **Estado:** ✅ 0 TypeScript errors · 41 tests software-engine passing · 864 tests totales

---

## 1. Pricing Matrix Hotfix

| Elemento | Antes | Después |
|----------|-------|---------|
| Free plan feature 5 | `1 mes gratis ilimitado` | `Gratis para siempre (1 habitación)` |
| Trial messaging | Ambiguo (parecía trial) | Claro: Free es permanente, trial aplica a Starter+ |
| Room gating | 1 habitación | ✅ Sin cambios (invariante protegido) |

**Tests agregados:**
- ✅ Free plan debe decir "Gratis para siempre"
- ✅ Free plan NO debe mencionar "1 mes gratis"
- ✅ Free plan room capacity locked at 1

---

## 2. Klaviyo MCP Integration

### Payload Estructurado

| Propiedad | Valor | Condición |
|-----------|-------|-----------|
| `event` | `lead_captured_b2b` | Siempre |
| `plan_selected` | `{selectedTier}` | Del formulario |
| `regional_hub` | `Boyacá-Centro` | Si city ∈ [Paipa, Tibasosa, Sogamoso, Tota, Sugamuxi, Duitama, Firavitoba, Nobsa] |
| `trigger_upsell` | `true` | Si `plan == free` AND `city != undefined` |
| `source` | `/software` | Siempre |

### Regional Tagging

| Ciudad | Hub |
|--------|-----|
| Paipa | Boyacá-Centro |
| Tibasosa | Boyacá-Centro |
| Sogamoso | Boyacá-Centro |
| Tota | Boyacá-Centro |
| Sugamuxi | Boyacá-Centro |
| Duitama | Boyacá-Centro |
| Firavitoba | Boyacá-Centro |
| Nobsa | Boyacá-Centro |
| Otras | General |

**Tests agregados:** 7 tests de regional tagging + trigger_upsell logic.

---

## 3. Runbook de Validación Local

```bash
npm run typecheck   # ✅ 0 errors
npm run test -- software-engine  # ✅ 41 passed
npm run test        # ✅ 864 passed (53 files, 1 pre-existing failure)
```

---

## 4. Archivos Modificados

| Archivo | Acción |
|---------|--------|
| `src/app/software/page.tsx` | Hotfix: "1 mes gratis ilimitado" → "Gratis para siempre (1 habitación)" |
| `src/app/actions/public-lead.ts` | Klaviyo MCP payload + regional tagging + trigger_upsell logic |
| `src/__tests__/unit/software-engine.test.ts` | +10 tests (pricing hotfix + regional tagging) |
