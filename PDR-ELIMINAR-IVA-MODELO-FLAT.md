# PDR: Eliminar IVA del Flujo de Pago — Modelo FLAT

## Contexto

**Problema**: El usuario ve "VAT included (19%)" y desgloses de IVA en todo el flujo de pago, generando confusión y fricción.

**Solución**: Implementar modelo FLAT (precio único, todo incluido). El precio que configura el hotelero es el precio final que paga el huésped. NO hay IVA visible, NO hay cálculos de tax, NO hay desglose fiscal.

**Alcance**: Todo el flujo de pago — OTA, checkout, success, dashboard, wizard.

---

## Principios de Diseño

1. **Precio = Valor Final**: El precio configurado por el hotelero es el precio final
2. **Sin Desglose Fiscal**: El huésped NO ve IVA, taxes, ni desgloses
3. **Simplicidad Radical**: Eliminar TODA la lógica de tax de la UI
4. **Persistencia Mínima**: Mantener tax_rate/tax_regime en DB solo para cumplimiento fiscal interno
5. **Retrocompatibilidad**: Las columnas DB existen pero no se usan en la UI

---

## FASE 1: Core Pricing (TDD)

### 1.1 Simplificar `src/lib/pricing.ts`

**Objetivo**: Eliminar TODA la lógica de tax. Precio base = precio final.

```typescript
// ANTES (250 líneas con tax)
export const RESPONSIBLE_IVA_RATE = 0.19;
export function calculateTaxAmount(subtotal, taxRate) { ... }
export function calculateTotalWithTax(basePrice, taxRate) { ... }
export function getEffectiveTaxRate(taxRate, taxRegime) { ... }
export function buildRoomPricingBreakdown({ ..., taxRate }) { ... }

// DESPUÉS (~80 líneas, sin tax)
export interface PriceBreakdown {
  subtotal: number;  // precio base × noches
  total: number;     // igual a subtotal (sin tax)
}

export function calculatePrice(basePrice: number, nights: number): PriceBreakdown {
  const subtotal = basePrice * nights;
  return { subtotal, total: subtotal };
}

export function buildRoomPricingBreakdown({
  pricePerNight,
  weekendPrice,
  checkIn,
  checkOut,
}: {
  pricePerNight: number;
  weekendPrice: number;
  checkIn: Date;
  checkOut: Date;
}): PriceBreakdown {
  // Calcular noches weekday/weekend
  // Calcular subtotal (sin tax)
  return { subtotal, total: subtotal };
}

export function formatPrice(amount: number): string {
  return amount.toLocaleString('es-CO');
}
```

**Tests** (TDD):
```typescript
describe('pricing sin IVA', () => {
  it('calcula precio simple sin tax', () => {
    const result = calculatePrice(300000, 3);
    expect(result.subtotal).toBe(900000);
    expect(result.total).toBe(900000); // igual a subtotal
  });

  it('calcula precio con weekend sin tax', () => {
    const result = buildRoomPricingBreakdown({
      pricePerNight: 300000,
      weekendPrice: 360000,
      checkIn: new Date('2026-08-14'), // jueves
      checkOut: new Date('2026-08-17'), // domingo (3 noches: jue, vie, sab)
    });
    expect(result.subtotal).toBe(300000 + 360000 + 360000); // 1020000
    expect(result.total).toBe(1020000); // igual a subtotal
  });
});
```

**Archivos afectados**:
- `src/lib/pricing.ts` — simplificar
- `src/__tests__/lib/pricing.test.ts` — actualizar tests

---

### 1.2 Simplificar `src/components/dashboard/price-calculator-logic.ts`

**Objetivo**: Eliminar TaxRegime y cálculo de IVA.

```typescript
// ANTES
export type TaxRegime = 'simplified' | 'responsible';
export interface PriceBreakdown {
  guestSees: number;
  iva: number;
  hotelReceives: number;
  // ...
}

// DESPUÉS
export interface PriceBreakdown {
  basePrice: number;    // precio configurado
  total: number;        // igual a basePrice (sin tax)
  // Sin iva, sin tax, sin regime
}

export function calculatePriceBreakdown(basePrice: number): PriceBreakdown {
  return { basePrice, total: basePrice };
}
```

**Archivos afectados**:
- `src/components/dashboard/price-calculator-logic.ts` — simplificar
- `src/components/dashboard/PriceCalculator.tsx` — eliminar selector de régimen
- `src/__tests__/dashboard/price-calculator-logic.test.ts` — actualizar

