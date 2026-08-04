# PRD-020: Security Hardening Roadmap

## Context

Judgment Day audit found **4 BLOCKER + 7 CRITICAL** security issues across HospedaSuite.
All findings are confirmed by 2 blind judges. This PRD defines the fix roadmap.

## Audit Summary

| Severity | Count | Fix Order |
|----------|-------|-----------|
| BLOCKER | 4 | Phase 1-2 |
| CRITICAL | 7 | Phase 3-5 |
| WARNING | 5 | Phase 6 |
| SUGGESTION | 2 | Phase 6 |

## Architecture Principle

**Uncle Bob's Clean Architecture**: Fix from inside out.

```
Core (Auth/Domain) → Infrastructure (API/Routes) → Presentation (UI/UX)
```

## Phase Dependency Graph

```
Phase 1: Core Auth
    ↓
Phase 2: API Authentication
    ↓
Phase 3: Data Validation
    ↓
Phase 4: Tenant Isolation
    ↓
Phase 5: Infrastructure Hardening
    ↓
Phase 6: Polish & Warnings
```

---

## Phase 1: Core Auth (BLOCKER)

**PR #1: Fix staff session cookie signing**

| Item | Detail |
|------|--------|
| Severity | BLOCKER |
| Files | `src/app/actions/auth.ts`, `src/lib/session-utils.ts` (new) |
| Issue | Staff session cookie is unsigned JSON — trivially forgeable |
| Fix | Implement HMAC-signed cookies with `crypto.timingSafeEqual` |
| Tests | Unit tests for sign/verify, forgery rejection |
| Depends on | Nothing (first PR) |

**Changes:**
1. Create `src/lib/session-utils.ts` with `signSession()`, `verifySession()`, `forgeSession()`
2. Use `process.env.SESSION_SECRET` (32+ bytes)
3. Update `auth.ts` to use signed cookies
4. Add tests: valid session, tampered session, expired session

**Acceptance Criteria:**
- [ ] Cookie contains `{payload}.{signature}`
- [ ] Tampered signature returns null
- [ ] Timing-safe comparison
- [ ] Tests pass: 5/5

---

## Phase 2: API Authentication (BLOCKER)

**PR #2: Add auth middleware to unprotected routes**

| Item | Detail |
|------|--------|
| Severity | BLOCKER |
| Files | `src/middleware.ts`, 6 API routes |
| Issue | 6 endpoints have ZERO authentication |
| Fix | Create `withAuth()` HOC, apply to all unprotected routes |
| Tests | Integration tests for each endpoint |
| Depends on | PR #1 (session signing) |

**Routes to protect:**

| Route | Method | Auth Required |
|-------|--------|---------------|
| `/api/r2-diagnostic` | GET | Super Admin |
| `/api/ota/connections` | POST/GET/DELETE | Hotel Owner |
| `/api/onboarding` | POST | Public (rate limited) |
| `/api/qr/generate` | GET | Authenticated |
| `/api/geocode` | POST | Authenticated |
| `/api/trend-webhook` | POST | QStash signature |

**Changes:**
1. Create `src/lib/api-guards.ts`:
   - `withAuth(handler, { role?: 'super_admin' | 'hotel_owner' })`
   - `withRateLimit(handler, { limit, window })`
   - `withQStashSignature(handler)`
2. Wrap each route handler
3. Add tests: valid auth, missing auth, wrong role, rate limited

**Acceptance Criteria:**
- [ ] All 6 routes protected
- [ ] Missing auth returns 401
- [ ] Wrong role returns 403
- [ ] Rate limiting works
- [ ] Tests pass: 18/18 (3 per route)

---

## Phase 3: Data Validation (CRITICAL)

**PR #3: Fix PIN hashing and signature verification**

| Item | Detail |
|------|--------|
| Severity | CRITICAL |
| Files | `src/lib/pin-security.ts`, `src/lib/payment-gateway.ts` |
| Issues | Hardcoded PIN salt fallback, timing-unsafe comparison, fake signature verification |
| Fix | Proper hashing, timing-safe compare, real Wompi signature |
| Tests | Unit tests for each fix |
| Depends on | PR #2 (auth middleware in place) |

**Changes:**
1. `pin-security.ts`:
   - Remove hardcoded salt fallback (throw if `PIN_SALT` missing)
   - Use `crypto.timingSafeEqual()` for comparison
   - Add migration to re-hash legacy plaintext PINs
2. `payment-gateway.ts`:
   - Implement real Wompi HMAC-SHA256 signature verification
   - Add tests with known test vectors
3. `super-admin.ts`:
   - Replace hardcoded `'1020'` with generated PIN
   - Hash before storage

**Acceptance Criteria:**
- [ ] No hardcoded secrets anywhere
- [ ] Timing-safe comparison everywhere
- [ ] Wompi signature verified correctly
- [ ] Legacy PINs migrated to hashed
- [ ] Tests pass: 12/12

---

## Phase 4: Tenant Isolation (CRITICAL)

**PR #4: Enforce hotel_id ownership in all actions**

| Item | Detail |
|------|--------|
| Severity | CRITICAL |
| Files | `src/app/actions/*.ts`, `src/lib/tenant-guard.ts` |
| Issue | 7 actions accept arbitrary hotelId without ownership check |
| Fix | Use `tenantQuery()` guard in all actions |
| Tests | Unit tests for tenant isolation |
| Depends on | PR #1 (signed session) |

**Actions to fix:**

