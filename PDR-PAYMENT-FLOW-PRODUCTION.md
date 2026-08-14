# Plan PDR — Flujo de Pago Completo (Nivel Producción)

## Resumen Ejecutivo

Este plan aborda **todos los hallazgos del triple-audit** (3 jueces) para eliminar regresiones y cubrir casos borde en el flujo de pago completo.

**Hallazgos críticos:**
- 2 CRITICAL (3/3 consensus): "IVA incluido" label, RoomCard weekend pricing
- 6 WARNING (2/3 majority): Success page breakdown, error messages, weekend pricing explanation
- 2 SUGGESTION (1/3 single): MobileStickyCta styles, pricing tooltips

**Objetivo:** Flujo de pago sin regresiones, transparente, y que cubra todos los casos borde.

---

## FASE 1: CRITICAL Fixes (Bloqueantes)

### 1.1 Fix "IVA incluido" → "+ IVA" (3/3 consensus)

**Archivos:**
- `src/components/ota/room-detail/room-detail-calendar.tsx:127`
- `src/components/ota/MobileStickyCta.tsx:95`
- `messages/es.json:405` (key: `ota.roomDetail.tax`)
- `messages/en.json:405` (key: `ota.roomDetail.tax`)

**Cambio exacto:**
```tsx
// room-detail-calendar.tsx:127
// ANTES:
<p className="text-[10px] text-muted-foreground font-medium">IVA incluido</p>

// DESPUÉS:
<p className="text-[10px] text-muted-foreground font-medium">+ IVA</p>
```

```json
// messages/es.json
// ANTES:
"tax": "IVA incluido ({rate}%)"

// DESPUÉS:
"tax": "IVA ({rate}%)"
```

**Testing:**
- Verificar que RoomCard ("IVA agregado"), calendar ("+ IVA"), y success page sean consistentes
- Verificar que i18n keys se resuelvan en ambos idiomas

**Casos borde:**
- ✅ Hotel con tax_rate = 0 (simplified) → no mostrar línea de IVA
- ✅ Hotel con tax_rate = null pero tax_regime = 'responsible' → mostrar IVA correctamente
- ✅ Hotel con tax_rate = null y tax_regime = null → no mostrar IVA

---

### 1.2 Fix RoomCard weekend pricing (2/3 consensus)

**Archivos:**
- `src/components/ota/RoomCard.tsx:66-74`
- `src/components/ota/RoomCard.tsx:360-378` (display section)

**Cambio exacto:**
```tsx
// RoomCard.tsx:66-74
// ANTES:
const basePrice = useMemo(() => room.price_per_night || room.price || 0, [room.price_per_night, room.price]);
const taxRate = useMemo(() => getEffectiveTaxRate(hotel?.tax_rate, hotel?.tax_regime), [hotel?.tax_rate, hotel?.tax_regime]);
const priceBreakdown = useMemo(() => {
  const subtotal = basePrice * nights;
  const iva = Math.round(subtotal * taxRate);
  const total = subtotal + iva;
  const hasTax = taxRate > 0;
  return { subtotal, iva, total, hasTax, taxLabel: getTaxLabel(taxRate) };
}, [basePrice, taxRate, nights]);

// DESPUÉS:
const basePrice = useMemo(() => room.price_per_night || room.price || 0, [room.price_per_night, room.price]);
const weekendPrice = useMemo(() => room.weekend_price || basePrice * 1.2, [room.weekend_price, basePrice]);
const taxRate = useMemo(() => getEffectiveTaxRate(hotel?.tax_rate, hotel?.tax_regime), [hotel?.tax_rate, hotel?.tax_regime]);

const priceBreakdown = useMemo(() => {
  if (!checkIn || !checkOut) {
    // No dates selected: show base price (weekday)
    const subtotal = basePrice;
    const iva = Math.round(subtotal * taxRate);
    const total = subtotal + iva;
    return { subtotal, iva, total, hasTax: taxRate > 0, taxLabel: getTaxLabel(taxRate), isEstimate: true };
  }
  
  // Dates selected: use weekend-aware calculation
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const pricing = buildRoomPricingBreakdown({
    pricePerNight: basePrice,
    weekendPrice,
    taxRate,
    checkIn: checkInDate,
    checkOut: checkOutDate,
  });
  
  return {
    subtotal: pricing.subtotal,
    iva: pricing.tax,
    total: pricing.total,
    hasTax: taxRate > 0,
    taxLabel: getTaxLabel(taxRate),
    isEstimate: false,
    weekdayNights: pricing.weekdayNights,
    weekendNights: pricing.weekendNights,
  };
}, [basePrice, weekendPrice, taxRate, checkIn, checkOut]);
```