---

## FASE 2: OTA — Capa Pública (TDD)

### 2.1 Simplificar `src/components/ota/RoomCard.tsx`

**Objetivo**: Eliminar "(+ IVA)" y "(Sin IVA)" de la UI.

```typescript
// ANTES (líneas 423-428)
{priceBreakdown.hasTax && (
  <span title="El IVA se agrega al precio base">(+ IVA)</span>
)}
{!priceBreakdown.hasTax && (
  <span>(Sin IVA)</span>
)}

// DESPUÉS
// Eliminar completamente estas líneas
```

**Cambios**:
- Eliminar import de `getEffectiveTaxRate`, `getTaxLabel`
- Eliminar cálculo de `taxRate`, `iva`, `hasTax`, `taxLabel`
- Simplificar `priceBreakdown` para que solo tenga `subtotal` y `total`
- Eliminar líneas 423-428 que muestran "(+ IVA)" / "(Sin IVA)"

**Archivos afectados**:
- `src/components/ota/RoomCard.tsx` — simplificar
- `src/__tests__/component/RoomCard.test.tsx` — actualizar

---

### 2.2 Simplificar `src/components/ota/PriceBreakdown.tsx`

**Objetivo**: Eliminar desglose de IVA. Mostrar solo precio total.

```typescript
// ANTES (98 líneas con tax)
export default function PriceBreakdown({ pricePerNight, nights, taxRate, taxRegime }) {
  const effectiveRate = getEffectiveTaxRate(taxRate, taxRegime);
  const iva = Math.round(subtotal * effectiveRate);
  const total = subtotal + iva;
  return (
    <>
      <p>${formatCOP(subtotal)}</p>
      {iva > 0 && <p>IVA ({rate}%) ${formatCOP(iva)}</p>}
      <p>Total ${formatCOP(total)}</p>
    </>
  );
}

// DESPUÉS (~40 líneas, sin tax)
export default function PriceBreakdown({ pricePerNight, nights }: {
  pricePerNight: number;
  nights: number;
}) {
  const total = pricePerNight * nights;
  return (
    <>
      <p>${formatCOP(pricePerNight)} × {nights} noches</p>
      <p>Total ${formatCOP(total)}</p>
    </>
  );
}
```

**Archivos afectados**:
- `src/components/ota/PriceBreakdown.tsx` — simplificar
- `src/__tests__/component/PriceBreakdown.test.tsx` — actualizar

---

### 2.3 Simplificar `src/components/ota/room-detail/room-detail-calendar.tsx`

**Objetivo**: Eliminar "+ IVA" y línea de tax del summary bar.

```typescript
// ANTES (líneas 126-130)
{output.taxRate > 0 ? (
  <p className="text-[10px] text-muted-foreground font-medium" title="El IVA se agrega al precio base">+ IVA</p>
) : (
  <p className="text-[10px] text-muted-foreground/50 font-medium">Sin IVA</p>
)}

// DESPUÉS
// Eliminar completamente este bloque

// ANTES (líneas 185-192)
{summary.tax > 0 && (
  <div className="flex justify-between">
    <span>{t('ota.roomDetail.tax', { rate: Math.round(summary.taxRate * 100) })}</span>
    <span>${formatPrice(summary.tax)}</span>
  </div>
)}

// DESPUÉS
// Eliminar completamente este bloque
```

**Archivos afectados**:
- `src/components/ota/room-detail/room-detail-calendar.tsx` — simplificar
- `src/__tests__/ota/room-detail-calendar.test.tsx` — actualizar

---

### 2.4 Simplificar `src/components/ota/MobileStickyCta.tsx`

**Objetivo**: Eliminar "+ IVA" / "Sin IVA" del CTA móvil.

```typescript
// ANTES (línea 95)
<p className="text-[9px] text-muted-foreground/60" title="El IVA se agrega al precio base">
  {effectiveRate > 0 ? '+ IVA' : 'Sin IVA'}
</p>

// DESPUÉS
// Eliminar completamente esta línea
```

**Archivos afectados**:
- `src/components/ota/MobileStickyCta.tsx` — simplificar

---

## FASE 3: Checkout (TDD)

### 3.1 Simplificar `src/app/(direct)/book/[slug]/checkout/page.tsx`

