# Troubleshooting Común

Guía rápida para problemas frecuentes en HospedaSuite.

## Build & Deploy

### Build falla en Coolify con error de TypeScript
```
Type error: Cannot find module '...'
```

**Causa**: Dependencias desactualizadas o lockfile corrupto  
**Solución**:
```bash
# Local
rm -rf node_modules bun.lock
bun install

# Commit y push
git add bun.lock
git commit -m "fix: regenerate lockfile"
git push origin main
```

### Build falla con "SKIP_TS_CHECK" ignorado
```
Failed to compile.
./src/components/...
Type error: ...
```

**Causa**: Next.js 16 con Turbopack ignora `SKIP_TS_CHECK=1`  
**Solución**: Arreglar el error de TypeScript o usar `ignoreBuildErrors` en `next.config.ts`:
```typescript
typescript: {
  ignoreBuildErrors: process.env.SKIP_TS_CHECK === "1",
}
```

### Deploy stuck en "Building"
**Causa**: Build excede timeout de Coolify (15 min)  
**Solución**:
1. Verificar logs en Coolify Dashboard
2. Si es OOM, aumentar `NODE_OPTIONS="--max-old-space-size=2048"` en Dockerfile
3. Re-trigger deploy desde Coolify

---

## Imágenes

### Imágenes no se suben a R2
```
Error: No se pudo subir la imagen
```

**Causa**: URL presignada expirada o permisos R2 incorrectos  
**Solución**:
1. Verificar variables de entorno:
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_ENDPOINT`
   - `R2_BUCKET_NAME`
2. Verificar CORS en bucket R2 (debe permitir PUT desde dominio)
3. Revisar Network tab para ver status del PUT (403 = permisos, 400 = formato)

### Imágenes muy grandes (>1MB)
**Causa**: Compresión no aplicada o calidad muy alta  
**Solución**:
1. Verificar que `compressImage()` se llama antes de upload
2. Verificar `initialQuality: 0.75` en `DEFAULT_COMPRESSION`
3. Verificar `maxSizeMB: 0.5` en `DEFAULT_COMPRESSION`
4. Verificar en Network tab el tamaño del PUT request

### Imágenes rotas en producción
```
<img src="blob:..." />
```

**Causa**: URL blob: temporal no persistida  
**Solución**:
1. Verificar que imagen se subió a R2 (no solo preview local)
2. Verificar que URL en DB es `https://pub-*.r2.dev/...` (no `blob:`)
3. Si hay blob: URLs en DB, correr script de migración:
   ```bash
   bun run scripts/fix-blob-image-urls.ts
   ```

---

## Base de Datos

### Error de conexión a Supabase
```
Error: failed to connect to Supabase
```

**Causa**: Variables de entorno incorrectas o Supabase down  
**Solución**:
1. Verificar variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Verificar status de Supabase: https://status.supabase.com
3. Probar conexión directa:
   ```bash
   psql $DIRECT_URL
   ```

### Migraciones fallan
```
Error: migration failed: ...
```

**Causa**: Conflicto de schema o migración corrupta  
**Solución**:
1. Verificar estado actual:
   ```bash
   supabase migration list
   ```
2. Si migración está "applied" pero falló:
   ```bash
   supabase migration repair <version> --status reverted
   ```
3. Arreglar migración y re-aplicar:
   ```bash
   supabase db push
   ```

---

## Autenticación

### Usuario no puede loguearse
**Causa**: Token expirado o sesión corrupta  
**Solución**:
1. Limpiar cookies y localStorage
2. Verificar que `SUPABASE_SERVICE_ROLE_KEY` es correcta
3. Verificar logs de Supabase Auth
4. Si es staff, verificar que `staff.status = 'active'`

### Staff login falla con PIN correcto
**Causa**: Staff desactivado o hotel sin subscription activa  
**Solución**:
1. Verificar en DB:
   ```sql
   SELECT s.*, h.subscription_status
   FROM staff s
   JOIN hotels h ON s.hotel_id = h.id
   WHERE s.pin_code = '...';
   ```
2. Si `subscription_status != 'active'`, activar trial o subscription
3. Si `s.status != 'active'`, reactivar staff

---

## Pagos

### Wompi payment falla
```
Error: Payment rejected
```

**Causa**: Tarjeta rechazada, fondos insuficientes, o Wompi down  
**Solución**:
1. Verificar status de Wompi: https://status.wompi.co
2. Verificar logs en Wompi Dashboard
3. Verificar que `WOMPI_PUBLIC_KEY` es correcta
4. Si es sandbox, verificar que `WOMPI_SANDBOX_MODE=true`

### Booking creado pero payment no procesado
**Causa**: Webhook de Wompi no recibido o falló  
**Solución**:
1. Verificar webhook endpoint: `/api/webhooks/wompi`
2. Verificar logs de webhook en Supabase
3. Verificar `WOMPI_EVENTS_SECRET` es correcta
4. Re-trigger webhook desde Wompi Dashboard

---

## Performance

### LCP > 4 segundos
**Causa**: Imágenes grandes, sin optimización, o sin priority  
**Solución**:
1. Verificar que hero image tiene `priority={true}`
2. Verificar tamaño de imágenes (<500KB)
3. Verificar que `next/image` se usa (no `<img>`)
4. Correr Lighthouse y revisar "Optimize Largest Contentful Paint"

### Página lenta en mobile
**Causa**: JavaScript pesado, sin code splitting, o sin lazy loading  
**Solución**:
1. Verificar code splitting en componentes pesados:
   ```typescript
   const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
     ssr: false,
     loading: () => <Skeleton />
   });
   ```
2. Verificar lazy loading en imágenes below-the-fold
3. Verificar que `useSearchParams()` está en parent (no en cada card)

---

## Testing

### Tests fallan con "Cannot find module"
**Causa**: Mocks incorrectos o imports rotos  
**Solución**:
1. Verificar que mocks están en `__mocks__/` o inline
2. Verificar que imports usan path aliases (`@/`)
3. Limpiar cache de Vitest:
   ```bash
   rm -rf node_modules/.vite
   bun test
   ```

### Tests de componentes fallan con "next/image"
**Causa**: `next/image` no funciona en test environment  
**Solución**: Mockear `next/image` en test file:
```typescript
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />
}));
```

---

## Debugging

### Cómo debuggear en producción
1. **Logs de Coolify**: Dashboard → Application → Logs
2. **Logs de Supabase**: Dashboard → Logs → Postgres/Edge Functions
3. **Sentry**: https://hospedasuite.sentry.io
4. **PostHog**: https://us.posthog.com (analytics)
5. **Browser DevTools**: Network tab, Console, Performance

### Cómo debuggear localmente
1. **Server-side**: `console.log()` en Server Components/Actions
2. **Client-side**: Browser DevTools
3. **Database**: `psql $DIRECT_URL` o Supabase Dashboard
4. **API**: `curl` o Postman

---

## Recursos

- **Coolify Dashboard**: http://78.47.36.250:8000
- **Supabase Dashboard**: https://app.supabase.com/project/auaqpomuivfhomlkvhju
- **Sentry**: https://hospedasuite.sentry.io
- **PostHog**: https://us.posthog.com
- **Wompi Dashboard**: https://comercios.wompi.co
- **Cloudflare R2**: https://dash.cloudflare.com → R2
