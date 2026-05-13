# Mac 2026 Design System — Implementation Roadmap

> **Project:** HospedaSuite PMS + OTA Booking Interface  
> **Paradigm:** Mac 2026 (Cognitive Reduction · Invisible IA · Aesthetics · Organic Affordance)  
> **Status:** Foundation 40% complete · 14 of 28 workstreams delivered

---

## Executive Summary

The design system has **strong foundations** (squircles, spring physics, semantic colors, glass primitives) but lacks **systematic application** and **behavioral intelligence**. The implementation plan follows a **material-first → feedback-layer → cognitive-simplification → intelligent-ui** progression. Each phase builds on the previous, minimizing rework and maximizing user value per unit of effort.

| Phase | Theme | Items | Est. Duration | Cumulative Impact |
|-------|-------|-------|---------------|-------------------|
| 1 | Material & Typography Foundation | 6 | 1.5–2 weeks | Visual coherence |
| 2 | Feedback & Guidance Layer | 4 | 1–1.5 weeks | Trust & safety |
| 3 | Cognitive Simplification | 2 | 2–3 weeks | Decision clarity |
| 4 | Intelligent UI | 2 | 2–3 weeks | Delight & speed |

---

## Phase 1: Material & Typography Foundation

> **Goal:** Establish the visual substrate so every subsequent change is consistent and does not require rework.  
> **Rationale:** You cannot build cognitive simplification on inconsistent spacing, nor predictive UI on ad-hoc glassmorphism. This phase locks the "physics" of the interface.

---

### 1.1 Geist Font System (`#14`)

| Field | Detail |
|-------|--------|
| **What it is** | Replace Inter + Playfair + Cinzel with Geist as the single type family, using its variable axes for weight/width modulation instead of loading three separate fonts. |
| **Why Phase 1** | Typography is the root of all visual hierarchy. Every tracking, leading, and weight decision in Phase 1 depends on the font metrics. Changing fonts *after* applying tracking/leading tokens would force a full re-audit. Geist is already imported in `layout.tsx` but `body` still renders Inter. |
| **Depends on** | Nothing. |
| **Effort** | Low |
| **Impact** | Medium |

**Implementation notes:**
- Update `tailwind.config.ts` `fontFamily.sans` → `var(--font-sans)` (Geist variable already injected on `<html>`).
- Update `globals.css` `--font-sans`, `--font-heading` to point to Geist.
- Remove Playfair/Cinzel imports from OTA/direct layouts or demote them to display-specific uses.
- Audit `font-serif` and `font-display` usages — likely < 10 instances.

---

### 1.2 Tracking & Leading Dynamic Typography (`#3`)

| Field | Detail |
|-------|--------|
| **What it is** | Apply the already-defined CSS tokens (`--tracking-micro` through `--widest`, `--leading-tight` through `--loose`) as Tailwind utilities and map them to semantic roles: micro labels, body text, display headings. |
| **Why Phase 1** | These tokens exist in `globals.css` but are **never referenced** in any component. Establishing the type scale now ensures that when we redesign forms in Phase 3, the density and readability are already correct. |
| **Depends on** | `#14` (Geist metrics differ from Inter; tracking values must be re-verified). |
| **Effort** | Medium |
| **Impact** | Medium |

**Implementation notes:**
- Extend `@theme inline` in `globals.css` with `--tracking-*` and `--leading-*` utilities.
- Create a `TypeScale` reference doc mapping: `micro` → data labels, `tight` → card titles, `normal` → body, `wide` → section headers.
- Apply systematically to `Sidebar`, `MobileNav`, `DashboardKPIs`, and OTA components.

---

### 1.3 Active Negative Space (`#13`)

| Field | Detail |
|-------|--------|
| **What it is** | Convert the current arbitrary spacing (p-6, p-8, gap-4 mixed ad-hoc) into a semantic spacing scale where whitespace actively guides attention: `tight` for dense data, `spacious` for decisions, `airy` for hero moments. |
| **Why Phase 1** | Negative space is a **visual conductor**. Applying it *before* Hick's Law redesign (Phase 3) means each step of a wizard already has correct breathing room. Retrofitting spacing into a wizard is 3× the effort. |
| **Depends on** | Nothing. |
| **Effort** | Medium |
| **Impact** | Medium |