**Objetivo**: Eliminar cálculo de tax. Precio base = precio final.

```typescript
// ANTES (líneas 72-80)
const effectiveTaxRate = getEffectiveTaxRate(hotel.tax_rate, hotel.tax_regime);
const pricing = buildRoomPricingBreakdown({
  pricePerNight: roomPrice,
  weekendPrice,
  taxRate: effectiveTaxRate,
  checkIn: checkInDate,
  checkOut: checkOutDate,
});
const basePrice = pricing.subtotal;

// DESPUÉS
const pricing = buildRoomPricingBreakdown({
  pricePerNight: roomPrice,
  weekendPrice,
  checkIn: checkInDate,
  checkOut: checkOutDate,
});
const basePrice = pricing.total; // igual a subtotal (sin tax)
```

**Archivos afectados**:
- `src/app/(direct)/book/[slug]/checkout/page.tsx` — simplificar

---

### 3.2 Simplificar `src/components/checkout/CheckoutForm.tsx`

**Objetivo**: Eliminar cálculo de tax. grandTotal = subtotal.

```typescript
// ANTES (líneas 74-77)
const subtotal = basePrice;
const effectiveRate = getEffectiveTaxRate(hotel.tax_rate, hotel.tax_regime);
const taxes = Math.round(subtotal * effectiveRate);
const grandTotal = subtotal + taxes;

// DESPUÉS
const grandTotal = basePrice; // sin tax
```

**Cambios adicionales**:
- Eliminar import de `getEffectiveTaxRate`
- Eliminar prop `taxRate` de `<PriceBreakdown>` (línea 382)
- Simplificar `<PriceBreakdown>` para que no reciba taxRate

**Archivos afectados**:
- `src/components/checkout/CheckoutForm.tsx` — simplificar
- `src/__tests__/checkout/CheckoutForm.test.tsx` — actualizar

---

### 3.3 Simplificar `src/app/(direct)/book/success/page.tsx`

**Objetivo**: Eliminar taxRate de PriceBreakdown.

```typescript
// ANTES (líneas 146-151)
<PriceBreakdown
  pricePerNight={Math.round(booking.subtotal / booking.nights)}
  nights={booking.nights}
  taxRate={booking.taxRate ?? 0}
  showDetails={false}
/>

// DESPUÉS
<PriceBreakdown
  pricePerNight={Math.round(booking.total_price / booking.nights)}
  nights={booking.nights}
  showDetails={false}
/>
```

**Archivos afectados**:
- `src/app/(direct)/book/success/page.tsx` — simplificar

---

## FASE 4: Admin Dashboard (TDD)

### 4.1 Simplificar `src/components/dashboard/PriceCalculator.tsx`

**Objetivo**: Eliminar selector de régimen tributario.

```typescript
// ANTES
<button onClick={() => handleRegimeChange("simplified")}>Simplificado</button>
<button onClick={() => handleRegimeChange("responsible")}>Responsable de IVA</button>
{taxRegime === "responsible" && (
  <>
    <span>IVA (19%)</span>
    <span>{formatCOP(breakdown.iva)}</span>
  </>
)}

// DESPUÉS
// Eliminar botones de régimen
// Eliminar bloque condicional de IVA
// Mostrar solo: Precio Base = Total
```

**Archivos afectados**:
- `src/components/dashboard/PriceCalculator.tsx` — simplificar
- `src/components/dashboard/RoomEditorModal.tsx` — eliminar prop taxRegime

---

### 4.2 Simplificar `src/components/dashboard/SettingsPanel.tsx`

**Objetivo**: Eliminar selector de régimen tributario del settings.

```typescript
// ANTES (líneas 670-690)
<label>Régimen Tributario</label>
<select {...register("tax_rate")}>
  <option value={0}>Régimen Simplificado (sin IVA)</option>
  <option value={0.19}>Régimen Ordinario (IVA 19%)</option>
</select>

// DESPUÉS
// Eliminar completamente este bloque
// El tax_rate se configura internamente (default 0)
```

**Nota**: Si legalmente se requiere que el hotelero configure el régimen, mantener el selector pero NO mostrarlo en la UI del huésped. Por ahora, eliminarlo completamente.

**Archivos afectados**:
- `src/components/dashboard/SettingsPanel.tsx` — eliminar selector

---

## FASE 5: Onboarding / Wizard (TDD)

### 5.1 Simplificar `src/components/onboarding/SettingsStep.tsx`

