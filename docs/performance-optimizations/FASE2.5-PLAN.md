# 🚀 Fase 2.5: Performance Crítica - Plan de Acción

**Fecha**: Julio 30, 2026  
**Objetivo**: Performance 48 → 75+, LCP 11.7s → 4.0s, TBT 650ms → 300ms

---

## 📊 Diagnóstico Actual (Homepage)

| Métrica | Actual | Objetivo | Gap |
|---------|--------|----------|-----|
| **Performance** | 43/100 | 75+ | +32 pts |
| **LCP** | 11.7s | 4.0s | -7.7s |
| **TBT** | 650ms | 300ms | -350ms |
| **FCP** | 4.6s | 2.5s | -2.1s |

---

## 🔍 Causas Raíz Identificadas

### 1. LCP: Imagen de Hotel Card (11.7s)
**Elemento**: `img.object-cover` en hotel card  
**URL**: `https://pub-75809b4a12c441b891f9b5a2316c2cc2.r2.dev/onboarding/...`  
**Problema**: Imagen cargando muy tarde, probablemente sin `priority` ni `preload`

### 2. TBT: JavaScript Bloqueando (650ms)
**Chunks problemáticos**:
- `99003f2460b94ec6.js` - 286ms
- `47b6b961280a38f0.js` - 525ms (acumulado)
- Google Tag Manager - 192ms

### 3. FCP: Render Inicial Lento (4.6s)
**Causa**: CSS bloqueante (40KB, 806ms) + JavaScript inicial

---

## 🎯 Plan de Optimización (Priorizado por Impacto)

### 🔴 PRIORIDAD 1: Optimizar LCP (Impacto: ALTO - 4-5s mejora)

#### 1.1. Agregar `priority` a imagen LCP
**Archivo**: `src/components/ota/HotelCard.tsx` o similar  
**Cambio**: Agregar `priority` prop a `<Image>` del hotel card principal

```tsx
<Image
  src={hotel.main_image_url}
  alt={hotel.name}
  fill
  priority  // ← AGREGAR ESTO
  sizes="(max-width: 768px) 100vw, 50vw"
  quality={85}
/>
```

#### 1.2. Preload de imagen LCP en `<head>`
**Archivo**: `src/app/layout.tsx`  
**Cambio**: Agregar `<link rel="preload">` para la imagen hero

```tsx
<head>
  <link
    rel="preload"
    as="image"
    href="/api/og-image"  // o la URL de la imagen principal
    fetchpriority="high"
  />
</head>
```

#### 1.3. Optimizar tamaños de imagen
**Archivo**: Componente de hotel card  
**Cambio**: Usar `sizes` más agresivos para mobile

```tsx
<Image
  src={...}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  // en lugar de solo "100vw"
/>
```

---

### 🟠 PRIORIDAD 2: Reducir TBT (Impacto: MEDIO - 200-300ms mejora)

#### 2.1. Code Splitting de Google Tag Manager
**Archivo**: `src/app/layout.tsx` o componente de GTM  
**Cambio**: Cargar GTM de forma asíncrona con `lazy`

```tsx
// ANTES: GTM carga inmediatamente
<GoogleTagManager gtmId="GTM-W3VSWFMZ" />

// DESPUÉS: GTM carga después del render inicial
const GTM = dynamic(() => import('@/components/GoogleTagManager'), {
  ssr: false,
  loading: () => null,
});
```

#### 2.2. Identificar y split de chunks pesados
**Acción**: Analizar qué contienen los chunks problemáticos

```bash
# Instalar bundle analyzer
npm install --save-dev @next/bundle-analyzer

# Ejecutar análisis
ANALYZE=true npm run build
```

#### 2.3. Lazy loading de componentes no críticos
**Candidatos**:
- Mapas (Leaflet) - 465 líneas
- Galerías complejas - 387 líneas
- Formularios de booking - 301 líneas

---

### 🟡 PRIORIDAD 3: Optimizar FCP (Impacto: MEDIO - 1-2s mejora)

#### 3.1. Inline CSS crítico
**Archivo**: `next.config.ts` o plugin de CSS  
**Cambio**: Extraer CSS crítico para inline en `<head>`

#### 3.2. Reducir CSS bloqueante
**Archivo**: `globals.css`  
**Cambio**: Eliminar CSS no usado, minificar

```bash
# Analizar CSS no usado
npm install --save-dev purgecss
```

#### 3.3. Preconnect a dominios externos
**Archivo**: `src/app/layout.tsx`  
**Cambio**: Agregar `preconnect` para R2, Supabase, GTM

```tsx
<head>
  <link rel="preconnect" href="https://pub-75809b4a12c441b891f9b5a2316c2cc2.r2.dev" />
  <link rel="preconnect" href="https://auaqpomuivfhomlkvhju.supabase.co" />
  <link rel="preconnect" href="https://www.googletagmanager.com" />
</head>
```

---

## 📋 Checklist de Implementación

### Sprint 1: LCP (2-3 horas)
- [ ] 1.1. Agregar `priority` a imagen LCP
- [ ] 1.2. Preload de imagen en `<head>`
- [ ] 1.3. Optimizar `sizes` de imágenes
- [ ] Test: Ejecutar Lighthouse y verificar LCP < 6s

### Sprint 2: TBT (2-3 horas)
- [ ] 2.1. Code splitting de GTM
- [ ] 2.2. Bundle analyzer para identificar chunks
- [ ] 2.3. Lazy loading de 3 componentes pesados
- [ ] Test: Ejecutar Lighthouse y verificar TBT < 400ms

### Sprint 3: FCP (1-2 horas)
- [ ] 3.1. Preconnect a dominios externos
- [ ] 3.2. Optimizar CSS crítico
- [ ] Test: Ejecutar Lighthouse y verificar FCP < 3s

---

##  Objetivos por Sprint

| Sprint | Métrica | Antes | Después | Mejora |
|--------|---------|-------|---------|--------|
| **Sprint 1** | LCP | 11.7s | 6.0s | -49% |
| **Sprint 2** | TBT | 650ms | 400ms | -38% |
| **Sprint 3** | FCP | 4.6s | 3.0s | -35% |
| **Total** | Performance | 43 | 65+ | +22 pts |

---

## 📊 Métricas de Éxito

### Mínimo Aceptable:
- Performance: ≥ 65/100
- LCP: < 6.0s
- TBT: < 400ms
- FCP: < 3.0s

### Objetivo Ideal:
- Performance: ≥ 75/100
- LCP: < 4.0s
- TBT: < 300ms
- FCP: < 2.5s

---

## 🚀 Ejecución Inmediata

**Empezamos con Sprint 1 (LCP)** porque:
1. ✅ Mayor impacto (4-5s de mejora)
2. ✅ Cambios simples (agregar props)
3. ✅ Resultados inmediatos

**Primeros 30 minutos**:
1. Identificar componente de hotel card
2. Agregar `priority` a imagen principal
3. Agregar `preload` en layout
4. Test rápido con Lighthouse

---

**¿Empezamos con Sprint 1?**
