# PRD-002: Flujo de Pago Manual — HospedaSuite Colombia

**Fecha:** 2026-05-22  
**Estado:** En Implementación  
**Autor:** Gentle AI (SDD Orchestrator)

---

## 1. Problema
El wizard de onboarding actual exige completar una pasarela de pagos (Wompi) para publicar el hotel. Muchos hoteleros en Colombia no tienen cuenta bancaria formal o tarjeta de crédito, prefieren pagar por Nequi/Daviplata, o desconfían de ingresar datos financieros en un sistema nuevo. Esto genera abandono en el onboarding.

## 2. Solución: Flujo Híbrido (Wompi + Manual)
- **Wompi:** Opción principal, destacada. Procesamiento automático e instantáneo.
- **Pago Manual:** Opción secundaria para quienes no pueden usar Wompi.
  - **Datos:** Nequi: `3213795015`, Daviplata: `3213795015`.
  - **Flujo:** El hotel queda en estado `pending_approval`. El usuario sube comprobante de pago desde su dashboard.
  - **Aprobación:** Super Admin verifica el comprobante en el dashboard y aprueba/rechaza.
  - **Mitigación de "No Webhook":** Sistema de carga de comprobantes con metodología de buena fe + verificación manual rápida.

## 3. Arquitectura Técnica
- **Tabla `manual_payments`:** Registra intentos de pago manual, comprobantes y estado.
- **Estados del Hotel:** `draft` → `pending_approval` → `active`.
- **UI Hotelero:** Banner de "Pago pendiente" con botón para subir comprobante.
- **UI Super Admin:** Sección de "Pagos manuales pendientes" con visor de comprobantes.

## 4. Métricas de Éxito
- Conversión onboarding completado: +25%.
- Tiempo promedio de aprobación manual: <2 horas.
- Tasa de fraude: <2%.

## 5. Límite Temporal
Esta opción manual es para los primeros 6 meses. Después se evalúa la integración con MercadoPago/PayU o se mantiene como opcional según demanda. Wompi se deja como opcional para permitir la publicación del hotel.