**Objetivo**: Eliminar sección de tax del wizard.

```typescript
// ANTES (líneas 129-159)
<button onClick={() => updateSettings({ tax_regime: 'simplified' })}>
  Simplificado — No cobras IVA al huésped
</button>
<button onClick={() => updateSettings({ tax_regime: 'responsible' })}>
  Responsable de IVA — Cobras 19% IVA adicional
</button>

// DESPUÉS
// Eliminar completamente esta sección
```

**Archivos afectados**:
- `src/components/onboarding/SettingsStep.tsx` — eliminar sección tax
- `src/store/useOnboardingStore.ts` — eliminar taxRate, tax_regime del state

---

### 5.2 Simplificar `src/components/onboarding/RoomDetailStep.tsx`

**Objetivo**: Eliminar prop taxRegime de PriceCalculator.

```typescript
// ANTES (línea 264)
<PriceCalculator basePrice={room.price} taxRegime="simplified" compact />

// DESPUÉS
<PriceCalculator basePrice={room.price} compact />
```

**Archivos afectados**:
- `src/components/onboarding/RoomDetailStep.tsx` — eliminar prop

---

## FASE 6: Actions / Server-Side (TDD)

### 6.1 Simplificar `src/app/actions/bookings.ts`

**Objetivo**: Eliminar cálculo de tax en validación.

```typescript
// ANTES (líneas 346-367)
const { data: hotelData } = await supabaseAdmin
  .from('hotels')
  .select('tax_rate, tax_regime')
  .eq('id', room.hotel_id)
  .single();

const hotelTaxRate = getEffectiveTaxRate(hotelData?.tax_rate, hotelData?.tax_regime);
const pricing = buildRoomPricingBreakdown({
  pricePerNight: roomPrice,
  weekendPrice,
  taxRate: hotelTaxRate,
  checkIn,
  checkOut,
});

const maxExpected = Math.round(pricing.total * 1.05);
const minExpected = Math.round(pricing.subtotal * 0.95);

// DESPUÉS
const pricing = buildRoomPricingBreakdown({
  pricePerNight: roomPrice,
  weekendPrice,
  checkIn,
  checkOut,
});

const expectedAmount = pricing.total;
const maxExpected = Math.round(expectedAmount * 1.05);
const minExpected = Math.round(expectedAmount * 0.95);
```

**Cambios adicionales**:
- Eliminar import de `getEffectiveTaxRate`
- Eliminar inserción de `tax_amount`, `tax_rate_applied` en booking (líneas 435-436)
- Simplificar `verifyBookingAction` para que no retorne tax info

**Archivos afectados**:
- `src/app/actions/bookings.ts` — simplificar
- `src/__tests__/actions/bookings.test.ts` — actualizar

---

## FASE 7: Tipos / Interfaces (TDD)

### 7.1 Simplificar `src/types/database.ts`

**Objetivo**: Mantener columnas tax en DB (para cumplimiento fiscal) pero marcarlas como opcionales/legacy.

```typescript
// ANTES
bookings: {
  Row: {
    subtotal?: number;
    tax_amount?: number;
    tax_rate_applied?: number;
    // ...
  }
}

// DESPUÉS
bookings: {
  Row: {
    // Mantener columnas pero no usarlas en la UI
    subtotal?: number;  // legacy
    tax_amount?: number;  // legacy
    tax_rate_applied?: number;  // legacy
    // ...
  }
}
```

**Nota**: NO eliminar las columnas de la DB. Solo dejar de usarlas en el código.

**Archivos afectados**:
- `src/types/database.ts` — agregar comentarios "legacy"
- `src/types/index.ts` — eliminar tax_rate, tax_regime de Hotel interface (si no se usa)

---

## FASE 8: View Models / Gateways (TDD)

### 8.1 Simplificar `src/view-models/room-detail-view-model.ts`

**Objetivo**: Eliminar tax del output.

```typescript
// ANTES
export interface RoomDetailViewModelOutput {
  pricing: {
    subtotal: number;
    tax: number;
    taxRate: number;
    total: number;
  };
}

// DESPUÉS
export interface RoomDetailViewModelOutput {
  pricing: {
    subtotal: number;
    total: number;  // igual a subtotal
  };
}
```

**Archivos afectados**:
- `src/view-models/room-detail-view-model.ts` — simplificar
- `src/domain/room-availability.ts` — simplificar PriceBreakdown
- `src/gateways/supabase-room-gateway.ts` — eliminar getEffectiveTaxRate

