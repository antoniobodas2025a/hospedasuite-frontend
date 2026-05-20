# Exploration: Hotel Readiness System

## Current State

### 1. Onboarding Flow (`src/app/software/onboarding/`)
- **6-step wizard** exists: Identity → Gallery → Property Type → Room Templates → Settings → Payment/Activate
- Uses `zustand` store (`useOnboardingStore`) with client-side state
- Steps are: `HotelIdentityStep`, `PropertyGalleryStep`, `PropertyTypeStep`, `RoomTemplatesStep`, `SettingsStep`, `PaymentStep`, `ProvisioningStep`
- On completion (`ProvisioningStep`), calls `executeOnboardingProvisioning` server action
- Sets `hotels.status = 'active'` and `hotels.is_onboarding_complete = true`
- **No readiness validation** — completion is purely based on finishing the wizard + payment

### 2. Hotel Data Model
**Hotels table fields (from migrations + actions):**
- `id, name, slug, city, location, address, phone, email, description, category, type`
- `gallery_urls[], amenities[], status, owner_id, created_at`
- `check_in_time, check_out_time, cancellation_policy, whatsapp_number, google_maps_url`
- `subscription_plan, subscription_status, trial_ends_at, is_onboarding_complete, onboarding_step`
- `main_image_url, logo_url, cover_photo_url`

**Rooms table fields:**
- `id, hotel_id, name, type, price, description, amenities[], capacity, beds, gallery[], status`
- `ical_import_url, ical_export_token, last_ical_sync, ical_sync_status`
- `availability_range`

**Missing readiness-specific fields:**
- No `readiness_score`, `go_live_status`, `readiness_checklist` fields
- No tracking of which required steps are truly complete vs just "filled in"

### 3. Dashboard Structure
- Entry point: `getCurrentHotel()` in `src/lib/hotel-context.ts`
  - If no hotel → redirects to `/software/onboarding`
  - If no staff cookie → redirects to `/login`
- Dashboard page shows: occupied rooms, dirty rooms, POS revenue, walk-in revenue, OTA sync widget
- Navigation pages: calendar, inventory, housekeeping, guests, billing, pos, carta-digital, reports, reviews, marketing, settings, checkout, forensic-book

### 4. Plan Gating (`src/config/saas-plans.ts`, `src/data/plan-guard.ts`)
**Plans:** Starter ($49k COP), Pro ($99k COP), Enterprise ($199k COP)

**Limits:**
| Plan | Max Units | Max OTAs | Max Staff | Storage |
|------|-----------|----------|-----------|---------|
| Starter | 4 | 0 | 2 | 500MB |
| Pro | 14 | 3 | 5 | 5GB |
| Enterprise | 30 | 6 | 15 | 20GB |

**Feature gating:**
- `channel_manager` → Pro+ (maxOTAs > 0)
- `carta_digital` → Pro+
- `forensic_book` → Pro+
- `pos` → Pro+
- `reports_advanced` → Enterprise
- `priority_support` → Enterprise

**Enforcement:** `PlanGuard.tsx` UI component + `plan-guard.ts` server-side DAL

### 5. Booking Flow (`src/app/actions/bookings.ts`)
- `createBookingAction` — admin-created bookings with guest lookup/creation
- `createPendingBookingAction` — OTA/direct bookings with payment link generation
- `processCheckInAction` — atomic RPC check-in
- `updateBookingDetailsAction`, `cancelBookingAction`, `duplicateBookingAction`
- Validates temporal collisions via `isTemporalCollision()` helper
- Emits events via `emitEvent()` for `booking.created`, `booking.cancelled`

### 6. Communication Channels
- **Email:** Resend configured (`RESEND_API_KEY` in `.env.local`)
  - `sendBookingConfirmationEmail()` uses `BookingVoucher` React Email template
  - Cron jobs send trial reminders and renewal emails
  - `email.send` event handler exists but is stubbed (logs only)
