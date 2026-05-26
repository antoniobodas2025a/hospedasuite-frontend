# Checkout Pricing Specification

## Purpose

Defines how the checkout flow calculates and displays prices using the hotel's `tax_rate`, with conditional IVA breakdown.

## Requirements

### Requirement: CheckoutForm Price Calculation

The CheckoutForm MUST use the hotel's `tax_rate` to calculate the booking total. An IVA breakdown line SHALL only appear when `tax_rate > 0`.

#### Scenario: CheckoutForm shows IVA breakdown for ordinary regime

- GIVEN a hotel with `tax_rate = 0.19`
- AND a booking subtotal of `$100000`
- WHEN the CheckoutForm renders the price summary
- THEN it shows:
  - Subtotal: `$100000`
  - IVA (19%): `$19000`
  - Total: `$119000`

#### Scenario: CheckoutForm omits IVA breakdown for simplified regime

- GIVEN a hotel with `tax_rate = 0`
- AND a booking subtotal of `$100000`
- WHEN the CheckoutForm renders the price summary
- THEN it shows:
  - Total: `$100000`
- AND no IVA line is displayed

### Requirement: Checkout Page Provides tax_rate

The checkout page MUST fetch `tax_rate` from the hotel record and pass it to CheckoutForm.

#### Scenario: Checkout page selects tax_rate from database

- GIVEN a user navigates to the checkout page for a hotel
- WHEN the page loads hotel data
- THEN the SELECT query includes `tax_rate` alongside existing fields
- AND `tax_rate` is passed to CheckoutForm

#### Scenario: Checkout handles NULL tax_rate

- GIVEN the hotel's `tax_rate` is `NULL` in the database
- WHEN the checkout page loads
- THEN `tax_rate` defaults to `0.19`
- AND the IVA breakdown is shown
