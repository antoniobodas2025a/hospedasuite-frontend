# Arquitectura Funnel Ganador — Totiao VIP

## Estrategia: Efecto Zeigarnik + Fricción Cero

### Fase 1: Intercepción In-App (Instagram)
- **Trigger:** Comentario con palabra clave "ANTOJO" en Reel.
- **Mecanismo:** Webhook de Make.com intercepta `new_comment`.
- **Acción:** DM automático con copy de "CRUNCH" + enlace a Landing VIP.
- **Objetivo:** Sacar al usuario de Instagram sin fricción (link directo).

### Fase 2: Captura Atómica (Landing Page)
- **UI:** Formulario de un solo campo (email/teléfono). Sin fechas, sin calendarios.
- **Copy:** "¡El CRUNCH no miente! 🥩 Aquí tienes tu acceso directo a la lista VIP..."
- **Psicología:** La falta de fecha genera curiosidad (Zeigarnik). El usuario quiere "cerrar el ciclo".
- **Objetivo:** Lead calificado para base de datos silenciosa.

### Fase 3: Activación Silenciosa (Base de Datos)
- **Mecanismo:** Lead guardado en tabla `totiao_vip_leads`.
- **Acción:** Notificación manual o automatizada el día de apertura.
- **Objetivo:** Conversión masiva el día 0 sin costo de adquisición adicional.

## Reglas de Oro
1.  **Cero fechas:** Nunca revelar fecha de apertura en la web.
2.  **Cero disculpas:** Prohibido "Próximamente", "En construcción", "Disculpa".
3.  **Un solo CTA:** El botón de WhatsApp o formulario es la única acción posible.
4.  **Misterio:** El copy debe evocar anticipación, no información operativa.