- **WhatsApp:** `FloatingWhatsApp` widget for OTA site. WhatsApp number collected in onboarding/settings.
- **SMS:** No SMS provider integration found.
- **Notifications:** Event-driven via QStash. No push notification or in-app notification system.

### 7. OTA Connections
- **iCal sync exists:** `013_ical_improved.sql` added `ota_sync_log` table, `rooms.ical_import_url`, `last_ical_sync`, `ical_sync_status`
- `ota-sync.ts` actions: `getOtaSyncStatusAction()`, `triggerManualSyncAction()` (requires Pro+)
- **No direct API integrations** (Booking.com, Airbnb API) — only iCal import/export
- Public OTA listing: `ota.ts` fetches active hotels with room prices
- Availability engine: `get_available_rooms` PostgreSQL RPC

### 8. Testing Infrastructure
- **Vitest** configured (`vitest.config.ts`)
  - Environment: `node`
  - Timeout: 15s
  - Includes: `src/__tests__/**/*.test.ts`, `src/lib/__tests__/**/*.test.ts`
- **16 existing tests:**
  - Unit: event handlers, event types, OTA design contrast, slugs, social link tracker, wompi crypto, room types, hardcoded colors, booking helpers, iCal sync diff, design system tokens, iCal UI logic, iCal token, pricing, admin layout structure
  - Integration: tenant isolation, iCal token action, account statement, atomic RPC
- **No Playwright/E2E** found.
- Domain for E2E: `NEXT_PUBLIC_APP_URL=https://www.hospedasuite.com`

### 9. Carta Digital (`src/data/carta-digital.ts`, `src/app/(admin)/dashboard/carta-digital/page.tsx`)
- Full CRUD: categories, menu items, QR codes, analytics
- Tables: `menu_categories`, `menu_items`, `qr_codes`, `menu_views`
- Supports bilingual (ES/EN), tags, allergens, prep time, calories, featured items
- QR generation per table/room with scan tracking
- Plan-gated to Pro+

### 10. POS System (`src/hooks/usePOS.ts`, `src/app/(admin)/dashboard/pos/page.tsx`)
- `usePOS` hook: cart management, room selection, walk-in vs room charge
- `POSPanel` component (imported but not read — presumed functional)
- Unified with Carta Digital via `category_legacy` and `image_emoji` compatibility columns
- Plan-gated to Pro+. Shows empty state if no rooms exist.

---

## Gaps Analysis

### What Already Exists (and Works)
1. 6-step onboarding wizard with Zustand state management
2. Hotel/Rooms database schema with basic fields
3. Plan gating system (both UI and server-side)
4. Booking creation + check-in flow
5. iCal OTA sync infrastructure (logs, sync status, manual trigger)
6. Email confirmations via Resend
7. Carta Digital full feature (Pro+)
8. POS system with cart + room charging (Pro+)
9. Event-driven architecture with QStash
10. Vitest testing framework with 16+ tests

### What Exists But Is Incomplete
1. **Onboarding validation** — steps can be skipped or filled with invalid data (e.g., room price = 0)
2. **Readiness concept** — `is_onboarding_complete` is binary; no granular readiness tracking
3. **Email system** — `email.send` event handler is stubbed; only booking confirmations are truly sent
4. **OTA sync** — only iCal, no native Booking.com/Airbnb APIs
5. **POS** — unified with Carta Digital but may have edge cases in the bridge

### What Doesn't Exist At All
1. **Readiness checklist / score** — no concept of "what's needed to go live"
2. **Pre-go-live validation** — system doesn't verify rooms have prices, images, policies before allowing bookings
3. **Progressive readiness dashboard** — no UI showing "Complete X to start selling"
4. **Plan-specific readiness requirements** — all plans treated the same for "ready" status
5. **Communication channel readiness** — no validation that WhatsApp/email are actually working
6. **Payment method setup verification** — Wompi keys exist but aren't validated as "configured"
7. **Staff invitation readiness** — no check that hotel has invited necessary staff
8. **E2E testing** — no Playwright or similar E2E framework
9. **Readiness API endpoint** — no server-side way to query readiness status

