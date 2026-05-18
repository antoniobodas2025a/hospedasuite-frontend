# Design: Onboarding Wizard Redesign (Mac 2026)

## Technical Approach

Replace the single-page onboarding wizard (`src/app/software/onboarding/page.tsx`, 440 LOC, 3 steps + direct Supabase uploads + `alert()`) with a 6-step progressive wizard backed by a Zustand store with DB persistence. Decompose into 11 focused components, enforce step-gated Zod validation, route ALL images through `uploadOptimizedImageAction`, and apply Mac 2026 glass aesthetic uniformly.

## Architecture Decisions

| # | Decision | Options | Choice | Rationale |
|---|----------|---------|--------|-----------|
| 1 | Step decomposition | A. Single component with conditional rendering (current) / B. One component per step | **B** | Current 440-line file violates SRP. Each step owns its validation, UI, and handlers. Orchestrator page becomes thin: step machine + store bridge (~80 LOC). |
| 2 | Room editing surface | A. Modal per room / B. Inline expandable cards | **B** | Modal stacking during wizard creates Z-index chaos and disorients users. Inline expand/collapse with `layout` animations keeps context visible. |
| 3 | State persistence strategy | A. Save on every field change / B. Save on step completion only | **Mixed** | Step completion writes `onboarding_step` + full `config` JSONB (durable milestones). Field-level auto-save debounced 500ms protects against browser crash but avoids write storms. |
| 4 | Image upload timing | A. Upload on select (during wizard) / B. Upload all at provisioning | **A** | Users expect previews immediately. `uploadOptimizedImageAction` is fast (server action). Provisioning skips already-uploaded images (URL already in store). |
| 5 | Store architecture | A. Single flat store / B. Sliced store per step | **A** | One `useOnboardingStore` with all step data. Simpler recovery from DB, single serialization point for auto-save. Framer-Motion's `AnimatePresence` handles step transitions independently of store shape. |
| 6 | Drag-and-drop reorder | A. Custom implementation / B. @dnd-kit/core (already installed) | **B** | Already a dependency. `@dnd-kit/sortable` provides accessible keyboard reorder out of the box. Zero new deps. |
| 7 | Toast notifications | A. Custom toast / B. sonner (not installed) / C. UndoToast component (existing) | **C** | Project has `UndoToast.tsx` with undo pattern. Extend for error toasts with retry. No new dependency. |
| 8 | Step 5 settings fields | A. All fields visible / B. Progressive disclosure accordion | **B** | Specs require accordion for advanced fields (SEO, trust badges, reception hours). Uses existing `springGentle()` + `AnimatePresence` for height reveal. Matches `SettingsPanel.tsx` pattern. |

## Data Flow

```
User input (blur/change)
  │
  ├─ Zod validation (real-time, per field)
  │   └─ Invalid → red border + inline error (no alert)
  │   └─ Valid   → store.setField(...)
  │
  ├─ Zustand store (useOnboardingStore)
  │   ├─ currentStep, maxCompletedStep
  │   ├─ hotelIdentity (name, city, location, address, phone, email, description)
  │   ├─ gallery (ImageAsset[] with {url, urls, blurDataURL})
  │   ├─ propertyType ('hotel' | 'glamping' | 'cabanas' | 'hostal' | 'apartamento')
  │   ├─ rooms (RoomConfig[] with gallery, amenities, availability)
  │   ├─ settings (amenities[], checkInTime, checkOutTime, whatsapp, googleMaps, cancellation)
  │   ├─ staff (name, pin_code — pre-filled from DB)
  │   └─ payment (amount, token)
  │
  ├─ Debounced auto-save (500ms)
  │   └─ saveOnboardingDraft(store state) → hotels.config JSONB
  │
  ├─ Image upload (on file select)
  │   └─ uploadOptimizedImageAction(formData, folder) → { url, urls, blurDataURL }
  │
  └─ Provisioning (on payment success)
      └─ executeProvisioningAction(store state)
          ├─ Upload pending images (skip already-uploaded)
          ├─ hotels UPDATE (all fields, is_onboarding_complete=true)
          ├─ rooms INSERT (with gallery, amenities, availability_range)
          └─ redirect → /dashboard
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/store/useOnboardingStore.ts` | Modify | Expand to full wizard shape (identity, gallery, propertyType, rooms[], settings, staff). Add `saveDraft()`, `recoverFromDB()`, field-level setters. |
| `src/lib/room-templates.ts` | **Create** | `ROOM_TEMPLATES: Record<PropertyType, RoomTemplate[]>`. 18 templates across 5 property types. |
| `src/lib/validations/onboarding.ts` | **Create** | Zod schemas: `hotelIdentitySchema`, `gallerySchema`, `propertyTypeSchema`, `roomSchema`, `settingsSchema`. Each exports `validate(data)` and `getFieldError(field)`. |
| `src/components/onboarding/StepIndicator.tsx` | **Create** | 6-step progress bar. Completed steps show checkmark, current highlighted, future dimmed. Click completed to navigate back. |
| `src/components/onboarding/HotelIdentityStep.tsx` | **Create** | Step 1: name, city, location (required), address/phone/email behind accordion. Logo + cover uploads. |
| `src/components/onboarding/PropertyGalleryStep.tsx` | **Create** | Step 2: 3-8 photos via drag-and-drop grid. Reorder with `@dnd-kit/sortable`. |
| `src/components/onboarding/PropertyTypeStep.tsx` | **Create** | Step 3: 5 property type badges. Selection drives Step 4 templates. |
| `src/components/onboarding/RoomTemplatesStep.tsx` | **Create** | Step 4: template selector (filtered by propertyType) + room list with inline expand. At least 1 room with name+price>0 required. |
| `src/components/onboarding/RoomDetailStep.tsx` | **Create** | Step 4b: inline room editor. Name, price, description, capacity, amenities toggles (ROOM_AMENITY_REGISTRY), gallery (max 5), DayPicker availability. |
| `src/components/onboarding/SettingsStep.tsx` | **Create** | Step 5: hotel amenities (AMENITY_REGISTRY), check-in/out times, WhatsApp, Google Maps, cancellation policy. Advanced accordion (SEO, trust badges, reception hours). Staff editor (pre-filled). |
| `src/components/onboarding/PaymentStep.tsx` | **Create** | Step 6: summary of all data, WompiButton (amount from URL `?price=` or default 89900). Triggers provisioning on success. |
| `src/components/onboarding/ProvisioningStep.tsx` | **Create** | Loading state: 3 progress stages ("Subiendo imágenes", "Guardando datos", "Configurando unidades"). Navigation lock. Error state with retry. |
| `src/app/software/onboarding/page.tsx` | Modify | Thin orchestrator: step machine, `AnimatePresence` routing, store ↔ DB sync. |
| `src/app/software/onboarding/success/page.tsx` | **Create** | Post-provisioning success page: "¡Tu propiedad está lista!", dashboard link, OTA link. |
| `src/app/actions/onboarding.ts` | Modify | Add `executeProvisioningAction(state)`, `saveOnboardingDraftAction(hotelId, step, config)`, `recoverOnboardingAction()`. |
| `src/lib/amenity-registry.ts` | Modify | Add `category` field to both registries for grouped display in Steps 4 and 5. |

