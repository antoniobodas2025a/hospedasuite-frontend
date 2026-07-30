# 🔐 Configuración de Upstash Redis para Rate Limiting

Este documento explica cómo configurar Upstash Redis para rate limiting distribuido en producción.

##  ¿Por qué Redis?

El rate limiting anterior usaba `Map` en memoria, lo cual tiene problemas:
- ❌ Se limpia en cold starts de Edge Functions
- ❌ No funciona across múltiples instancias
- ❌ No persiste entre deployments
- ❌ Race conditions en operaciones no-atómicas

**Redis soluciona todo esto:**
- ✅ Persistente across cold starts
- ✅ Distribuido (múltiples instancias)
- ✅ Operaciones atómicas
- ✅ Auto-expiry de claves

---

##  Paso 1: Crear Base de Datos en Upstash

1. Ve a [Upstash Console](https://console.upstash.com/)
2. Click en **"Create Database"**
3. Configuración recomendada:
   - **Name**: `hospedasuite-rate-limiter`
   - **Region**: `Frankfurt (eu-central-1)` (más cercano a tus usuarios)
   - **TTL**: `Never expire` (manejamos expiry en código)
   - **Eviction**: `No eviction`
4. Click en **"Create"**

---

## 📋 Paso 2: Obtener Credenciales

1. En la página de tu database, ve a la pestaña **"Details"**
2. Copia las siguientes variables:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

---

## 🔧 Paso 3: Configurar Variables de Entorno

### En Coolify:

1. Ve a tu proyecto en Coolify
2. Click en **"Environment Variables"**
3. Agrega las siguientes variables:

```env
UPSTASH_REDIS_REST_URL=https://your-database-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

4. Click en **"Save"**
5. Redeploy la aplicación

### En Vercel (si aplica):

```bash
vercel env add UPSTASH_REDIS_REST_URL production
vercel env add UPSTASH_REDIS_REST_TOKEN production
```

---

## 🧪 Paso 4: Verificar Configuración

### En desarrollo local:

El sistema usa automáticamente rate limiting en memoria si Redis no está configurado. No necesitas hacer nada.

### En producción:

1. Después del deploy, verifica los logs:
```bash
# En Coolify: ve a "Logs" de tu aplicación
# Busca: "[Rate Limiter] Redis error"
```

2. Si ves errores de Redis, verifica:
   - Variables de entorno configuradas correctamente
   - URL y token copiados correctamente
   - Base de datos de Upstash activa

---

## 📊 Paso 5: Monitorear Rate Limiting

### Ver estado actual de un IP:

```typescript
import { getRateLimitStatus } from '@/lib/redis-rate-limiter';

const status = await getRateLimitStatus('192.168.1.1');
console.log(status);
// { currentCount: 45, maxRequests: 60, windowMs: 60000 }
```

### Resetear rate limit de un IP (admin):

```typescript
import { resetRateLimit } from '@/lib/redis-rate-limiter';

await resetRateLimit('192.168.1.1');
```

---

## 🎯 Configuración Actual

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| **Max Requests** | 60 | Máximo de peticiones por ventana |
| **Window** | 60,000ms | Ventana de 1 minuto |
| **Expiry** | 70s | Auto-cleanup de claves (window + 10s) |

---

## 🔒 Seguridad

- ✅ Operaciones atómicas (no race conditions)
- ✅ Auto-expiry de claves
- ✅ Fallback a memoria si Redis falla
- ✅ Skip rate limiting para localhost en desarrollo
- ✅ Headers `Retry-After` en respuestas 429

---

##  Troubleshooting

### Error: "UPSTASH_REDIS_REST_URL is not defined"

**Causa**: Variables de entorno no configuradas en producción

**Solución**: 
1. Verifica que las variables estén en Coolify/Vercel
2. Redeploy la aplicación
3. Verifica que el deploy usó las variables correctas

### Error: "Connection refused"

**Causa**: URL de Redis incorrecta o base de datos inactiva

**Solución**:
1. Verifica la URL en Upstash Console
2. Asegúrate que la base de datos esté activa
3. Verifica que no haya typos en la URL

### Rate limiting no funciona

**Causa**: Redis está en fallback mode

**Solución**:
1. Revisa logs de la aplicación
2. Busca errores de conexión a Redis
3. Verifica credenciales en Upstash Console

---

## 📈 Métricas y Monitoreo

Upstash proporciona métricas en su console:
- Requests por segundo
- Latencia promedio
- Uso de memoria
- Hit/Miss ratio

Revisa estas métricas regularmente para optimizar la configuración.

---

##  Próximos Pasos

Después de configurar Redis:
1. Monitorea logs por 24 horas
2. Ajusta `maxRequests` si es necesario
3. Considera implementar rate limiting por ruta (API vs páginas)
4. Agrega alertas para rate limits exceeded

---

##  Recursos

- [Upstash Documentation](https://docs.upstash.com/)
- [Upstash Redis SDK](https://github.com/upstash/redis-js)
- [Next.js Middleware Docs](https://nextjs.org/docs/app/building-your-application/routing/middleware)