**Implementation notes:**
- Define `--space-tight`, `--space-normal`, `--space-spacious`, `--space-airy` in `globals.css`.
- Map to Tailwind spacing scale or use `spacing` plugin.
- Refactor high-density components first: `BookingWizardModal`, `CheckoutForm`, `SettingsPanel`.
- Rule of thumb: ≤ 3 density levels per theme (PMS dark = tighter, OTA light = airier).

---

### 1.4 Glassmorphism 2.0 Systematic Application (`#11`)

| Field | Detail |
|-------|--------|
| **What it is** | Replace the 100+ ad-hoc `backdrop-blur-* + bg-zinc-900/40` inline combinations with the three existing material classes: `.glass-card` (light blur, cards), `.glass-panel` (heavy blur, modals), `.glass-pill` (pill blur, nav/floating). |
| **Why Phase 1** | There are **133 raw `backdrop-blur` declarations** scattered across components. This creates visual inconsistency (some cards blur 24px, others 40px, others 12px) and maintenance debt. Systematizing now prevents the debt from growing. |
| **Depends on** | Nothing (CSS classes already exist). |
| **Effort** | Medium |
| **Impact** | Medium |

**Implementation notes:**
- Audit all 133 matches; categorize into `card` | `panel` | `pill` | `special`.
- Migrate `special` cases into the three levels or document why they need custom treatment.
- Ensure OTA theme (`[data-theme="ota"]`) glass tokens render correctly on light backgrounds.

---

### 1.5 Specular Borders Systematic (`#12`)

| Field | Detail |
|-------|--------|
| **What it is** | Ensure `--shadow-inset` (inset 0 1px 0 rgba(255,255,255,0.1)) is applied consistently to all glass surfaces to create the "specular highlight" edge that sells the glass illusion. |
| **Why Phase 1** | The token exists and is referenced in `.glass-card`/`.glass-panel`/`.glass-pill`, but many ad-hoc glass surfaces omit it. This is a **one-line fix per component** once Glassmorphism systematic is underway. |
| **Depends on** | `#11` (must be done together or immediately after). |
| **Effort** | Low |
| **Impact** | Low-Medium |

---

### 1.6 Visual Salience Protocol (`#4`)

| Field | Detail |
|-------|--------|
| **What it is** | Apply `--shadow-cta` systematically to all primary action buttons (booking, payment, confirm) so CTAs have a perceptual "glow" that separates them from secondary actions without relying solely on color. |
| **Why Phase 1** | The token exists but is unused. Visual salience is a **preattentive attribute** — it works before the user reads. Establishing it early means all new buttons built in Phases 2–4 automatically follow the protocol. |
| **Depends on** | Nothing. |
| **Effort** | Low |
| **Impact** | Medium |

**Implementation notes:**
- Map `--shadow-cta` to a Tailwind utility (e.g., `shadow-cta`).
- Apply to: `CheckoutForm` payment button, `BookingWizardModal` confirm button, OTA booking widgets.
- Ensure it adapts to both themes (Océano Profundo navy glow vs. Tierra & Sal terracotta glow).

---

## Phase 2: Feedback & Guidance Layer

> **Goal:** Make the interface communicative, forgiving, and self-documenting.  
> **Rationale:** Before we ask users to navigate redesigned wizards (Phase 3), they need to trust that the system will guide them, protect them from mistakes, and reward precision.

---

### 2.1 `desaturateFeedback` Integration (`#1`)

| Field | Detail |
|-------|--------|
| **What it is** | Wire the already-defined `desaturateFeedback` animation from `spring.ts` into form validation errors, replacing or complementing the current `shakeHaptic` on `CheckoutForm`, `ReviewForm`, and `BookingWizardModal`. |
| **Why Phase 2** | `shakeHaptic` signals "error" but can feel aggressive. `desaturateFeedback` provides an organic "failure without popup" that aligns with Mac 2026's gentle physics. It's a **2-line change per form** and immediately improves perceived quality. |
| **Depends on** | Nothing (already defined, never imported). |
| **Effort** | Low |
| **Impact** | Medium |

**Implementation notes:**
- Import `desaturateFeedback` into `CheckoutForm`, `ReviewForm`, `BookingWizardModal`.
- Use `AnimatePresence` + `motion.div` with `desaturateFeedback` for error states.
- Consider `shakeHaptic` for critical errors, `desaturateFeedback` for soft validations (e.g., incomplete field).

---

### 2.2 Expanded Inline Help Tooltips (`#10`)