---

## FASE 9: i18n (TDD)

### 9.1 Simplificar `messages/es.json` y `messages/en.json`

**Objetivo**: Eliminar keys de tax.

```json
// ANTES
{
  "tax": "IVA ({rate}%)",
  "taxes": "impuestos",
  "taxesAndFees": "Impuestos y tasas"
}

// DESPUÉS
{
  // Eliminar "tax" key
  // Mantener "taxes" y "taxesAndFees" si se usan en otros contextos
}
```

**Archivos afectados**:
- `messages/es.json` — eliminar key "tax"
- `messages/en.json` — eliminar key "tax"

---

## FASE 10: Migraciones SQL (NO APLICAR AHORA)

**Nota**: NO eliminar columnas de la DB. Mantener tax_rate, tax_regime, tax_amount, tax_rate_applied para cumplimiento fiscal interno. Solo dejar de usarlas en la UI.

**Archivos afectados**:
- Ninguno (no crear nuevas migraciones)

---

## Resumen de Cambios

| Fase | Archivos Afectados | Líneas Eliminadas | Líneas Agregadas |
|------|-------------------|-------------------|------------------|
| 1. Core Pricing | 2 | ~170 | ~80 |
| 2. OTA | 4 | ~70 | ~30 |
| 3. Checkout | 3 | ~30 | ~15 |
| 4. Admin Dashboard | 2 | ~40 | ~10 |
| 5. Onboarding | 2 | ~30 | ~5 |
| 6. Actions | 1 | ~20 | ~10 |
| 7. Tipos | 2 | ~10 | ~5 |
| 8. View Models | 3 | ~20 | ~10 |
| 9. i18n | 2 | ~5 | ~0 |
| **TOTAL** | **21 archivos** | **~395 líneas** | **~165 líneas** |

**Reducción neta**: ~230 líneas de código eliminadas

---

## Orden de Implementación (Uncle Bob Workflow)

1. **FASE 1** — Core Pricing (TDD) — Base de todo
2. **FASE 2** — OTA (TDD) — Impacto directo en huésped
3. **FASE 3** — Checkout (TDD) — Flujo de pago
4. **FASE 4** — Admin Dashboard (TDD) — Impacto en hotelero
5. **FASE 5** — Onboarding (TDD) — Setup inicial
6. **FASE 6** — Actions (TDD) — Server-side
7. **FASE 7** — Tipos — TypeScript
8. **FASE 8** — View Models — Domain layer
9. **FASE 9** — i18n — Traducciones
10. **FASE 10** — Migraciones SQL — NO APLICAR

---

## Criterios de Aceptación

- [ ] El huésped NO ve IVA en ningún punto del flujo OTA
- [ ] El checkout NO muestra desglose de IVA
- [ ] La success page NO muestra IVA
- [ ] El dashboard NO muestra selector de régimen tributario
- [ ] El wizard NO tiene sección de tax
- [ ] El precio configurado por el hotelero = precio final pagado por el huésped
- [ ] Todos los tests pasan
- [ ] No hay errores de TypeScript
- [ ] Las columnas tax permanecen en la DB (para cumplimiento fiscal)

---

## Riesgos

1. **Cumplimiento Fiscal**: Si legalmente se requiere mostrar IVA, este cambio viola la regulación. **Verificar con contador/abogado**.
2. **Retrocompatibilidad**: Las columnas tax en DB quedan como legacy. Si se necesitan en el futuro, habrá que re-implementar.
3. **Hoteleros**: Algunos hoteleros pueden querer mostrar "IVA incluido" como ventaja competitiva. **Evaluar si se necesita opción configurable**.

---

## Recomendación

**Proceder con la implementación** si:
- ✅ Legalmente NO es obligatorio mostrar IVA en Colombia para este tipo de negocio
- ✅ El modelo de negocio es "precio único, todo incluido"
- ✅ Se quiere simplificar radicalmente la experiencia del usuario

**NO proceder** si:
- ❌ Legalmente se requiere mostrar IVA
- ❌ Los hoteleros necesitan configurar régimen tributario
- ❌ Se quiere mantener la flexibilidad de mostrar/ocultar IVA

---

## Siguiente Paso

¿Apruebas este PDR para proceder con la implementación fase por fase (TDD)?