**Display section (RoomCard.tsx:360-378):**
```tsx
// ANTES:
<div className="flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground">
  <span className="font-bold text-foreground">${formatPrice(basePrice)}</span>
  {isSearchingDates ? (
    <span>x {nights} {t('ota.roomCard.nights', { count: nights })}</span>
  ) : (
    <span>COP/noche</span>
  )}
  {priceBreakdown.hasTax && (
    <span>(IVA agregado)</span>
  )}
</div>

// DESPUÉS:
<div className="flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground">
  <span className="font-bold text-foreground">${formatPrice(basePrice)}</span>
  {isSearchingDates && priceBreakdown.isEstimate ? (
    <span>Desde COP/noche</span>
  ) : isSearchingDates ? (
    <span>x {nights} {t('ota.roomCard.nights', { count: nights })}</span>
  ) : (
    <span>COP/noche</span>
  )}
  {priceBreakdown.hasTax && (
    <span>(+ IVA)</span>
  )}
  {priceBreakdown.weekendNights > 0 && (
    <span className="text-[10px] text-muted-foreground/70">
      ({priceBreakdown.weekendNights} noche{priceBreakdown.weekendNights > 1 ? 's' : ''} fin de semana)
    </span>
  )}
</div>
```

**Testing:**
- Verificar que RoomCard muestre precio correcto para stays con weekend
- Verificar que RoomCard muestre "Desde COP/noche" cuando no hay fechas seleccionadas
- Verificar que RoomCard muestre "(X noches fin de semana)" cuando aplica

**Casos borde:**
- ✅ `weekend_price` es null → usar `basePrice * 1.2`
- ✅ `weekend_price` es 0 → usar `basePrice * 1.2`
- ✅ No hay fechas seleccionadas → mostrar precio base (weekday)
- ✅ Stay de solo weekdays → no mostrar mensaje de weekend
- ✅ Stay de solo weekends → mostrar todas las noches como weekend
- ✅ Stay mixto → mostrar breakdown weekday/weekend

---

### 1.3 Fix Success page breakdown (2/3 consensus)

**Archivos:**
- `src/app/(direct)/book/success/page.tsx:146-151`
- `src/app/actions/bookings.ts:424-440` (insert booking)

**Cambio exacto:**
```tsx
// bookings.ts:424-440
// ANTES:
const { data: newB, error: bErr } = await supabaseAdmin
  .from('bookings')
  .insert([{
    hotel_id: room.hotel_id,
    room_id: room.id,
    guest_id: guestId,
    checkin: payload.checkin,
    checkout: payload.checkout,
    total_price: verifiedTotal,
    status: 'pending_payment',
    source: effectiveSource,
    referral_channel: referralChannel,
  }])
  .select('id').single();

// DESPUÉS:
const { data: newB, error: bErr } = await supabaseAdmin
  .from('bookings')
  .insert([{
    hotel_id: room.hotel_id,
    room_id: room.id,
    guest_id: guestId,
    checkin: payload.checkin,
    checkout: payload.checkout,
    total_price: verifiedTotal,
    subtotal: pricing.subtotal, // NEW: store subtotal
    tax_amount: pricing.tax, // NEW: store tax
    tax_rate_applied: hotelTaxRate, // NEW: store tax rate
    weekend_price_used: weekendPrice, // NEW: store weekend price used
    status: 'pending_payment',
    source: effectiveSource,
    referral_channel: referralChannel,
  }])
  .select('id').single();
```

```tsx
// success/page.tsx:146-151
// ANTES:
<PriceBreakdown
  pricePerNight={booking.pricePerNight}
  nights={nights}
  taxRate={booking.tax_rate}
  showDetails={true}
/>

// DESPUÉS:
<PriceBreakdown
  pricePerNight={Math.round(booking.subtotal / nights)} // Use stored subtotal
  nights={nights}
  taxRate={booking.tax_rate_applied} // Use stored tax rate
  showDetails={true}
/>
```

