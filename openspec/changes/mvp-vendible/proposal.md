# Proposal: MVP Vendible — Plan Gating + Billing Recurrente + OTA Bilingüe

## Intent

HospedaSuite tiene un producto funcional (PMS, OTA, onboarding) pero **NO se puede vender**. No hay gating de features, no hay suscripción recurrente automática, y la OTA no está completamente bilingüe. Este change implementa la infraestructura mínima para que un hotel pueda registrarse, pagar mensualmente, y usar features acordes a su plan.

## Scope

### In Scope
- **Fase 1 — DAL + Plan Gating (4-6h):** Data Access Layer con `server-only`, funciones de autorización por plan, validación de límites (unidades, OTAs)
- **Fase 2 — Billing Recurrente (8-10h):** Tabla `saas_subscriptions`, webhook Wompi, cron de renovaciones, emails de notificación
- **Fase 3 — Upgrade Prompt UI (2-3h):** Componente `UpgradePrompt`, hook `use-plan-check`, server actions de plan
- **Fase 4 — OTA Bilingüe Completo (3-4h):** Traducir 6 componentes restantes, onboarding wizard, keys faltantes

### Out of Scope
- Carta Digital (CRUD menú, QR, POS) — Fase 5 del PRD
- Agentes IA (Concierge, Revenue, OTA Sync, Review, Carta Digital IA) — Fase 5+ del PRD
- Libro Registro Forense — Fase 4 del PRD (diferente numbering)
- Channel Manager bidireccional real con APIs directas de OTAs
- Multi-property / property groups

## Capabilities

### New Capabilities
- `data-access-layer`: Server-only modules con patrón Auth → Authorization → Execute → Revalidate. Centraliza acceso a DB para hotels, rooms, OTA connections, y plan validation.
- `plan-gating`: Enforce de límites por plan (unidades, OTAs, staff) en server actions. Bloqueo de features según tier con `requirePlan()` y `checkPlanFeature()`.
- `recurring-billing`: Suscripciones recurrentes con Wompi. Tabla `saas_subscriptions`, webhook de pago, cron de renovación automática, notificaciones por email.
- `upgrade-prompt`: UI de upgrade cuando un usuario intenta acceder a feature de plan superior. Incluye componente, hook, y server actions.

### Modified Capabilities
- `ota-bilingual`: Completar traducción de 6 componentes OTA restantes + onboarding wizard. next-intl ya está configurado; faltan strings y componentes.

## Approach

1. **DAL primero:** Crear `src/data/` con módulos `server-only`. Cada módulo exporta funciones que siguen el patrón: Auth → Authorization → Execute → Revalidate. Esto reemplaza las llamadas directas a `supabaseAdmin` dispersas en componentes y API routes.
2. **Plan gating en server actions:** Integrar `requirePlan()` y validación de límites (`PLAN_LIMITS`) en las server actions existentes. No se toca el middleware de routing — el gating se hace a nivel de acción.
3. **Billing recurrente:** Nueva tabla `saas_subscriptions` con estado de suscripción, fechas de ciclo, y referencia Wompi. Webhook en `/api/webhooks/wompi/subscription` para manejar pagos. Cron en `/api/cron/process-renewals` para renovaciones automáticas.
4. **Upgrade Prompt:** Componente cliente que se muestra cuando `checkPlanFeature()` retorna `false`. Hook `use-plan-check` para uso en componentes.
5. **OTA bilingüe:** Completar traducciones pendientes usando `useTranslations()` de next-intl. Agregar keys faltantes en `messages/en.json` y `messages/es.json`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/data/` | New | Directorio nuevo con módulos server-only: plan-guard.ts, hotels.ts, ota-connections.ts, rooms.ts |
| `src/lib/plan-authorization.ts` | Modified | Refactor para usar DAL en lugar de llamadas directas a supabaseAdmin |
| `src/app/actions/billing.ts` | Modified | Agregar createSubscription(), upgradeSubscription(), cancelSubscription() |
| `src/app/actions/plan-actions.ts` | New | Server actions para cambio de plan |
| `src/app/api/webhooks/wompi/subscription/route.ts` | New | Webhook handler para pagos de suscripción |
| `src/app/api/cron/process-renewals/route.ts` | New | Cron job para renovaciones automáticas |
| `src/components/plan/UpgradePrompt.tsx` | New | UI de upgrade prompt |
| `src/hooks/use-plan-check.ts` | New | Hook para verificar acceso a features |
| `src/components/ota/*.tsx` | Modified | Traducir 6 componentes restantes con useTranslations() |
| `src/components/onboarding/*.tsx` | Modified | Traducir wizard de onboarding |
| `messages/en.json` | Modified | Keys faltantes de traducción |
| `messages/es.json` | Modified | Keys faltantes de traducción |
| DB: `saas_subscriptions` | New | Tabla de suscripciones recurrentes |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Wompi subscription API difiere de lo esperado | Medium | Investigar API docs de Wompi antes de implementar. Fallback a facturación manual con emails de recordatorio. |
| Plan gating no bloquea todas las vías de acceso | Medium | Auditoría exhaustiva de todas las server actions que modifican datos sensibles (rooms, OTAs). Tests de integración. |
| DAL introduce breaking changes en componentes existentes | Low | Migración incremental: crear DAL primero, luego actualizar server actions una por una. |
| Cron de renovaciones falla silenciosamente | Medium | Logging detallado + alertas si el cron no ejecuta. Email de fallback si el webhook falla. |

## Rollback Plan

1. **DAL:** Si los nuevos módulos causan errores, revertir el commit de `src/data/` y restaurar las llamadas directas a `supabaseAdmin`.
2. **Billing:** Si el webhook o cron causan cobros duplicados, deshabilitar el cron y revertir la tabla `saas_subscriptions`. Mantener `billing_invoices` existente como fallback.
3. **Plan gating:** Si el gating bloquea features legítimas, agregar bypass temporal con feature flag `DISABLE_PLAN_GATING=true`.
4. **OTA bilingüe:** Si las traducciones rompen la UI, revertir los cambios en `messages/*.json` y componentes OTA.

## Dependencies

- Wompi API para suscripciones recurrentes (verificar disponibilidad de recurring payments)
- Supabase para nueva tabla `saas_subscriptions`
- next-intl ya configurado (existe, solo completar traducciones)
- QStash o Vercel Cron para job de renovaciones

## Success Criteria

- [ ] Hotel Starter no puede crear más de 4 unidades
- [ ] Hotel Starter no puede conectar OTAs (límite 0)
- [ ] Hotel Pro puede conectar hasta 3 OTAs, no más
- [ ] Suscripción recurrente se cobra automáticamente cada mes vía Wompi
- [ ] Webhook de Wompi actualiza estado de suscripción en DB
- [ ] Upgrade prompt muestra opciones de upgrade cuando feature está bloqueada
- [ ] OTA pública funciona completamente en español e inglés
- [ ] Onboarding wizard funciona en ambos idiomas
- [ ] Todos los server actions siguen patrón Auth → Authorization → Execute → Revalidate