| Action | File | Issue |
|--------|------|-------|
| `verifyBookingAction` | bookings.ts | No auth check |
| `createLeadAction` | marketing.ts | No auth check |
| `updateLeadStatusAction` | marketing.ts | No auth check |
| `calculateMonthlyInvoiceAction` | billing.ts | No ownership check |
| `createManualPayment` | manual-payments.ts | No ownership check |
| `saveRoomAction` | inventory.ts | No ownership check |
| `exportGuestDataForSIRE` | guest-export.ts | No ownership check |

**Changes:**
1. Update `tenantGuard.ts`:
   - Extract `hotel_id` from signed session
   - Throw if `hotel_id` doesn't match query
2. Add `requireHotelAccess(hotelId)` to each action
3. Remove manual `.eq('hotel_id', ...)` — use guard
4. Add tests: access own hotel, access other hotel (denied)

**Acceptance Criteria:**
- [ ] All 7 actions use `requireHotelAccess()`
- [ ] Cross-tenant access returns 403
- [ ] Session hotel_id is trusted source
- [ ] Tests pass: 14/14 (2 per action)

---

## Phase 5: Infrastructure Hardening (CRITICAL)

**PR #5: Fix QStash, rate limiting, and onboarding**

| Item | Detail |
|------|--------|
| Severity | CRITICAL |
| Files | `src/app/api/events/handler/route.ts`, `src/utils/supabase/middleware.ts` |
| Issues | QStash stub, rate limit bypass, onboarding mass creation |
| Fix | Real signature verification, IP validation, rate limiting |
| Tests | Integration tests |
| Depends on | PR #2 (auth middleware) |

**Changes:**
1. `events/handler/route.ts`:
   - Implement real QStash signature verification
   - Use `@upstash/qstash` SDK
2. `middleware.ts`:
   - Use `x-forwarded-for` only behind known proxy
   - Add fallback to direct IP
3. `onboarding/route.ts`:
   - Add CAPTCHA verification (reCAPTCHA)
   - Add rate limiting (1 per IP per hour)

**Acceptance Criteria:**
- [ ] QStash signature verified with real HMAC
- [ ] Rate limiting works with spoofed IP
- [ ] Onboarding requires CAPTCHA
- [ ] Tests pass: 9/9

---

## Phase 6: Polish & Warnings (WARNING/SUGGESTION)

**PR #6: Performance, accessibility, cleanup**

| Item | Detail |
|------|--------|
| Severity | WARNING/SUGGESTION |
| Files | Multiple |
| Issues | Memory leaks, accessibility, dead code |
| Fix | Pagination, a11y, cleanup |
| Tests | Regression tests |
| Depends on | PR #5 |

**Changes:**
1. `ota.ts`: Add pagination to `fetchChannelHotelsAction`
2. `layout.tsx`: Remove `userScalable: false` (WCAG violation)
3. `layout.tsx`: Move hardcoded URLs to env vars
4. Delete `.bak` files
5. Fix `supabase-admin.ts` typing (remove `as any`)

**Acceptance Criteria:**
- [ ] No memory leaks in OTA search
- [ ] Pinch-to-zoom works (a11y)
- [ ] No hardcoded infrastructure URLs
- [ ] No backup files in repo
- [ ] TypeScript strict mode passes

---

## PR Chain Summary

| PR | Phase | Focus | BLOCKER | CRITICAL | Est. Lines |
|----|-------|-------|---------|----------|------------|
| #1 | Core Auth | Session signing | 1 | 0 | ~150 |
| #2 | API Auth | Route protection | 3 | 0 | ~300 |
| #3 | Validation | PINs, signatures | 0 | 3 | ~200 |
| #4 | Tenant Isolation | hotel_id checks | 0 | 4 | ~250 |
| #5 | Infrastructure | QStash, rate limit | 0 | 2 | ~200 |
| #6 | Polish | Warnings, cleanup | 0 | 0 | ~150 |

**Total: 6 PRs, ~1,250 lines changed**

---

## Testing Strategy

| PR | Unit Tests | Integration Tests | E2E |
|----|------------|-------------------|-----|
| #1 | 5 | 0 | 0 |
| #2 | 0 | 18 | 0 |
| #3 | 12 | 0 | 0 |
| #4 | 14 | 0 | 0 |
| #5 | 0 | 9 | 0 |
| #6 | 0 | 4 | 0 |
| **Total** | **31** | **31** | **0** |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking existing auth | Feature flag `NEW_SESSION_ENABLED` |
| Rate limiting false positives | Configurable per-route |
| CAPTCHA UX friction | Optional for first 100 users |
| Migration downtime | Zero-downtime migration strategy |

---

## Success Metrics

| Metric | Before | After |
|--------|--------|-------|
| BLOCKER issues | 4 | 0 |
| CRITICAL issues | 7 | 0 |
| Auth bypass vectors | 6 | 0 |
| Unsigned cookies | 1 | 0 |
| Hardcoded secrets | 3 | 0 |
| Test coverage | ~70% | ~85% |

---

## Rollback Plan

Each PR is independent and can be reverted:
- PR #1: Revert to unsigned cookies (temporary)
- PR #2: Remove `withAuth()` wrappers (temporary)
- PR #3: Restore legacy PIN comparison (temporary)
- PR #4: Remove `requireHotelAccess()` (temporary)
- PR #5: Stub QStash again (temporary)
- PR #6: Restore previous versions (trivial)

---

**Created:** 2026-08-04
**Author:** Gentle AI SDD
**Status:** Ready for implementation
**Next:** Start PR #1 (Core Auth)
