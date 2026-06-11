# PRD Evolutivo — Phase 15: Motor de Recursos GEO + TDD Suite

> **Generado:** 2026-06-10
> **Objetivo:** Implementar el motor dinámico de recursos GEO y la suite de tests con 24+ assertions.
> **Estado:** ✅ 0 TypeScript errors · 55 tests nuevos passing · 855 tests totales

---

## 1. Motor de Recursos GEO

### Ruta dinámica: `/software/recursos/[slug]`

| Recurso | URL | Bloque GEO | FAQs |
|---------|-----|------------|------|
| Channel Manager | `/software/recursos/channel-manager` | 52 palabras | 3 |
| Reservas Directas | `/software/recursos/reservas-directas` | 51 palabras | 3 |
| Motor Propio vs OTA | `/software/recursos/motor-propio-vs-ota` | 48 palabras | 2 |

Cada página incluye:
- JSON-LD Article + FAQPage structured data
- Bloque de citación GEO (40-60 palabras)
- FAQ con progressive disclosure (`<details>`)
- CTA → `/software` (conversión)

---

## 2. Reporte de Inmunidad — Test Suite

| Suite | Tests | Passed | Failed |
|-------|-------|--------|--------|
| software-engine.test.ts | 31 | 31 | 0 |
| roi-calculator.test.ts | 24 | 24 | 0 |
| **Total nuevo** | **55** | **55** | **0** |

### Mutation Tests (Kill Rate 100%)

| Mutación | Test | Resultado |
|----------|------|-----------|
| OTA = 0% | `netSavings` negativo | ✅ Killed |
| Discovery = 0% | `hospedaSuiteDiscoveryCost` = 0 | ✅ Killed |
| Fórmula sin restar plan | `netSavings` ≠ revenue × 0.18 - 99000 | ✅ Killed |
| Invariante 0% < 10% < 18% roto | Test de orden | ✅ Killed |
| GEO citation < 40 palabras | Word count validation | ✅ Killed |
| GEO citation > 60 palabras | Word count validation | ✅ Killed |
| FAQ vacía | `faq.q.length > 0` | ✅ Killed |

---

## 3. Runbook de Validación Local

```bash
npm run typecheck   # ✅ 0 errors
npm run test -- software-engine roi  # ✅ 55 passed
npm run test        # ✅ 855 passed (53 files, 1 pre-existing failure)
```

---

## 4. Archivos Creados

| Archivo | Propósito |
|---------|-----------|
| `src/app/software/recursos/[slug]/page.tsx` | Motor dinámico de recursos GEO (3 recursos) |
| `src/__tests__/unit/software-engine.test.ts` | 31 tests: GEO citations, FAQs, ROI, PLG, mutations |