| Field | Detail |
|-------|--------|
| **What it is** | Expand `GlassTooltip` usage from 3 instances (all in `SettingsPanel`) to 15–20 high-cognitive-load fields: pricing rules, channel configs, Wompi keys, SEO fields, inventory status toggles. |
| **Why Phase 2** | Tooltips are **progressive disclosure of help**. They reduce the effective decisions on screen (Hick's Law) by offloading explanation to hover/focus. Adding them *before* Phase 3 means the redesigned wizards already have contextual help baked in. |
| **Depends on** | Nothing. |
| **Effort** | Low |
| **Impact** | Medium |

**Implementation notes:**
- Prioritize fields with technical jargon: "Integrity Secret", "OG Image", "Canonical URL", "Weekend Price Modifier".
- Keep tooltip copy under 20 words (Miller's Law).
- Add `delay={300}` to prevent accidental triggers.

---

### 2.3 Keyboard Shortcuts (`#9`)

| Field | Detail |
|-------|--------|
| **What it is** | Implement a global keyboard shortcut layer for power-user workflows: `⌘/Ctrl+K` (command palette), `⌘/Ctrl+N` (new booking), `Esc` (close any modal), `?` (shortcut cheat sheet). |
| **Why Phase 2** | Zero shortcuts exist. In a PMS, receptionists repeat the same actions hundreds of times per shift. Shortcuts are a **multiplier on efficiency**. Implementing them before Phase 3 means the new wizard steps can also have shortcuts (e.g., `1`, `2`, `3` to jump between steps). |
| **Depends on** | Nothing. |
| **Effort** | Low-Medium |
| **Impact** | Medium |

**Implementation notes:**
- Create `useKeyboardShortcuts` hook.
- Use `cmdk` or lightweight custom implementation.
- Start with 5–7 shortcuts; expand based on usage analytics.
- Ensure shortcuts are discoverable via `?` overlay.

---

### 2.4 Undo for Destructive Actions (`#8`)

| Field | Detail |
|-------|--------|
| **What it is** | Replace `confirm()` dialogs on destructive actions (delete booking, remove staff, clean slate) with a toast/notification pattern that offers a 5–10 second "Deshacer" window. |
| **Why Phase 2** | `confirm()` is a **cognitive wall** — it halts flow and trains users to click "OK" without reading. Undo is the Mac 2026 way: allow action, then offer reversal. This builds user confidence before we restructure complex workflows in Phase 3. |
| **Depends on** | Nothing (can use existing `AnimatePresence` + toast pattern). |
| **Effort** | Medium |
| **Impact** | High |

**Implementation notes:**
- Create `UndoToast` component with `springGentle` animation.
- Actions to cover: `deleteStaff`, `handleCleanSlate`, `onDelete` in `BookingWizardModal`.
- Persist undo state in a temporary ref; commit to server after timeout.

---

## Phase 3: Cognitive Simplification

> **Goal:** Reduce the number of decisions per screen and organize complexity into hierarchical layers.  
> **Rationale:** Phase 1 gave us the visual language; Phase 2 gave us trust. Now we attack the core cognitive debt: screens that expose too many decisions simultaneously.

---

### 3.1 Technical Complexity Layers (`#7`)

| Field | Detail |
|-------|--------|
| **What it is** | Restructure `SettingsPanel` and admin configurations into **3 cognitive tiers**: (1) Essential (hotel name, contact, branding), (2) Operational (Wompi keys, staff, amenities), (3) Advanced (SEO, OG tags, API configs, Clean Slate). Each tier is progressively disclosed and visually de-emphasized. |
| **Why Phase 3** | `SettingsPanel` already has 6 disclosure sections, but they are **flat** — Wompi API keys sit at the same hierarchy as hotel name. This violates progressive disclosure. Restructuring settings validates the pattern before applying it to user-facing booking flows. |
| **Depends on** | `#10` (tooltips explain advanced fields), `#13` (negative space defines tier separation). |
| **Effort** | Medium |
| **Impact** | Medium |

**Implementation notes:**
- Tier 1: Always expanded, visual weight = high.
- Tier 2: Collapsed by default, visual weight = medium.
- Tier 3: Hidden behind an additional "Mostrar avanzado" gate with `desaturateFeedback` on the gate button to signal caution.

---

### 3.2 Hick's Law: 1 Decision Per Screen (`#2`)

| Field | Detail |
|-------|--------|
| **What it is** | Redesign `CheckoutForm` and `BookingWizardModal` from monolithic forms into **step wizards** where each step presents exactly one decision: dates → room → upsells → guest data → payment. |
| **Why Phase 3** | These are the two highest-cognitive-load screens in the app. `CheckoutForm` exposes upsells + personal data + payment simultaneously. `BookingWizardModal` exposes booking type + dates + room + guest data + pricing simultaneously. This is the **core UX debt**. Fixing it requires Phase 1 (spacing/materials stable) and Phase 2 (tooltips guide users through steps). |
| **Depends on** | `#13` (negative space defines step rhythm), `#10` (tooltips explain each step), `#3` (tracking/leading ensures step titles are scannable), `#4` (shadow-cta highlights the primary action of each step). |
| **Effort** | High |
| **Impact** | High |

**Implementation notes:**
- Use `framer-motion` `AnimatePresence` with `springGentle` for step transitions.
- Each step shows a **progress indicator** (spring layout pill, like `NavButton` active indicator).
- Maintain form state in a parent hook so users can navigate back.
- Mobile-first: each step must feel complete on a 375px screen.

---

## Phase 4: Intelligent UI

> **Goal:** Make the interface feel alive, anticipatory, and context-aware.  
> **Rationale:** Phase 3 simplified the cognitive model. Phase 4 adds the "magic": transitions that feel like physical objects, and UI that adapts to user intent before explicit input.

---

### 4.1 Predictive UI: Calendar → Unit Selection Transition (`#6`)

| Field | Detail |
|-------|--------|
| **What it is** | When a user selects dates in the booking flow, the calendar **morphs** into the room selection view rather than abruptly replacing it. The selected date range stays visible as a compact "chip" while rooms animate in from below. |
| **Why Phase 4** | Predictive UI requires **clean step boundaries** (from Phase 3). You cannot animate a smooth transition between two screens that each contain 5 decisions — the animation would feel chaotic. With Hick's Law implemented, each step has a single focus, making the transition legible and delightful. |
| **Depends on** | `#2` (Hick's Law creates the step structure to animate between). Also benefits from `#11` (glass materials create depth during transitions). |
| **Effort** | High |
| **Impact** | High |

**Implementation notes:**
- Use Framer Motion `layoutId` to animate the date summary chip from calendar position to filter bar position.
- Room cards should stagger in with `springSnappy` (staggerChildren: 0.05).
- If no rooms are available, use `desaturateFeedback` on the calendar section instead of a red alert box.

---

### 4.2 Contextual Awareness (`#5`)

| Field | Detail |
|-------|--------|
| **What it is** | The UI adapts based on inferred user intent: if a user repeatedly books weekend stays, default to Friday→Sunday; if a user always selects the same room type, surface it first; if inventory is low, show urgency indicators without requiring the user to open the inventory panel. |
| **Why Phase 4** | Contextual awareness is the **highest-order pattern**. It requires: (a) clean single-purpose screens (Phase 3), (b) smooth transitions (Phase 4.1), (c) a user behavior model (localStorage or lightweight analytics), and (d) the feedback layer (Phase 2) so users understand *why* the UI changed. Attempting this earlier would compound cognitive load instead of reducing it. |
| **Depends on** | `#2` (Hick's Law), `#6` (Predictive UI transitions), `#8` (Undo, because predictive changes must be reversible), `#1` (desaturateFeedback for soft "we changed this for you" notifications). |
| **Effort** | High |
| **Impact** | High |

**Implementation notes:**
- Start with **3 contextual rules** to avoid over-engineering:
  1. Weekend preference detection → auto-select Friday check-in.
  2. Room type frequency → sort room list by historical preference.
  3. Low inventory → show "Últimas 2 unidades" badge with `springBounce` attention grab.
- Store preferences in `localStorage` with TTL (30 days).
- Always offer a "Restablecer sugerencias" escape hatch.

---

## Dependency Graph

```
Phase 1: Foundation
├── #14 Geist Font ───────┬──→ #3 Tracking/Leading
│                         └──→ (all visual items)
├── #13 Active Negative Space ──→ #2 Hick's Law
├── #11 Glassmorphism ────→ #6 Predictive UI (depth during transitions)
├── #12 Specular Borders ─┘
└── #4 Visual Salience ───→ #2 Hick's Law (CTA emphasis per step)

Phase 2: Feedback
├── #1 desaturateFeedback ──→ #8 Undo (soft failure pattern)
├── #10 Tooltips ───────────→ #2 Hick's Law (guide per step)
├── #9 Keyboard Shortcuts ──→ #2 Hick's Law (step navigation)
└── #8 Undo ────────────────→ #5 Contextual Awareness (reversibility)

Phase 3: Simplification
├── #7 Complexity Layers ──→ (validates progressive disclosure)
└── #2 Hick's Law ─────────┬──→ #6 Predictive UI
                           └──→ #5 Contextual Awareness

Phase 4: Intelligence
├── #6 Predictive UI ──────→ #5 Contextual Awareness
└── #5 Contextual Awareness (culmination)
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **Phase 1 font switch causes visual regression** | Deploy Geist behind a feature flag or limit to OTA theme first (lower traffic, higher design tolerance). |
| **Phase 3 wizard redesign breaks existing user muscle memory** | A/B test the wizard against the monolithic form. Measure completion rate, not just click-through. |
| **Phase 4 contextual awareness feels creepy or unpredictable** | Always show a "why" micro-copy (e.g., "Te sugerimos este fin de semana porque sueles reservar escapadas"). Provide one-click reset. |
| **Glassmorphism migration causes performance issues on low-end Android** | Use `CSS.supports('backdrop-filter: blur(1px)')` to detect support; fallback to solid opacity layers. |

---

## Success Metrics

| Phase | Metric | Target |
|-------|--------|--------|
| 1 | Visual consistency audit pass | 100% of glass surfaces use `.glass-{card,panel,pill}` |
| 2 | Form error recovery time | ↓ 40% (desaturate vs. alert boxes) |
| 3 | Booking form completion rate | ↑ 15% (wizard vs. monolithic) |
| 3 | Settings task time (first visit) | ↓ 25% (tiered vs. flat) |
| 4 | Booking creation time (repeat user) | ↓ 30% (predictive defaults) |
| 4 | User-reported "interface feels intelligent" | ≥ 4.2 / 5 on post-booking micro-survey |

---

## Appendix: Verified Current State

| Claim | Verification |
|-------|--------------|
| 438 border-radius → squircle CSS | `globals.css` defines `--radius-squircle-sm` through `--radius-squircle-3xl`; components use CSS variable references to squircle radius tokens |
| 9 shadcn/ui components with spring | `button.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `input.tsx`, `label.tsx`, `select.tsx`, `sheet.tsx`, `table.tsx`, `tabs.tsx` |
| Sidebar 4 semantic chunks | `menuItems.ts` defines `operations`, `services`, `management`, `system` |
| SettingsPanel 6 disclosure sections | `showOtaImages`, `showOtaTrust`, `showOtaActivity`, `showOtaSeo`, `showOtaHours`, `showOtaProtocols` |
| GlassTooltip in 3 places | All 3 instances are in `SettingsPanel.tsx` (Wompi, Trust Badges, SEO) |
| `shakeHaptic` in CheckoutForm & ReviewForm | Verified in both files |
| 3 loading skeletons | `MapSkeleton.tsx`, `RoomCardSkeleton.tsx`, `ReviewSkeleton.tsx` |
| Date picker prevents 0-night bookings | `BookingWizardModal.tsx` enforces `min={checkIn + 1 day}` |
| 14 technical terms → hospitality language | `Vista General`, `Agenda`, `Inventario`, `Limpieza`, `Huéspedes`, `Carta Digital`, `Libro Registro`, `Marketing`, `Reportes`, `Configuración`, `Cierre de Turno`, `Finalizar Sesión`, `Panel Principal`, `Equipo` |
| `springGentle` in MobileNav | Verified in dock hide/show and menu expansion |
| `springLayout` in NavButton | Verified as `layoutId="sidebar-active-indicator"` |
| `desaturateFeedback` never used | Only defined in `spring.ts` line 96; zero imports across codebase |
| Tracking/Leading tokens never applied | Defined in `globals.css` lines 114–119; zero references in components |
| `--shadow-cta` never applied | Defined in `globals.css` line 76; zero references in components |
| Geist imported but not rendered | `layout.tsx` imports Geist and sets `geist.variable` on `<html>`, but `body` uses `inter.className` and `globals.css` points to `--font-inter` |
| 133 ad-hoc `backdrop-blur` declarations | Grep confirms 133 matches; most are inline `bg-zinc-900/40 backdrop-blur-*` instead of `.glass-*` classes |
