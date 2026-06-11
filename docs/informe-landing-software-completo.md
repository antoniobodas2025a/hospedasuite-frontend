# 📋 Informe Completo — Landing `/software`

> **Generado:** 2026-06-10
> **Archivo:** `src/app/software/page.tsx` (563 líneas)
> **Estado:** ✅ 0 TypeScript errors · 821 tests passing · 0 lint errors
> **URL:** `https://hospedasuite.com/software`

---

## 1. ESTRUCTURA DE SECCIONES (scroll order)

| # | Sección | ID | Propósito |
|---|---------|----|-----------|
| 1 | **Nav** | — | Logo + links (Ecosistema, Precios, Garantía) + CTA "Iniciar 1 Mes Gratis" |
| 2 | **Hero** | — | H1 + subtítulo + bloque GEO + 2 CTAs |
| 3 | **Ecosistema** | `#modelo` | 3 cards: Link Directo (0%), PMS Central (featured), OTA (10%) |
| 4 | **ROI Simulator** | — | Calculadora educativa con fórmula visible + CTA → modal |
| 5 | **Pricing** | `#precios` | 4 tabs + card dinámica + transparencia + FAQ + garantía |
| 6 | **Footer** | — | Logo + copyright |

---

## 2. HERO — Copy completo

**Badge:** `El Cerebro Operativo de tu Hotel`

**H1:** `Gestión total, cero comisiones.`

**Subtítulo:** `PMS + Channel Manager + Reservas directas por WhatsApp. 1 mes gratis. Instalación VIP incluida. Tu suscripción empieza en el mes 2.`

**Bloque GEO (52 palabras):**
> HospedaSuite es un PMS y Channel Manager diseñado para que hoteles boutique y glampings centralicen su operación. Funciona como el cerebro del hotel, permitiendo recibir reservas directas vía WhatsApp con cero por ciento de comisión y bloqueando automáticamente el inventario en plataformas como Booking y Airbnb para evitar sobreventas.

**CTAs:** `Ver Planes y Precios` (primario) · `Cómo funciona` (secundario)

---

## 3. ECOSISTEMA — 3 cards

| Card | Título | Copy | Número |
|------|--------|------|--------|
| 📱 | Link Directo | Tu link para WhatsApp. El cliente paga vía Wompi, el inventario se bloquea solo. | **0%** Comisión |
| 🏢 | PMS Central | El cerebro de la operación. Tarifas, POS, huéspedes y Channel Manager desde una sola pantalla. | 1 Mes Gratis |
| 🌐 | HospedaSuite OTA | Publicación automática bilingüe. Si estás en el PMS, estás visible al mundo. | **10%** Comisión OTA |

---

## 4. ROI SIMULATOR — Calculadora Educativa

**Título:** `¿Cuánto te cuestan las comisiones?`

**Inputs:**
- Tarifa promedio por noche (slider: $80.000 → $800.000, default $250.000)
- Reservas/mes (slider: 1 → 60, default 15)

**Sección "Ingreso Total":** Banner visible con el cálculo `tarifa × reservas`

**3 Canales comparativos:**

| Canal | Copy persuasivo | Costo |
|-------|----------------|-------|
| **OTAs tradicionales (18%)** | Booking, Airbnb, Expedia | −$675.000 |
| **Red de Descubrimiento (10%)** | Costo por adquisición de cliente nuevo | −$375.000 |
| **Tu Motor Propio (0%)** | Tu link personal para WhatsApp, IG y Facebook. Tus clientes reservan directo, **sin que nadie te quite comisión**. Solo el plan ($99.000/mes) — el resto es tuyo. | −$99.000 |

**Fórmula explicada (dolor/ganancia):**
- ✕ Con OTA: te quedás con `$3.075.000` de `$3.750.000`
- ✓ Con tu link: te quedás con `$3.651.000` de `$3.750.000`
- `$675.000` que le das a la OTA − `$99.000` tu plan = `$576.000` **más en tu bolsillo**

**Ahorro prominente:** `text-6xl` + fondo gradiente verde + ícono TrendingUp

**CTA clickeable:** `Empezá a ahorrar hoy →` abre modal

---

## 5. PRICING — 4 planes