### Current Gap: "Hotel Registered" → "Ready to Sell"
Today, the gap is bridged by a single boolean: `is_onboarding_complete`. Once the wizard finishes and payment is processed, the hotel is considered active. There is NO verification that:
- Rooms have valid prices (> 0)
- At least one room exists
- Hotel has a name, city, location
- Check-in/check-out times are set
- WhatsApp or email is configured (for guest communication)
- iCal URLs are working (for Pro+ with OTAs)
- Payment gateway is actually processing (Wompi test vs live)
- Staff members have been invited (if multi-user needed)

---

## Plan-Specific Readiness Differences

| Requirement | Starter | Pro | Enterprise |
|-------------|---------|-----|------------|
| Hotel identity (name, city, location) | Required | Required | Required |
| At least 1 room with price > 0 | Required | Required | Required |
| Check-in/out times set | Required | Required | Required |
| WhatsApp or email configured | Required | Required | Required |
| Rooms within plan limit (4/14/30) | Required | Required | Required |
| iCal/OTA configured | N/A | Optional | Optional |
| Carta Digital items | N/A | Optional | Optional |
| POS products configured | N/A | Optional | Optional |
| Staff invited (within limit) | Optional | Optional | Optional |
| Advanced reports configured | N/A | N/A | Optional |

**Key insight:** Starter hotels have FEWER optional steps, making them actually *easier* to go live. Pro/Enterprise have additional optional features that should be tracked but not block go-live.

---

## Existing Checklist/Readiness Patterns
- **None found.** No `readiness`, `checklist`, `go_live`, or `setup_complete` patterns exist in the codebase.
- The closest thing is `is_onboarding_complete` (boolean) and `onboarding_step` (integer 1-6).

---

## Approaches

### Approach A: Extend Onboarding with Readiness Gate
- Add a 7th "Review & Go Live" step to the onboarding wizard
- Validate all required fields before allowing activation
- Store readiness score in `hotels` table
- **Pros:** Minimal new UI, leverages existing wizard
- **Cons:** Doesn't help hotels that already completed onboarding; not a persistent dashboard
- **Effort:** Low

### Approach B: Persistent Readiness Dashboard (Recommended)
- Create a new `/dashboard/readiness` page with a checklist UI
- Add `hotel_readiness` table or JSONB column tracking completion per category
- Server-side `getReadinessStatus()` function that validates all requirements
- Show readiness widget on dashboard home
- Gate "Create Booking" / "Calendar" if not ready
- **Pros:** Persistent, works for existing hotels, plan-aware, can guide users over time
- **Cons:** More UI work, needs new API
- **Effort:** Medium

### Approach C: Hybrid — Onboarding Gate + Dashboard Tracker
- Add readiness validation to onboarding completion (Approach A)
- Add persistent readiness dashboard for post-onboarding (Approach B)
- **Pros:** Best of both worlds
- **Cons:** More work
- **Effort:** Medium-High

---

## Recommendation
**Approach B** (Persistent Readiness Dashboard) is the best fit because:
1. Many hotels may have already completed onboarding and need guidance
2. Readiness is a continuous state, not a one-time gate
3. Plan-specific requirements need dynamic evaluation
4. Can be built as an additive feature without breaking existing flows

---

## Risks
1. **Breaking existing onboarding** — any change to `executeOnboardingProvisioning` must be backward compatible
2. **Plan guard complexity** — readiness rules must stay in sync with `plan-guard.ts`
3. **False negatives** — over-strict readiness could block legitimate hotels from operating
4. **No E2E tests** — Playwright absence means manual QA or unit-test-only coverage

---

## Ready for Proposal
**Yes.** The codebase is well-understood. The next phase should be `sdd-propose` to define the scope of the readiness system (which approach, which requirements per plan, whether to add E2E tests).
