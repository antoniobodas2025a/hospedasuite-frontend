# Runbook de Incidentes

Procedimientos para responder a incidentes en producción.

## Niveles de Severidad

| Nivel | Descripción | Tiempo de Respuesta | Ejemplo |
|-------|-------------|---------------------|---------|
| **P1 - Crítico** | Servicio caído, pérdida de datos, seguridad | < 15 min | Sitio down, breach de datos |
| **P2 - Alto** | Feature crítica rota, performance degradada | < 1 hora | Pagos no procesan, LCP > 10s |
| **P3 - Medio** | Feature no-crítica rota, bugs menores | < 4 horas | Modal no abre, imagen rota |
| **P4 - Bajo** | Mejoras, optimizaciones, documentación | < 1 semana | Refactor, agregar tests |

---

## P1: Sitio Caído

### Síntomas
- https://hospedasuite.com no carga
- Error 500, 502, 503, 504
- Coolify muestra "Deployment failed"

### Pasos de Respuesta

#### 1. Verificar status (2 min)
```bash
# Verificar si es problema de DNS
ping hospedasuite.com

# Verificar si es problema de servidor
curl -I https://hospedasuite.com

# Verificar Coolify
# http://78.47.36.250:8000 → Application → Deployments
```

#### 2. Identificar causa (5 min)
**Si deploy reciente falló**:
- Coolify Dashboard → Logs del deploy
- Buscar error en build (TypeScript, dependencies, OOM)

**Si no hay deploy reciente**:
- Verificar logs de aplicación:
  ```bash
  # En Coolify: Application → Logs
  ```
- Verificar Supabase status: https://status.supabase.com
- Verificar Cloudflare status: https://www.cloudflarestatus.com

#### 3. Mitigar (10 min)

**Si es deploy fallido**:
```bash
# Revertir a último deploy exitoso
# Coolify → Application → Deployments → Rollback

# O revertir commit localmente
git revert HEAD
git push origin main
```

**Si es problema de Supabase**:
- Esperar a que Supabase resuelva
- Si es crítico, contactar soporte: support@supabase.io

**Si es problema de Cloudflare**:
- Esperar a que Cloudflare resuelva
- Si es crítico, contactar soporte

**Si es OOM (Out of Memory)**:
```bash
# Aumentar memoria en Dockerfile
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Commit y push
git commit -am "fix: increase Node.js memory limit"
git push origin main
```

#### 4. Comunicar (inmediato)
- Notificar a stakeholders (WhatsApp/Slack)
- Si es > 30 min, actualizar status page

#### 5. Post-mortem (dentro de 24h)
- Documentar causa raíz
- Documentar tiempo de detección → resolución
- Documentar acciones preventivas
- Actualizar este runbook si es necesario

---

## P2: Pagos No Procesan

### Síntomas
- Usuarios reportan que no pueden pagar
- Bookings creados pero sin payment
- Wompi webhook no llega

### Pasos de Respuesta

#### 1. Verificar Wompi (5 min)
```bash
# Verificar status de Wompi
# https://status.wompi.co

# Verificar Wompi Dashboard
# https://comercios.wompi.co → Transacciones

# Verificar webhook endpoint
curl -X POST https://hospedasuite.com/api/webhooks/wompi \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

#### 2. Verificar logs (5 min)
```bash
# Coolify → Application → Logs
# Buscar: "wompi", "webhook", "payment"

# Supabase → Logs → Edge Functions
# Buscar: "createBookingAction", "payment"
```

#### 3. Identificar causa

**Si Wompi down**:
- Esperar a que Wompi resuelva
- Comunicar a usuarios que hay delay en pagos

**Si webhook no llega**:
- Verificar `WOMPI_EVENTS_SECRET` en Coolify
- Verificar que endpoint `/api/webhooks/wompi` está accesible
- Re-trigger webhook desde Wompi Dashboard

**Si webhook llega pero falla**:
- Verificar logs de webhook
- Verificar que booking existe en DB
- Verificar que `payment.status = 'pending'`

#### 4. Mitigar

**Si es problema de Wompi**:
- Activar método de pago alternativo (transferencia bancaria)
- Comunicar a usuarios

**Si es problema de webhook**:
- Procesar pagos manualmente:
  ```sql
  UPDATE bookings
  SET status = 'confirmed'
  WHERE id = '...'
    AND payment_status = 'pending';
  ```

#### 5. Post-mortem
- Documentar cuántos pagos afectados
- Documentar tiempo de detección → resolución
- Verificar si se perdieron pagos
- Actualizar este runbook

---

## P2: Performance Degradada (LCP > 10s)

### Síntomas
- LCP > 10 segundos (normal: 2-4s)
- Usuarios reportan lentitud
- Google PageSpeed score < 50

### Pasos de Respuesta

#### 1. Medir (5 min)
```bash
# Google PageSpeed Insights
# https://pagespeed.web.dev/report?url=https://hospedasuite.com/hotel/pachamama

# Verificar Core Web Vitals en PostHog
# https://us.posthog.com → Insights → Core Web Vitals
```

#### 2. Identificar causa

**Si imágenes grandes**:
```bash
# Verificar tamaño de imágenes en Network tab
# Deberían ser < 500KB

# Si son > 1MB, verificar compresión
# Ver src/lib/upload-utils.ts → DEFAULT_COMPRESSION
```

**Si JavaScript pesado**:
```bash
# Verificar bundle size en Network tab
# Buscar archivos JS > 500KB

# Verificar code splitting
# Ver src/app/(ota)/hotel/[slug]/page.tsx
```

**Si base de datos lenta**:
```bash
# Verificar queries lentas en Supabase
# Supabase → Logs → Postgres → Slow queries

