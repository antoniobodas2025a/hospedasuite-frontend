# PRD-004: Manual Payment Lifecycle & Urgency

**Fecha:** 2026-05-23  
**Estado:** Draft  
**Autor:** Gentle AI (SDD Orchestrator)

---

## 1. Problema
La política de buena fe permite publicar inmediatamente, pero sin un mecanismo de urgencia, los hoteleros pueden postergar la verificación del pago indefinidamente.

## 2. Solución: Ciclo de Vida Automatizado

| Día | Estado | Acción | Mensaje al Usuario |
|-----|--------|--------|-------------------|
| **0** | `pending_approval` | Publicación inmediata | "Tu propiedad está activa. Verificaremos tu pago en 24-48h." |
| **25** | `pending_approval` | Aviso preventivo | "Recordá enviar tu comprobante si aún no lo hiciste." |
| **29** | `pending_approval` | Urgencia | "⚠️ Quedan 24h para verificar tu pago. Tu propiedad seguirá activa, pero necesitamos tu comprobante." |
| **30** | `past_due` | Restricción parcial | "🔴 Período de verificación vencido. Tu propiedad sigue visible pero con funciones limitadas." |
| **31** | `past_due` | Urgencia crítica | "🚨 Acción requerida: Verificá tu pago hoy o tu propiedad será ocultada mañana." |
| **32** | `cancelled` | Ocultamiento | "Tu propiedad fue ocultada por falta de verificación. Contactanos para reactivarla." |

## 3. Arquitectura

- **Cron Job:** `src/app/api/cron/payment-lifecycle/route.ts` (ejecuta cada hora).
- **Trigger:** `trial_ends_at` se usa como fecha límite (Día 30).
- **UI:** Banners dinámicos en el dashboard basados en días restantes.
- **Server Actions:** `checkPaymentLifecycle()` para actualizar estados.

## 4. Métricas de Éxito
- % de pagos manuales verificados antes del Día 30: >80%
- Tiempo promedio de verificación: <48h
- Tasa de retención post-Día 30: >90%