## Interfaces / Contracts

```typescript
// Store shape (src/store/useOnboardingStore.ts)
interface OnboardingStore {
  currentStep: number; maxCompletedStep: number;
  hotelId: string | null; isSubmitting: boolean; error: string | null;

  hotelIdentity: { name: string; city: string; location: string; address?: string; phone?: string; email?: string; description?: string; };
  gallery: ImageAsset[];  // { url, urls:{thumb,card,full}, blurDataURL, file }
  propertyType: PropertyType | null;
  rooms: RoomConfig[];    // { id, templateId?, name, price, description, capacity, amenities[], gallery:ImageAsset[], availability:DateRange|undefined }
  settings: { amenities: string[]; checkInTime: string; checkOutTime: string; whatsapp: string; googleMapsUrl: string; cancellationPolicy: string; seoTitle?: string; seoDescription?: string; trustBadges: boolean; receptionHours: string; };
  staff: { name: string; pin_code: string; };
  payment: { amount: number; token?: string; };

  setField: <K extends keyof OnboardingStore>(key: K, value: ...) => void;
  goToStep: (step: number) => void;
  recoverFromDB: () => Promise<void>;
  saveDraft: () => Promise<void>;
}

// Template registry (src/lib/room-templates.ts)
type PropertyType = 'hotel' | 'glamping' | 'cabanas' | 'hostal' | 'apartamento';
interface RoomTemplate { id: string; name: string; suggestedAmenities: string[]; defaultCapacity: number; defaultBeds: number; priceRange: [number, number]; }
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Zod schemas per step — valid/invalid payloads | `vitest` — snapshot valid passes, verify error messages for each field |
| Unit | `ROOM_TEMPLATES` registry access by property type | `vitest` — all 5 types return non-empty arrays, unknown returns `[]` |
| Integration | Store auto-save debounce + DB recovery | Manual — fill step 1, close tab, reopen, verify state restored |
| Integration | Image upload → store URL written → reuse at provisioning | Manual — upload logo in step 1, verify no re-upload during provisioning |
| E2E | Full 6-step flow → payment → provisioning → dashboard redirect | Manual walkthrough with Wompi test cards |
| Regression | Existing tenants with partial onboarding (old format) redirect correctly | Manual — test with `onboarding_step=2` (old wizard) |

## Migration / Rollout

**No DB migration required.** The `hotels` table already has `onboarding_step` (integer), `config` (JSONB), and `is_onboarding_complete` (boolean). The new wizard writes to the same columns.

- Old wizard tenants with `onboarding_step=2` will be redirected to dashboard (since old wizard had 3 steps, step 2 is not a valid resume point for the new 6-step wizard — they restart cleanly).
- `hotels.config` is JSONB — new fields coexist with legacy keys. No conflict.
- Rollback: revert `page.tsx` and `useOnboardingStore.ts` to previous versions. New components are additive, no shared files broken.

## Open Questions

- None. All decisions align with existing project conventions (server actions, Zustand, Mac 2026 primitives, Zod validation).