# Verificar índices
# Supabase → Database → Indexes
```

#### 3. Mitigar

**Si imágenes grandes**:
```bash
# Re-comprimir imágenes existentes
bun run scripts/compress-existing-images.ts

# O esperar a que nuevas imágenes usen compresión optimizada
```

**Si JavaScript pesado**:
```typescript
// Agregar code splitting
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  ssr: false,
  loading: () => <Skeleton />
});
```

**Si base de datos lenta**:
```sql
-- Agregar índice
CREATE INDEX CONCURRENTLY idx_bookings_hotel_id
ON bookings(hotel_id);
```

#### 4. Post-mortem
- Documentar LCP antes/después
- Documentar causa raíz
- Actualizar este runbook

---

## P3: Feature No-Crítica Rota

### Síntomas
- Modal no abre
- Imagen rota
- Filtro no funciona
- Error en consola pero no bloquea flujo

### Pasos de Respuesta

#### 1. Reproducir (5 min)
- Intentar reproducir el bug
- Verificar en diferentes browsers (Chrome, Firefox, Safari)
- Verificar en mobile

#### 2. Identificar causa
- Verificar consola del browser
- Verificar Network tab (requests fallidos)
- Verificar logs de Coolify

#### 3. Crear issue
```bash
# GitHub → Issues → New Issue
# Título: [BUG] Descripción corta
# Labels: bug, priority:medium
# Descripción:
# - Pasos para reproducir
# - Comportamiento esperado
# - Comportamiento actual
# - Screenshots/videos
# - Browser/OS
```

#### 4. Priorizar
- Si afecta a muchos usuarios → P2
- Si afecta a pocos usuarios → P3
- Si es edge case → P4

#### 5. Resolver
- Asignar a developer
- Crear branch: `fix/descripcion-corta`
- Implementar fix con TDD
- Crear PR
- Deploy a producción

---

## P1: Breach de Seguridad

### Síntomas
- Acceso no autorizado a datos
- API keys expuestas
- SQL injection
- XSS attack

### Pasos de Respuesta

#### 1. Contener (inmediato)
```bash
# Si API key expuesta, revocar inmediatamente
# Supabase → Settings → API → Regenerate keys

# Si usuario comprometido, desactivar
# Supabase → Authentication → Users → Disable user

# Si hay acceso no autorizado, bloquear IP
# Cloudflare → Security → WAF → Block IP
```

#### 2. Investigar (1 hora)
- Verificar logs de acceso
- Identificar datos comprometidos
- Identificar vector de ataque

#### 3. Comunicar (inmediato)
- Notificar a stakeholders
- Si hay datos personales comprometidos, notificar a usuarios (GDPR)
- Contactar abogado si es necesario

#### 4. Remediar (24h)
- Arreglar vulnerabilidad
- Rotar todas las API keys
- Forzar logout de todos los usuarios
- Actualizar dependencias vulnerables

#### 5. Post-mortem (48h)
- Documentar causa raíz
- Documentar datos comprometidos
- Documentar acciones preventivas
- Actualizar políticas de seguridad

---

## Escalación

### Cuándo escalar

| Situación | Escalar a |
|-----------|-----------|
| P1 no resuelto en 30 min | Tech Lead |
| P1 no resuelto en 2 horas | CTO |
| Breach de seguridad | CTO + Legal |
| Pérdida de datos | CTO + Legal |
| Problema con proveedor (Supabase, Wompi) | Tech Lead |

### Contactos de emergencia

| Rol | Nombre | Contacto |
|-----|--------|----------|
| Tech Lead | Antonio Bodas | WhatsApp: +57 ... |
| CTO | Antonio Bodas | WhatsApp: +57 ... |
| Supabase Support | - | support@supabase.io |
| Wompi Support | - | soporte@wompi.co |
| Cloudflare Support | - | support@cloudflare.com |

---

## Post-Mortem Template

```markdown
# Post-Mortem: [Título del Incidente]

**Fecha**: YYYY-MM-DD HH:MM UTC  
**Severidad**: P1/P2/P3/P4  
**Duración**: X horas/minutos  
**Impacto**: X usuarios afectados

## Resumen
[1-2 oraciones describiendo el incidente]

## Timeline
- HH:MM - Incidente detectado
- HH:MM - Investigación iniciada
- HH:MM - Causa identificada
- HH:MM - Mitigación aplicada
- HH:MM - Incidente resuelto

## Causa Raíz
[Descripción técnica de la causa]

## Impacto
- Usuarios afectados: X
- Ingresos perdidos: $X
- Datos comprometidos: X

## Acciones Tomadas
1. [Acción 1]
2. [Acción 2]
3. [Acción 3]

## Acciones Preventivas
1. [Acción 1] - Owner: @username - Due: YYYY-MM-DD
2. [Acción 2] - Owner: @username - Due: YYYY-MM-DD
3. [Acción 3] - Owner: @username - Due: YYYY-MM-DD

## Lecciones Aprendidas
- [Lección 1]
- [Lección 2]
- [Lección 3]
```

---

## Recursos

- **Coolify Dashboard**: http://78.47.36.250:8000
- **Supabase Dashboard**: https://app.supabase.com/project/auaqpomuivfhomlkvhju
- **Sentry**: https://hospedasuite.sentry.io
- **PostHog**: https://us.posthog.com
- **Wompi Dashboard**: https://comercios.wompi.co
- **Cloudflare Dashboard**: https://dash.cloudflare.com
- **Status Pages**:
  - Supabase: https://status.supabase.com
  - Cloudflare: https://www.cloudflarestatus.com
  - Wompi: https://status.wompi.co
