# Booking Verification Specification

## Purpose

Defines how server-side booking verification uses the hotel's `tax_rate` to validate client-submitted amounts, preventing mismatches between client and server calculations.

## Requirements

### Requirement: createPendingBookingAction Tax-Aware Verification

The `createPendingBookingAction` MUST use the hotel's `tax_rate` when calculating the maximum expected booking amount. The verification buffer SHALL adjust based on whether tax applies.

#### Scenario: Verification with ordinary regime (tax applies)

- GIVEN a hotel with `tax_rate = 0.19`
- AND a room base rate of `$100000`
- WHEN `createPendingBookingAction` verifies the client-submitted amount
- THEN `maxExpected = round(baseRate * (1 + tax_rate) * 1.05)` = `$124950`
- AND amounts within this range are accepted

#### Scenario: Verification with simplified regime (no tax)

- GIVEN a hotel with `tax_rate = 0`
- AND a room base rate of `$100000`
- WHEN `createPendingBookingAction` verifies the client-submitted amount
- THEN `maxExpected = round(baseRate * 1.05)` = `$105000`
- AND amounts within this range are accepted

#### Scenario: Verification rejects tampered amount

- GIVEN a hotel with `tax_rate = 0.19`
- AND a room base rate of `$100000`
- WHEN the client submits an amount of `$200000`
- THEN the action rejects the booking with a price mismatch error

#### Scenario: Verification fetches hotel tax_rate

- GIVEN a booking request for a specific room
- WHEN `createPendingBookingAction` executes
- THEN it fetches the room's hotel `tax_rate` from the database
- AND uses it for the verification calculation

#### Scenario: Verification handles NULL tax_rate

- GIVEN the hotel's `tax_rate` is `NULL`
- WHEN `createPendingBookingAction` verifies the amount
- THEN it defaults to `0.19` for backward compatibility