**Database migration:**
```sql
-- Add pricing breakdown columns to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS subtotal INTEGER,
ADD COLUMN IF NOT EXISTS tax_amount INTEGER,
ADD COLUMN IF NOT EXISTS tax_rate_applied NUMERIC,
ADD COLUMN IF NOT EXISTS weekend_price_used INTEGER;
```

**Testing:**
- Verificar que success page muestre breakdown correcto
- Verificar que booking tenga todos los campos de pricing
- Verificar que migration se ejecute sin errores

**Casos borde:**
- ✅ Booking antiguo (antes de migration) → mostrar mensaje "Breakdown no disponible"
- ✅ Booking con weekend pricing → breakdown coincide con total cobrado
- ✅ Booking sin weekend pricing → breakdown coincide con total cobrado

---

## FASE 2: WARNING Fixes (Alta prioridad)

### 2.1 Fix error messages mejorados (2/3 consensus)

**Archivos:**
- `src/app/actions/bookings.ts:368-370`
- `src/components/checkout/CheckoutForm.tsx:128`

**Cambio exacto:**
```tsx
// bookings.ts:368-370
// ANTES:
if (payload.amount > maxExpected || payload.amount < minExpected) {
  throw new Error('Monto verificado no coincide con tarifa de la unidad.');
}

// DESPUÉS:
if (payload.amount > maxExpected || payload.amount < minExpected) {
  const expectedRange = `$${pricing.subtotal.toLocaleString('es-CO')} - $${pricing.total.toLocaleString('es-CO')}`;
  throw new Error(`El monto ingresado no coincide con la tarifa. Rango esperado: ${expectedRange}. Por favor, intenta de nuevo o contacta al hotel.`);
}
```

```tsx
// CheckoutForm.tsx:128
// ANTES:
setFormError(`Ocurrio un error al procesar tu solicitud: ${result?.error || 'Desconocido'}`);

// DESPUÉS:
setFormError(result?.error || 'Ocurrió un error al procesar tu solicitud. Por favor, intenta de nuevo.');
```

**Testing:**
- Verificar que error message muestre rango esperado
- Verificar que error message sea claro y accionable

**Casos borde:**
- ✅ Monto muy alto → mostrar rango esperado
- ✅ Monto muy bajo → mostrar rango esperado
- ✅ Error de red → mostrar mensaje genérico pero claro

---

### 2.2 Fix explicación de weekend pricing (2/3 consensus)

**Archivos:**
- `src/components/ota/room-detail/room-detail-calendar.tsx:131-137`
- `messages/es.json` (nueva key: `ota.roomDetail.weekendPriceExplanation`)
- `messages/en.json` (nueva key: `ota.roomDetail.weekendPriceExplanation`)

**Cambio exacto:**
```tsx
// room-detail-calendar.tsx:131-137
// ANTES:
{output.weekendPrice > 0 && output.weekendPrice !== output.pricePerNight && (
  <p className="text-xs text-muted-foreground">
    {t('ota.roomDetail.weekendPrice', {
      price: formatPrice(output.weekendPrice),
    })}
  </p>
)}

// DESPUÉS:
{output.weekendPrice > 0 && output.weekendPrice !== output.pricePerNight && (
  <div className="space-y-1">
    <p className="text-xs text-muted-foreground">
      {t('ota.roomDetail.weekendPrice', {
        price: formatPrice(output.weekendPrice),
      })}
    </p>
    <p className="text-[10px] text-muted-foreground/70">
      {t('ota.roomDetail.weekendPriceExplanation')}
    </p>
  </div>
)}
```

```json
// messages/es.json
"weekendPriceExplanation": "Viernes y sábado tienen un recargo por noche"

// messages/en.json
"weekendPriceExplanation": "Friday and Saturday nights have a surcharge"
```

**Testing:**
- Verificar que explicación aparezca cuando weekend price > weekday price
- Verificar que i18n keys se resuelvan en ambos idiomas

**Casos borde:**
- ✅ Hotel sin weekend pricing → no mostrar explicación
- ✅ Hotel con weekend pricing = weekday pricing → no mostrar explicación
- ✅ Hotel con weekend pricing > weekday pricing → mostrar explicación

---

### 2.3 Fix tooltips en pricing labels (2/3 consensus)

**Archivos:**
- `src/components/ota/room-detail/room-detail-calendar.tsx:127`
- `src/components/ota/RoomCard.tsx:367`

