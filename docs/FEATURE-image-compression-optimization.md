# Image Compression Optimization

**Fecha**: 2026-08-03  
**Estado**: ✅ Implementado y en producción  
**Commit**: `7ae1994` - perf: optimize image compression for production (TDD)

## Resumen

Optimización de la configuración de compresión de imágenes para lograr estándares de industria (Airbnb/Booking): 70-80% reducción de tamaño sin pérdida visual perceptible.

## Problema Original

La configuración original era demasiado conservadora:
- `DEFAULT_COMPRESSION.maxSizeMB: 1` (muy alto)
- Sin `initialQuality` (usaba 100% por defecto)
- Resultado: 50-60% compresión en vez de 70-80%
- Impacto: Imágenes de 1-2MB en vez de 300-500KB

## Solución Implementada

### 1. DEFAULT_COMPRESSION (imágenes completas)
```typescript
export const DEFAULT_COMPRESSION = {
  maxSizeMB: 0.5,           // Antes: 1
  maxWidthOrHeight: 1920,   // Sin cambio
  useWebWorker: true,       // Sin cambio
  fileType: 'image/webp',   // Sin cambio
  initialQuality: 0.75,     // NUEVO
} as const;
```

**Impacto**: 500KB max (vs 1MB antes)

### 2. THUMBNAIL_COMPRESSION (thumbnails)
```typescript
export const THUMBNAIL_COMPRESSION = {
  maxSizeMB: 0.1,           // Antes: 0.3
  maxWidthOrHeight: 400,    // Antes: 640
  useWebWorker: true,
  fileType: 'image/webp',
  initialQuality: 0.70,     // NUEVO
} as const;
```

**Impacto**: 100KB max (vs 300KB antes)

### 3. CARD_COMPRESSION (nuevo preset)
```typescript
export const CARD_COMPRESSION = {
  maxSizeMB: 0.3,
  maxWidthOrHeight: 800,
  useWebWorker: true,
  fileType: 'image/webp',
  initialQuality: 0.75,
} as const;
```

**Uso**: Vistas de tarjeta intermedias

### 4. Herramientas de validación
```typescript
// Selector de presets
export function getCompressionPreset(preset: CompressionPreset)

// Métricas de efectividad
export function validateCompression(original: File, compressed: File): CompressionMetrics
```

## Cómo Funciona

### Pipeline de compresión
1. Usuario sube imagen (JPG/PNG/WebP)
2. `compressImage()` aplica preset seleccionado
3. `browser-image-compression` comprime con `initialQuality`
4. `validateCompression()` verifica ratio >70%
5. Imagen subida a R2 (Cloudflare CDN)

### Parámetros clave
- **initialQuality**: Calidad WebP (0.75 = 75% calidad, 25% compresión)
- **maxSizeMB**: Límite superior de tamaño
- **maxWidthOrHeight**: Redimensionamiento proporcional

## Cómo Verificar

### 1. Subir imagen nueva
```bash
# En cualquier hotel, subir imagen de galería
# Verificar en Network tab:
# - Tamaño del request PUT a R2
# - Debería ser ~500KB (no 1-2MB)
```

### 2. Verificar en R2
```bash
# Listar archivos en bucket
aws s3 ls s3://hospedasuite-media/hotels/ --endpoint-url https://28cb98bbf915751c7f572efacb8512bf.r2.cloudflarestorage.com

# Verificar tamaño de archivos recientes
# Deberían ser < 500KB
```

### 3. Validar calidad visual
- Abrir imagen en https://hospedasuite.com/hotel/[slug]
- Zoom al 100%
- No debe haber artefactos visibles
- Colores deben ser precisos

## Métricas de Impacto

### Antes
- Tamaño promedio: 1-2MB
- Compresión: 50-60%
- LCP: ~3-4 segundos

### Después (esperado)
- Tamaño promedio: 300-500KB
- Compresión: 70-80%
- LCP: ~2-3 segundos (mejora 25-50%)

### Tests
- 21 tests pasando en `src/lib/__tests__/upload-utils.test.ts`
- Validación de configuración de presets
- Cálculo de métricas de compresión
- Detección de umbrales (óptimo >70%, bajo <60%)

## Limitaciones Conocidas

1. **Solo afecta imágenes nuevas**: Las imágenes existentes en R2 siguen siendo grandes (1-2MB)
2. **No soporta AVIF**: `browser-image-compression` solo soporta JPEG, PNG, WebP, BMP
3. **Next.js Image re-comprime**: Pero es más eficiente subir pre-optimizado

## Próximos Pasos (Opcionales)

### Fase 2: Usar THUMBNAIL_COMPRESSION en componentes
- RoomCard (thumbnails 400px)
- GalleryGrid (tarjetas 800px)
- Impacto: 80% reducción en descargas mobile

### Fase 3: Migrar imágenes existentes
- Script batch para re-comprimir imágenes en R2
- Backup completo antes de migrar
- Migrar por lotes (100 imágenes a la vez)
- Riesgo: Alto (puede corromper imágenes)

## Referencias

- **Código**: `src/lib/upload-utils.ts`
- **Tests**: `src/lib/__tests__/upload-utils.test.ts`
- **Auditoría**: Ver conversación del 2026-08-03
- **Engram**: Observación #117
