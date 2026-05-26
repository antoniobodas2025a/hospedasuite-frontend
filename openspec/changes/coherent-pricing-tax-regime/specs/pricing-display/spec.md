# Pricing Display Specification

## Purpose

Defines how all OTA-facing components display prices using the hotel's `tax_rate`, ensuring a single coherent price (final price the customer pays) with no dual price display.

## Requirements

### Requirement: RoomCard Price Display

The RoomCard component MUST use the hotel's `tax_rate` to calculate the displayed price. It SHALL show ONE final price (base + tax), not separate base and tax amounts.

#### Scenario: RoomCard displays price with tax (ordinary regime)

- GIVEN a hotel with `tax_rate = 0.19`
- AND a room with `price = 100000`
- WHEN the RoomCard renders
- THEN it displays `$119000` as the final price
- AND no separate tax line is shown in the card

#### Scenario: RoomCard displays price without tax (simplified regime)

- GIVEN a hotel with `tax_rate = 0`
- AND a room with `price = 100000`
- WHEN the RoomCard renders
- THEN it displays `$100000` as the final price

#### Scenario: RoomCard uses default when tax_rate is undefined

- GIVEN the hotel prop does not include `tax_rate`
- WHEN the RoomCard renders
- THEN it defaults to `0.19` for backward compatibility

### Requirement: MobileStickyCta Price Display

The MobileStickyCta component MUST use `tax_rate` to calculate the sticky bar price. The displayed price SHALL match the RoomCard price for the same room.

#### Scenario: MobileStickyCta shows tax-inclusive minimum price

- GIVEN a hotel with `tax_rate = 0.19`
- AND the cheapest available room has `price = 80000`
- WHEN the MobileStickyCta renders
- THEN it displays `$95200` as the minimum price

### Requirement: BookingWidget Price Display

The BookingWidget component MUST use `tax_rate` to calculate room prices in the sidebar. Price labels SHALL adapt based on whether tax is present.

#### Scenario: BookingWidget labels adapt to tax presence

- GIVEN a hotel with `tax_rate = 0.19`
- WHEN the BookingWidget renders a room price breakdown
- THEN the label reads "Precio final (IVA incluido)"

#### Scenario: BookingWidget labels for simplified regime

- GIVEN a hotel with `tax_rate = 0`
- WHEN the BookingWidget renders a room price breakdown
- THEN the label reads "Precio final" (no IVA mention)

### Requirement: RoomShowcaseModal Price Display

The RoomShowcaseModal MUST use the hotel's `tax_rate` when displaying room prices in the modal view.

#### Scenario: RoomShowcaseModal shows consistent prices

- GIVEN a hotel with `tax_rate = 0.19`
- AND a room with `price = 150000`
- WHEN the RoomShowcaseModal opens for that room
- THEN the displayed price matches what RoomCard shows for the same room

#### Scenario: RoomShowcaseModal closed state does not require tax_rate

- GIVEN the RoomShowcaseModal is closed (receives minimal hotel: `{ slug, rooms: [] }`)
- WHEN the modal is not visible
- THEN no price calculation occurs and missing `tax_rate` does not cause errors

### Requirement: Pricing Calculation Single Source of Truth

All tax calculations SHALL use `src/lib/pricing.ts` functions. Direct `0.19` or `1.19` literals MUST NOT appear in component code.

#### Scenario: Pricing library calculates tax amount

- GIVEN `calculateTaxAmount(100000, 0.19)` is called
- THEN it returns `19000`

#### Scenario: Pricing library calculates total with tax

- GIVEN `calculateTotalWithTax(100000, 0.19)` is called
- THEN it returns `119000`

#### Scenario: Pricing library defaults to 0.19 when rate omitted

- GIVEN `calculateTaxAmount(100000)` is called (no taxRate argument)
- THEN it returns `19000` using `DEFAULT_TAX_RATE`
