# Arquitectura Funnel Ganador — Totiao VIP (Estrategia In-App)

## Visión General
**Estrategia:** Funnel Expreso In-App (Comentario → DM Automatizado → Landing Page).
**Objetivo:** Captura de leads con fricción cero, eliminando la dependencia de enlaces en biografía y automatizando la interacción inicial mediante la API de Meta Graph.
**Métrica Clave:** Tiempo de conversión < 10 segundos desde el comentario.

---

## Fases del Funnel

### Fase 1: Gancho Lo-Fi Orgánico (Instagram Reel)
- **Acción:** Publicación de Reel con CTA verbal/visual: "Comenta ANTOJO y te envío el acceso".
- **Psicología:** El comentario entrena al algoritmo de Instagram para aumentar el alcance orgánico del Reel.
- **Resultado:** Generación de tráfico cualificado hacia el Inbox.

### Fase 2: Orquestación Automatizada (Make.com / n8n)
- **Trigger:** Webhook de Meta intercepta `new_comment` con keyword "ANTOJO".
- **Acción:** El sistema obtiene el `user_id` del comentarista y envía un DM automático inmediato.
- **Copy del DM:** "¡El CRUNCH no miente! 🥩 Aquí tienes tu acceso directo a la lista VIP de Totiao para que sepas el día exacto de apertura: https://hospedasuite.com/totiao_vip"
- **Ventaja:** Gratificación instantánea. El usuario recibe el enlace en su bandeja de entrada sin salir de la app.

### Fase 3: Captura Atómica (Landing Page Inquilina)
- **Destino:** El enlace del DM lleva a `hospedasuite.com/totiao_vip` (alojada como inquilino aislado).
- **UI:** Formulario de un solo campo (Nombre/Instagram). Cero distracciones, cero fechas, cero calendarios.
- **Acción Final:** El usuario ingresa sus datos y es redirigido a WhatsApp para confirmar su lugar en la lista VIP.
- **Resultado:** Lead calificado almacenado en base de datos silenciosa + conversación iniciada en WhatsApp.

---

## Reglas de Oro (Brand Core OS)
1.  **Cero Fricción:** El usuario nunca debe buscar un enlace en la bio. Todo ocurre en el flujo natural de la app.
2.  **Cero Fechas:** La landing page nunca revela la fecha de apertura. El misterio es el activo.
3.  **Cero Disculpas:** Prohibido usar "Próximamente", "En construcción" o "Disculpa".
4.  **Escalabilidad:** El sistema opera 24/7 sin intervención humana. El fundador solo interviene para la activación final.

## Infraestructura Técnica
- **Frontend:** Next.js (App Router) alojado en Vercel/HospedaSuite.
- **Automatización:** Make.com (Webhook → HTTP Request → Instagram Graph API).
- **Base de Datos:** Supabase (Tabla `totiao_vip_leads`).