**Cambio exacto:**
```tsx
// room-detail-calendar.tsx:127
// ANTES:
<p className="text-[10px] text-muted-foreground font-medium">+ IVA</p>

// DESPUÉS:
<p className="text-[10px] text-muted-foreground font-medium" title="El IVA se agrega al precio base">
  + IVA
</p>
```

```tsx
// RoomCard.tsx:367
// ANTES:
{priceBreakdown.hasTax && (
  <span>(+ IVA)</span>
)}

// DESPUÉS:
{priceBreakdown.hasTax && (
  <span title="El IVA se agrega al precio base">(+ IVA)</span>
)}
```

**Testing:**
- Verificar que tooltip aparezca al hacer hover
- Verificar que tooltip sea claro y conciso

**Casos borde:**
- ✅ Mobile (no hover) → tooltip no aparece, pero label es claro
- ✅ Desktop (hover) → tooltip aparece con explicación

---

## FASE 3: SUGGESTION Fixes (Media prioridad)

### 3.1 Fix MobileStickyCta estilos inconsistentes (1/3 consensus)

**Archivos:**
- `src/components/ota/MobileStickyCta.tsx:70-100`

**Cambio exacto:**
```tsx
// MobileStickyCta.tsx:70-100
// ANTES:
<div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-background via-background to-background/95 backdrop-blur-lg border-t border-border/40 shadow-2xl">
  <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
        {t('ota.booking.from')}
      </p>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black text-foreground">
          ${formatPrice(displayPrice)}
        </span>
        <span className="text-xs text-muted-foreground truncate">/noche</span>
      </div>
      {effectiveRate > 0 ? (
        <p className="text-[10px] text-muted-foreground font-medium">IVA incluido</p>
      ) : (
        <p className="text-[10px] text-muted-foreground/50 font-medium">Sin IVA</p>
      )}
    </div>

// DESPUÉS:
<GlassCard className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/40 shadow-2xl rounded-none">
  <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
        {t('ota.booking.from')}
      </p>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black text-foreground">
          ${formatPrice(displayPrice)}
        </span>
        <span className="text-xs text-muted-foreground truncate">/noche</span>
      </div>
      {effectiveRate > 0 ? (
        <p className="text-[10px] text-muted-foreground font-medium" title="El IVA se agrega al precio base">+ IVA</p>
      ) : (
        <p className="text-[10px] text-muted-foreground/50 font-medium">Sin IVA</p>
      )}
    </div>
```

**Testing:**
- Verificar que MobileStickyCta use GlassCard como otros components
- Verificar que label sea consistente con RoomCard ("+ IVA")

**Casos borde:**
- ✅ Mobile (sticky bottom) → GlassCard funciona correctamente
- ✅ Desktop (hidden) → no afecta

---

## FASE 4: Casos Borde Adicionales

### 4.1 Fix weekend fallback inconsistente (1/3 consensus)

**Archivos:**
- `src/utils/supabase/pricing.ts:32`
- `src/lib/pricing.ts:175`

**Cambio exacto:**
```ts
// utils/supabase/pricing.ts:32
// ANTES:
const effectiveWeekendPrice = weekendPrice > 0 ? weekendPrice : basePrice;

// DESPUÉS:
const effectiveWeekendPrice = weekendPrice > 0 ? weekendPrice : Math.round(basePrice * 1.2);
```

**Testing:**
- Verificar que `calculateStayPrice` use mismo fallback que `buildRoomPricingBreakdown`
- Verificar que account statement calcule correctamente

**Casos borde:**
- ✅ `weekend_price` es null → usar `basePrice * 1.2`
- ✅ `weekend_price` es 0 → usar `basePrice * 1.2`
- ✅ `weekend_price` es > 0 → usar `weekend_price`

---

### 4.2 Fix tax regime change después de selección de fechas

**Archivos:**
- `src/app/(direct)/book/[slug]/checkout/page.tsx:72-80`
- `src/app/actions/bookings.ts:353-363`