| | Free | Starter | Pro | Enterprise |
|---|---|---|---|---|
| **Precio** | Gratis | $49.000 | $99.000 | $199.000 |
| **Habitaciones** | 1 | 1-4 | 5-14 | 15-30 |
| **Badge** | Sin Tarjeta | — | Más Popular | — |
| **Features** | PMS Core, 1 hab, Link Directo, OTA bilingüe, 1 mes gratis ilimitado | Todo Free + hasta 4 hab, Reviews moderadas | Todo Starter + Channel Manager (3 OTAs), Carta QR, POS, Libro Forense | Todo Pro + hasta 30 hab, 6 OTAs, 15 staff, Soporte prioritario |

**CTA en cada plan:** `Empezar Gratis` → abre modal

---

## 6. TRANSPARENCIA EN COMISIONES (3 columnas)

| Tu Motor Propio | Red de Descubrimiento | OTAs tradicionales |
|---|---|---|
| **0%** | **10%** | **15-25%** |
| WhatsApp, IG, FB | [hospedasuite.com](https://hospedasuite.com/) | Booking, Airbnb, Expedia |

**Subtítulo explicativo:** *"El 10% de la Red de Descubrimiento es un costo por adquisición de cliente nuevo, no una comisión extractiva."*

---

## 7. FAQ (5 preguntas)

| # | Pregunta | Respuesta resumida |
|---|----------|-------------------|
| q1 | ¿Cómo funciona el pago? | 100% directo a Wompi del hotel. Factura mensual por plan + comisiones. |
| q2 | ¿Qué es el Channel Manager? | Seguro anti-sobreventa conectado a Booking y Airbnb. |
| q3 | ¿Qué pasa si agrego una segunda habitación? | Free incluye 1. Al agregar 2da → sugiere Starter ($49K). Upgrade inmediato. |
| q4 | ¿La OTA es bilingüe? | Sí, ES/EN automático según idioma del visitante. |
| q5 | ¿Más de 30 habitaciones? | Plan personalizado. Enterprise cubre hasta 30. |

---

## 8. GARANTÍA

> **Garantía de Extensión** — Prueba gratis 1 mes. Si en 30 días no te generamos al menos 1 reserva, te regalamos 1 mes adicional hasta que lo logremos.

---

## 9. LEAD CAPTURE MODAL

**Campos (4 obligatorios + 1 opcional):**
1. Nombre (req)
2. Email (req)
3. WhatsApp (req)
4. Alojamiento (req)
5. Ciudad (opcional)

**Flujo:** Submit → guarda en `hunted_leads` → redirect a `/software/onboarding?plan={selectedTier}`

---

## 10. JSON-LD (SEO/GEO)

- **SoftwareApplication** con 4 offers (Free, Starter, Pro, Enterprise)
- **FAQPage** con 6 preguntas (incluye Motor Propio vs Red de Descubrimiento)
- **AggregateRating:** 4.8/5, 120 reviews

---

## 11. TÉCNICO

| Aspecto | Detalle |
|---------|---------|
| Framework | Next.js 16 + React 19 + Tailwind v4 |
| Estilo | Apple-style, glassmorphism, squircles, cursor glow |
| Animaciones | Spring physics, hover transitions, progressive disclosure |
| Tests | 821 passing (incluye 24 de ROI calculator con mutation tests) |
| TypeScript | 0 errores |
| Lint | 0 errores |

---

## 12. ARCHIVOS RELACIONADOS

| Archivo | Propósito |
|---------|-----------|
| `src/app/software/page.tsx` | Landing page principal (563 líneas) |
| `src/components/seo/SoftwareJsonLd.tsx` | JSON-LD structured data (SoftwareApplication + FAQPage) |
| `src/components/public/ROISimulator.tsx` | Calculadora educativa de ahorro (fórmula visible, copy persuasivo) |
| `src/components/public/LeadCaptureModal.tsx` | Modal de captura de leads (4 campos → redirect a wizard) |
| `src/app/actions/public-lead.ts` | Server action → `hunted_leads` |
| `src/lib/roi-calculator.ts` | Pure functions del ROI (constantes inmutables) |
| `src/__tests__/unit/roi-calculator.test.ts` | 24 tests unitarios (incluye mutation tests) |

---

## 13. HISTORIAL DE FASES

| Fase | Descripción | Documentos |
|------|-------------|------------|
| Phase 10-12 | 4 planes + "habitaciones" + Von Restorff + lead→wizard | `docs/reporte-landing-software.md` |
| Phase 13 | Transparencia de comisiones: Motor Propio vs Red de Descubrimiento | `docs/prd-fase13-comisiones.md` |
| Phase 14 | ROI pedagógico: fórmula visible + copy persuasivo dolor/ganancia | `docs/prd-fase14-roi-pedagogico.md` |
