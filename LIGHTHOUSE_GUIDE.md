# 🚀 Lighthouse Performance Audit

Este documento explica cómo ejecutar la auditoría de performance con Lighthouse.

##  Prerrequisitos

1. Instalar Lighthouse CLI globalmente:
```bash
npm run lighthouse:install
```

2. Iniciar el servidor de desarrollo:
```bash
npm run dev
```

3. Esperar a que el servidor esté listo (puerto 3000)

## 🔍 Ejecutar Auditoría

```bash
npm run lighthouse
```

Esto ejecutará Lighthouse en las siguientes páginas:
- `/` (Homepage)
- `/hotel/pietra` (Detalle de hotel)
- `/book/pietra` (Reserva)
- `/software` (Landing page)

## 📊 Resultados

Los resultados se guardarán en:
- `.lighthouseci/` (JSON y HTML reports)
- Consola (resumen de métricas)

## 🎯 Métricas Objetivo

| Métrica | Objetivo | Peso |
|---------|----------|------|
| **Performance** | ≥ 85 | 100% |
| **Accessibility** | ≥ 90 | 100% |
| **Best Practices** | ≥ 90 | 100% |
| **SEO** | ≥ 90 | 100% |
| **FCP** | < 2.0s | - |
| **LCP** | < 2.5s | - |
| **TBT** | < 200ms | - |
| **CLS** | < 0.1 | - |

## 🔧 Interpretación de Resultados

### Performance Score
- **90-100**: Excelente ✅
- **50-89**: Necesita mejora ⚠️
- **0-49**: Crítico 

### Métricas Core Web Vitals

**LCP (Largest Contentful Paint)**
- < 2.5s: Bueno ✅
- 2.5-4.0s: Necesita mejora ⚠️
- > 4.0s: Crítico ❌

**TBT (Total Blocking Time)**
- < 200ms: Bueno ✅
- 200-600ms: Necesita mejora ⚠️
- > 600ms: Crítico ❌

**CLS (Cumulative Layout Shift)**
- < 0.1: Bueno ✅
- 0.1-0.25: Necesita mejora ️
- > 0.25: Crítico ❌

## 📈 Comparación Antes/Después

Después de ejecutar la auditoría, compara los resultados con los valores base:

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Performance | TBD | TBD | TBD |
| LCP | TBD | TBD | TBD |
| TBT | TBD | TBD | TBD |
| CLS | TBD | TBD | TBD |

## 🚀 Optimizaciones Implementadas

### Fase 2.0 y 2.1
- ✅ 20 queries SELECT * optimizadas
- ✅ 8 imágenes optimizadas con next/image
- ✅ ISR implementado en /book/[slug]

### Fase 2.2 (Actual)
- ✅ Cache tags en hotel-images.ts
- ✅ Code splitting en OTADashboard.tsx
- ✅ Code splitting en SearchBarUnified.tsx

##  Notas

- Los resultados pueden variar entre ejecuciones
- Ejecutar 3 veces y promediar para resultados confiables
- Usar modo "simulate" para condiciones de red consistentes
- Los thresholds están configurados en `lighthouserc.json`