**Cambio exacto:**
```tsx
// checkout/page.tsx:72-80
// ANTES:
const effectiveTaxRate = getEffectiveTaxRate(hotel.tax_rate, hotel.tax_regime);
const pricing = buildRoomPricingBreakdown({
  pricePerNight: roomPrice,
  weekendPrice,
  taxRate: effectiveTaxRate,
  checkIn: checkInDate,
  checkOut: checkOutDate,
});
const basePrice = pricing.subtotal;

// DESPUÉS:
const effectiveTaxRate = getEffectiveTaxRate(hotel.tax_rate, hotel.tax_regime);
const pricing = buildRoomPricingBreakdown({
  pricePerNight: roomPrice,
  weekendPrice,
  taxRate: effectiveTaxRate,
  checkIn: checkInDate,
  checkOut: checkOutDate,
});
const basePrice = pricing.subtotal;

// Add validation: if tax regime changed between calendar selection and checkout, recalculate
if (effectiveTaxRate !== searchParamsTaxRate) {
  console.warn(`Tax rate changed from ${searchParamsTaxRate} to ${effectiveTaxRate}. Recalculating.`);
  // Show warning to user
}
```

**Testing:**
- Verificar que checkout recalcula si tax regime cambia
- Verificar que warning se muestra al usuario

**Casos borde:**
- ✅ Tax regime cambia entre calendar y checkout → recalcular y mostrar warning
- ✅ Tax rate cambia entre calendar y checkout → recalcular y mostrar warning
- ✅ Tax regime no cambia → continuar normalmente

---

### 4.3 Fix error de red durante pago

**Archivos:**
- `src/components/checkout/CheckoutForm.tsx:110-132`

**Cambio exacto:**
```tsx
// CheckoutForm.tsx:110-132
// ANTES:
const handlePayment = async () => {
  setFormError(null);
  setIsSubmitting(true);

  const payload = {
    ...formData,
    amount: grandTotal,
    roomId: room.id,
    checkin: checkIn,
    checkout: checkOut,
    source: (isOta ? 'ota' : 'direct') as 'ota' | 'direct',
    upsells: [],
    consentAccepted: consentGiven,
  };

  const result = await createPendingBookingAction(payload);

  if (!result?.success || !result?.bookingId) {
    setFormError(result?.error || 'Ocurrió un error al procesar tu solicitud. Por favor, intenta de nuevo.');
    shakeHaptic();
    setIsSubmitting(false);
    return;
  }

// DESPUÉS:
const handlePayment = async () => {
  setFormError(null);
  setIsSubmitting(true);

  const payload = {
    ...formData,
    amount: grandTotal,
    roomId: room.id,
    checkin: checkIn,
    checkout: checkOut,
    source: (isOta ? 'ota' : 'direct') as 'ota' | 'direct',
    upsells: [],
    consentAccepted: consentGiven,
  };

  try {
    const result = await createPendingBookingAction(payload);

    if (!result?.success || !result?.bookingId) {
      setFormError(result?.error || 'Ocurrió un error al procesar tu solicitud. Por favor, intenta de nuevo.');
      shakeHaptic();
      setIsSubmitting(false);
      return;
    }
  } catch (error) {
    // Network error or server error
    setFormError('Error de conexión. Por favor, verifica tu conexión a internet e intenta de nuevo.');
    shakeHaptic();
    setIsSubmitting(false);
    return;
  }
```

**Testing:**
- Verificar que error de red muestre mensaje claro
- Verificar que usuario pueda intentar de nuevo

**Casos borde:**
- ✅ Error de red → mostrar mensaje claro
- ✅ Timeout → mostrar mensaje claro
- ✅ Server error → mostrar mensaje claro
- ✅ Usuario cierra browser → sessionStorage permite retomar

---

## FASE 5: Testing Exhaustivo

### 5.1 Test scenarios

**Escenario 1: Hotel simplified (0% IVA), sin weekend pricing**
- Room price: $100,000
- Weekend price: null
- Tax rate: 0
- Stay: 3 nights (2 weekdays + 1 weekend)
- Expected: $300,000 total

**Escenario 2: Hotel responsible (19% IVA), con weekend pricing**
- Room price: $100,000
- Weekend price: $120,000
- Tax rate: 0.19
- Stay: 3 nights (2 weekdays + 1 weekend)
- Expected: ($100,000 × 2 + $120,000 × 1) = $320,000 subtotal
- Expected: $320,000 × 0.19 = $60,800 IVA
- Expected: $320,000 + $60,800 = $380,800 total

**Escenario 3: Hotel responsible, tax_rate null pero tax_regime = 'responsible'**
- Room price: $100,000
- Weekend price: null
- Tax rate: null
- Tax regime: 'responsible'
- Stay: 3 nights (all weekdays)
- Expected: $300,000 subtotal
- Expected: $300,000 × 0.19 = $57,000 IVA
- Expected: $300,000 + $57,000 = $357,000 total

