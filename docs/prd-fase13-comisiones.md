# PRD Evolutivo — Phase 13: Transparencia de Comisiones y Arquitectura de Conversión B2B

> **Generado:** 2026-06-10
> **Contexto:** Refactorización de la tabla de comisiones y simulador de ROI para alinear con el modelo mental B2B SaaS.
> **Estado:** ✅ 0 TypeScript errors · 821 tests passing · 0 lint errors

---

## 1. Tabla de Auditoría de Comisiones

| Canal | Comisión | Framing UX | Acción Técnica | Estado |
|-------|----------|------------|----------------|--------|
| **Tu Motor Propio** | 0% | "WhatsApp, Instagram, Facebook → Solo el plan" | Constante `OWN_MOTOR_RATE = 0.0` | ✅ |
| **Red de Descubrimiento** | 10% | "Costo por adquisición de cliente nuevo" | Constante `HOSPEDASUITE_DISCOVERY_RATE = 0.10` | ✅ |
| **OTAs tradicionales** | 15-25% | "Booking, Airbnb, Expedia" (opacity 60%) | Constante `TRADITIONAL_OTA_RATE = 0.18` | ✅ |

**Heurística #1 (Visibilidad):** El bloque de transparencia ahora tiene subtítulo explicativo: *"El 10% de la Red de Descubrimiento es un costo por adquisición de cliente nuevo, no una comisión extractiva."*

**Ley de Hick:** 3 columnas claras, sin opciones adicionales. El Motor Propio (0%) destaca en verde.

---

## 2. Reporte de Inmunidad del Simulador de ROI

| Test | Mutación | Resultado | Kill Rate |
|------|----------|-----------|-----------|
| Motor Propio = 0% | Si fuera >0%, test falla | ✅ Killed | 100% |
| Red de Descubrimiento = 10% | Si fuera 0%, test detecta | ✅ Killed | 100% |
| OTA tradicional = 18% | Si fuera 0%, savings negativo | ✅ Killed | 100% |
| Invariante: 0% < 10% < 18% | Si se rompe el orden, test falla | ✅ Killed | 100% |

**21 tests passing** (incluye 3 mutation tests explícitos).

---

## 3. Runbook de Validación Local

```bash
npm run lint        # ✅ 0 errors (warnings pre-existentes)
npm run typecheck   # ✅ 0 errors
npm run test        # ✅ 821 passed (52 files)
```

---

## 4. Cambios vs. Versión Anterior

| Elemento | Antes | Después |
|----------|-------|---------|
| Columna 1 | "Tu link social" 0% | "Tu Motor Propio" 0% |
| Columna 2 | "Nuestra OTA" 10% | "Red de Descubrimiento" 10% + "Costo por adquisición" |
| Columna 3 | OTAs 15-20% | OTAs 15-25% |
| ROI Simulator | 2 filas (OTA vs Link Directo) | 3 filas (OTA vs Discovery vs Motor Propio) |
| JSON-LD FAQ | 5 preguntas | 6 preguntas (nueva: Motor Propio vs Red de Descubrimiento) |
| Constantes | `OTA_COMMISSION_RATE` | `TRADITIONAL_OTA_RATE`, `HOSPEDASUITE_DISCOVERY_RATE`, `OWN_MOTOR_RATE` |

---

## 5. Archivos Modificados

| Archivo | Acción |
|---------|--------|
| `src/app/software/page.tsx` | Transparency block refactorizado (3 columnas + subtítulo) |
| `src/components/public/ROISimulator.tsx` | 3-channel comparison UI |
| `src/lib/roi-calculator.ts` | Nuevas constantes + expanded interface |
| `src/components/seo/SoftwareJsonLd.tsx` | Nueva FAQ: Motor Propio vs Red de Descubrimiento |
| `src/__tests__/unit/roi-calculator.test.ts` | 21 tests (incluye mutation tests) |
