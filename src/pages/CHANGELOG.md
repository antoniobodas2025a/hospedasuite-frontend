# 📜 Historial de Cambios

## [0.2.0] - Hito 1: Seguridad y Backend

### Añadido

- **Edge Function:** `send-whatsapp` para ocultar credenciales de Evolution API.
- **RLS:** Políticas de seguridad activadas en tabla `leads` (Insert público, Select privado).
- **Scripts SQL:** Reparación estructural de tablas `hotels` y `rooms`.

### Corregido

- **Vulnerabilidad P0:** Eliminada la API Key del código cliente en `LandingPage.jsx`.
- **Bug Lógico:** Corregida validación duplicada de teléfonos en el formulario de registro.
- **Performance:** Estilos globales movidos de JS a `index.css`.

## [0.1.0] - Hito 0: Landing Page

### Añadido

- Estructura base React + Vite.
- Componente `LandingPage` con SEO dinámico por ciudad.
- Lógica "Warm Start" (3/12 cupos) para validación social.