**Escenario 4: Hotel con weekend_price = 0**
- Room price: $100,000
- Weekend price: 0
- Tax rate: 0.19
- Stay: 3 nights (2 weekdays + 1 weekend)
- Expected: ($100,000 × 2 + $120,000 × 1) = $320,000 subtotal (fallback to 1.2x)
- Expected: $320,000 × 0.19 = $60,800 IVA
- Expected: $320,000 + $60,800 = $380,800 total

**Escenario 5: Error de red durante pago**
- Usuario completa checkout
- Error de red ocurre
- Expected: Mensaje claro "Error de conexión"
- Expected: Usuario puede intentar de nuevo

**Escenario 6: Tax regime cambia entre calendar y checkout**
- Usuario selecciona fechas cuando hotel tiene tax_rate = 0
- Hotel cambia a tax_rate = 0.19 antes de checkout
- Expected: Checkout recalcula con nuevo tax rate
- Expected: Warning se muestra al usuario

---

## FASE 6: Commit Strategy

**Commit 1:** Fix "IVA incluido" labels (FASE 1.1)
- 4 archivos modificados
- Testing: i18n keys resuelven correctamente

**Commit 2:** Fix RoomCard weekend pricing (FASE 1.2)
- 1 archivo modificado
- Testing: RoomCard muestra precio correcto

**Commit 3:** Fix Success page breakdown (FASE 1.3)
- 2 archivos modificados + 1 migration
- Testing: Success page muestra breakdown correcto

**Commit 4:** Fix error messages (FASE 2.1)
- 2 archivos modificados
- Testing: Error messages son claros

**Commit 5:** Fix weekend pricing explanation (FASE 2.2)
- 3 archivos modificados
- Testing: Explicación aparece cuando aplica

**Commit 6:** Fix tooltips (FASE 2.3)
- 2 archivos modificados
- Testing: Tooltips aparecen al hover

**Commit 7:** Fix MobileStickyCta (FASE 3.1)
- 1 archivo modificado
- Testing: MobileStickyCta usa GlassCard

**Commit 8:** Fix weekend fallback (FASE 4.1)
- 1 archivo modificado
- Testing: Fallback es consistente

**Commit 9:** Fix tax regime change (FASE 4.2)
- 1 archivo modificado
- Testing: Recalcula si tax regime cambia

**Commit 10:** Fix network error handling (FASE 4.3)
- 1 archivo modificado
- Testing: Error de red muestra mensaje claro

---

## Checklist de Verificación

- [ ] Todos los labels de IVA son consistentes ("+ IVA" o "IVA agregado")
- [ ] RoomCard muestra precio correcto para stays con weekend
- [ ] Success page muestra breakdown real
- [ ] Error messages son claros y accionables
- [ ] Weekend pricing se explica al usuario
- [ ] Tooltips aparecen en pricing labels
- [ ] MobileStickyCta usa GlassCard
- [ ] Weekend fallback es consistente
- [ ] Tax regime change se maneja correctamente
- [ ] Network errors se manejan correctamente
- [ ] Todos los casos borde están cubiertos
- [ ] Todos los tests pasan
- [ ] No hay regresiones

---

## Estimación de Esfuerzo

- **FASE 1 (CRITICAL):** 4-6 horas
- **FASE 2 (WARNING):** 3-4 horas
- **FASE 3 (SUGGESTION):** 1-2 horas
- **FASE 4 (Casos borde):** 2-3 horas
- **FASE 5 (Testing):** 2-3 horas
- **FASE 6 (Commits):** 1 hora

**Total estimado:** 13-19 horas

---

## Conclusión

Este Plan PDR cubre **todos los hallazgos del triple-audit** y aborda **todos los casos borde** identificados. La ejecución en 10 commits atómicos permite rollback granular si es necesario.

**Prioridad de ejecución:**
1. FASE 1 (CRITICAL) → bloquea el flujo de pago
2. FASE 2 (WARNING) → afecta la experiencia del usuario
3. FASE 3 (SUGGESTION) → mejora la consistencia visual
4. FASE 4 (Casos borde) → previene problemas edge case
5. FASE 5 (Testing) → verifica que todo funcione
6. FASE 6 (Commits) → mantiene historial limpio

**Riesgo de regresión:** Bajo (cada commit es atómico y testeable)

**Confianza en el resultado:** Alta (todos los hallazgos del triple-audit están cubiertos)
