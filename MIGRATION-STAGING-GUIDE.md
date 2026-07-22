# Guía de Ejecución de Migración en Staging

## Pre-requisitos

✅ Herramienta de migración implementada (PR #5 mergeado)
✅ Tests pasando (1382/1382)
✅ Código en main branch
✅ Deploy automático a staging configurado

## Pasos para Ejecutar la Migración

### 1. Verificar Deploy en Staging

```bash
# Verificar que el último commit está en staging
cd /home/anto/programacion/hospedasuite
git log --oneline -5
```

Esperar a que Coolify complete el deploy (2-5 minutos).

### 2. Acceder a la Herramienta de Migración

1. Abrir navegador
2. Ir a: `https://staging.hospedasuite.com/admin/migration`
   (o la URL de staging que uses)
3. Iniciar sesión con credenciales de administrador
4. Verificar que el panel de migración carga correctamente

### 3. Ejecutar DRY RUN (SIMULACIÓN)

**IMPORTANTE**: Siempre ejecutar dry run primero

1. En el panel de migración, hacer clic en "Ejecutar Simulación"
2. Revisar el reporte generado:
   - ¿Cuántos hoteles se procesarán?
   - ¿Cuántas imágenes se migrarán?
   - ¿Hay errores de validación?
   - ¿Las categorías inferidas parecen correctas?

3. **Ejemplos de lo que debes verificar**:
   ```
   ✅ Hotel "Hotel Bogotá Centro": 15 imágenes → categorías: exterior(3), lobby(2), habitacion(8), bano(2)
   ✅ Hotel "Hotel Medellín Premium": 8 imágenes → categorías: exterior(2), lobby(1), habitacion(4), amenidades(1)
   ⚠️ Hotel "Hotel Test": 3 imágenes → categorías: otros(3) [NOMBRES NO RECONOCIDOS]
   ```

4. Si hay problemas:
   - Documentar qué hoteles tienen categorías "otros" inesperadas
   - Verificar si los nombres de archivo siguen patrones reconocibles
   - Considerar ajustar los patrones en `migrate-hotel-images.ts` si es necesario

### 4. Backup de Base de Datos (OPCIONAL PERO RECOMENDADO)

Antes de ejecutar la migración real:

```bash
# Si tienes acceso a Supabase dashboard:
# 1. Ir a Database → Backups
# 2. Crear backup manual
# 3. Esperar a que complete

# O usar Supabase CLI:
supabase db dump --data-only > backup-before-migration.sql
```

### 5. Ejecutar Migración REAL

**SOLO DESPUÉS DE VALIDAR EL DRY RUN**

1. En el panel de migración, hacer clic en "Ejecutar Migración"
2. Confirmar en el diálogo de confirmación
3. Esperar a que complete (puede tomar 10-60 segundos dependiendo del volumen)
4. Revisar el reporte final:
   - ¿Cuántos hoteles procesados?
   - ¿Cuántas imágenes migradas?
   - ¿Hay errores?

### 6. Validación Post-Migración

#### 6.1 Verificar en Base de Datos

```sql
-- Verificar que hotel_images tiene datos
SELECT 
  h.name as hotel_name,
  COUNT(hi.id) as image_count,
  COUNT(DISTINCT hi.category) as categories_used
FROM hotels h
LEFT JOIN hotel_images hi ON h.id = hi.hotel_id
GROUP BY h.id, h.name
ORDER BY image_count DESC
LIMIT 10;

-- Verificar categorías
SELECT 
  category,
  COUNT(*) as count
FROM hotel_images
GROUP BY category
ORDER BY count DESC;
```

#### 6.2 Verificar en la UI

1. Ir a la página de un hotel migrado en staging
2. Verificar que las imágenes aparecen agrupadas por categoría
3. Verificar que el orden es correcto (exterior primero, luego lobby, etc.)
4. Verificar que no hay imágenes duplicadas

#### 6.3 Verificar Backward Compatibility

```sql
-- Verificar que gallery_urls aún existe (no se eliminó)
SELECT 
  name,
  gallery_urls IS NOT NULL as has_legacy_field,
  ARRAY_LENGTH(gallery_urls, 1) as legacy_count
FROM hotels
WHERE gallery_urls IS NOT NULL
LIMIT 5;
```

### 7. Documentar Resultados

Crear un reporte con:
- Fecha y hora de ejecución
- Número de hoteles procesados
- Número de imágenes migradas
- Distribución de categorías
- Errores encontrados (si los hay)
- Screenshots de la UI validando el resultado

## Rollback Plan (Si Algo Sale Mal)

### Opción 1: Restaurar Backup

```bash
# Si hiciste backup antes:
supabase db push --restore backup-before-migration.sql
```

### Opción 2: Limpiar hotel_images

```sql
-- Eliminar todas las imágenes migradas (reversible)
TRUNCATE TABLE hotel_images RESTART IDENTITY;

-- Las imágenes volverán a cargarse desde gallery_urls vía fallback
```

### Opción 3: Desactivar Feature Flag

```typescript
// En src/lib/flags.ts, cambiar temporalmente:
export async function categorizedGalleryFlag(): Promise<boolean> {
  return false; // Desactivar temporalmente
}
```

## Métricas de Éxito

La migración es exitosa si:
- ✅ 100% de hoteles con gallery_urls tienen entradas correspondientes en hotel_images
- ✅ Las categorías inferidas son razonables (>80% no son "otros")
- ✅ La UI muestra las imágenes agrupadas correctamente
- ✅ No hay errores en los logs de staging
- ✅ El tiempo de carga de páginas no se degradó

## Soporte

Si encuentras problemas:
1. Revisar logs de Supabase (Database → Logs)
2. Revisar logs de Vercel/Coolify
3. Verificar que R2 está accesible
4. Contactar al equipo de desarrollo

---

**Última actualización**: 2026-07-21
**Versión del código**: Commit e4c781e
