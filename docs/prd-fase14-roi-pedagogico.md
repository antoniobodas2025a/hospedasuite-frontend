# PRD Evolutivo — Phase 14: Refactorización Pedagógica del Simulador de ROI

> **Generado:** 2026-06-10
> **Objetivo:** Eliminar ambigüedad matemática del simulador de ROI. Hacer la calculadora transparente, educativa e inmune a dudas lógicas.
> **Estado:** ✅ 0 TypeScript errors · 24 ROI tests passing (Kill Rate 100%)

---

## 1. Cambios de Jerarquía Visual (Fitts's Law)

| Elemento | Antes | Después |
|----------|-------|---------|
| Ingreso Total | No visible | Banner dedicado arriba de los resultados |
| Fórmula | Oculta | Sección explicada: `comisión OTA - plan = ahorro` |
| Ahorro | `text-2xl` | `text-5xl sm:text-6xl` + fondo gradiente + ícono |
| Tooltip Motor Propio | Sin tooltip | Muestra `formatCOP(PRO_PLAN_COST)/mes` inline |
| Break-even | No mostrado | Mensaje condicional si ahorro < 0 |

---

## 2. Fórmula Explicada (Ley de Postel)

El simulador ahora muestra explícitamente:

```
$675.000 comisión OTA − $99.000 tu plan = $576.000
```

Esto elimina la pregunta "¿de dónde sale este número?" y educa al hotelero sobre el modelo de negocio.

---

## 3. Reporte de Inmunidad — Mutation Tests

| Test | Mutación | Resultado | Kill Rate |
|------|----------|-----------|-----------|
| Fórmula `(Ingreso × 0.18) - 99000` | Si no resta el plan | ✅ Killed | 100% |
| Fórmula usa 18% exacto | Si usa 15% en vez de 18% | ✅ Killed | 100% |
| Fórmula sin restar plan | Si savings = revenue × 0.18 | ✅ Killed | 100% |

**24 tests passing** (incluye 3 mutation tests de fórmula + 3 de constantes + 18 de cálculo).

---

## 4. Validación Local

```bash
npm run typecheck   # ✅ 0 errors
npm run test -- roi  # ✅ 24 passed (ROI only)
```

**Nota:** 3 tests pre-existentes fallan en `map-resolver.test.ts` (encoding de URL `%20` vs `+`). No relacionados con esta fase.

---

## 5. Archivos Modificados

| Archivo | Acción |
|---------|--------|
| `src/components/public/ROISimulator.tsx` | Refactor completo: fórmula visible, ahorro prominente, tooltip plan |
| `src/__tests__/unit/roi-calculator.test.ts` | +3 mutation tests de fórmula |
