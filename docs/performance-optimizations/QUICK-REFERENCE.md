#  Guía Rápida de Referencia - Fase 2

**Para**: Equipo de desarrollo  
**Tiempo de lectura**: 5 minutos  
**Última actualización**: Julio 28, 2026

---

## 🚀 Comandos Esenciales

### Lighthouse (Performance Audit)
```bash
# Instalar (una vez)
npm run lighthouse:install

# Ejecutar auditoría
npm run lighthouse

# Ver resultados
ls -lh .lighthouseci/
```

### Redis (Rate Limiting)
```bash
# Verificar si Redis está configurado
grep UPSTASH_REDIS_REST_URL .env.local

# Si no está, seguir REDIS_SETUP.md
```

### Tests
```bash
# Ejecutar todos los tests
npm run test

# Tests en modo watch
npm run test:watch

# Type check
npm run typecheck
```

---

## 📊 Métricas Clave

| Métrica | Valor | Cómo verificar |
|---------|-------|----------------|
| **SELECT * queries** | 0 | `grep -r "select('\*')" src/app/actions/` |
| **<img> tags** | 1 | `find src -name "*.tsx" -exec grep -l "<img " {} \;` |
| **Client components** | 121 | `find src -name "*.tsx" -exec grep -l "'use client'" {} \; \| wc -l` |
| **Bundle size** | ~230KB | `npm run build` → ver resumen |
| **Tests passing** | 1399/1408 | `npm run test` |

---

## 🔧 Configuraciones Importantes

### Cache Tags
```typescript
// Invalidar cache cuando cambian datos
import { revalidateTag } from 'next/cache';

revalidateTag(`hotel-images-${hotelId}`, 'max');
```

### ISR (Incremental Static Regeneration)
```typescript
// En page.tsx
export const revalidate = 60; // segundos
export const dynamicParams = true;
```

### Code Splitting
```typescript
import dynamic from 'next/dynamic';

const MyComponent = dynamic(
  () => import('@/components/MyComponent'),
  {
    ssr: false,
    loading: () => <Skeleton />,
  }
);
```

### Dynamic Image Imports
```typescript
// ANTES (carga siempre)
import { motion } from 'framer-motion';

// DESPUÉS (carga on-demand)
const MotionDiv = dynamic(
  () => import('framer-motion').then(mod => mod.motion.div),
  { ssr: false }
);
```

---

##  Archivos Clave

| Archivo | Propósito | Cuándo modificar |
|---------|-----------|------------------|
| `next.config.ts` | Configuración de imágenes | Agregar tamaños/qualities |
| `src/utils/supabase/middleware.ts` | Rate limiting | Ajustar límites |
| `src/lib/redis-rate-limiter.ts` | Módulo Redis | Cambiar lógica de rate limit |
| `lighthouserc.json` | Config Lighthouse | Agregar páginas/thresholds |

---

## 🐛 Troubleshooting Rápido

### Error: "UPSTASH_REDIS_REST_URL is not defined"
```bash
# Solución: Agregar variables en Coolify
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### Error: "Too Many Requests" (429)
```bash
# Causa: Rate limiting activo
# Solución: Esperar 60 segundos o aumentar límite en middleware.ts
```

### Error: "Build failed"
```bash
# Verificar TypeScript
npm run typecheck

# Verificar tests
npm run test
```

### Lighthouse score bajo
```bash
# Ejecutar auditoría detallada
npm run lighthouse

# Revisar recomendaciones en .lighthouseci/*.html
```

---

## 📚 Documentación Completa

| Documento | Ubicación | Cuándo leer |
|-----------|-----------|-------------|
| **Resumen Fase 2** | `docs/performance-optimizations/FASE2-RESUMEN.md` | Visión general |
| **Guía Lighthouse** | `LIGHTHOUSE_GUIDE.md` | Ejecutar auditorías |
| **Setup Redis** | `REDIS_SETUP.md` | Configurar Upstash |
| **Análisis Client Code** | `CLIENT_CODE_ANALYSIS.md` | Planificar migraciones |

---

## ✅ Checklist Pre-Deploy

Antes de hacer deploy a producción:

- [ ] `npm run typecheck` → Sin errores
- [ ] `npm run test` → 1399+ passing
- [ ] `npm run build` → Exitoso
- [ ] Variables de entorno configuradas
- [ ] Redis configurado (opcional pero recomendado)
- [ ] Lighthouse ejecutado localmente

---

## 🎯 Objetivos de Performance

| Métrica | Objetivo | Cómo medir |
|---------|----------|------------|
| **LCP** | < 2.5s | Lighthouse |
| **TBT** | < 200ms | Lighthouse |
| **CLS** | < 0.1 | Lighthouse |
| **Performance Score** | ≥ 85 | Lighthouse |
| **Accessibility Score** | ≥ 90 | Lighthouse |
| **SEO Score** | ≥ 90 | Lighthouse |

---

## 📞 Contacto y Soporte

- **Issues**: GitHub Issues del proyecto
- **Discord Upstash**: https://discord.gg/upstash
- **Next.js Docs**: https://nextjs.org/docs

---

**Versión**: 1.0  
**Mantenido por**: Equipo de desarrollo HospedaSuite
