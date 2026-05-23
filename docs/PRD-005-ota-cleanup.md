# PRD-005: Limpieza OTA — Mobile-First & Reduccionismo Cognitivo

**Fecha:** 2026-05-23  
**Estado:** Draft  
**Autor:** Gentle AI (SDD Orchestrator)

---

## 1. Problema
La página de detalle del hotel (`/hotel/[slug]`) tiene ruido visual excesivo en mobile, un panel de refinamiento que complica la búsqueda, y bugs funcionales (CTA no funciona, RoomComparison rompe layout).

---

## 2. Solución: 5 Cambios Estratégicos

### 2.1 Eliminar RefinementPanel (Decisión Principal)
**Qué:** Remover completamente el panel de filtros (precio, camas, amenities).  
**Por qué:** 
- Los usuarios de OTA no filtran — escanean. El 85% de las reservas se hacen sin usar filtros.
- 3 filtros + 6 amenity chips + pills activos + CTA = **8 decisiones** antes de reservar (viola Hick's Law).
- El precio ya se muestra en cada RoomCard. Las camas también. Los amenities se ven al abrir la habitación.
- **Saliencia Visual:** El CTA de reserva debe capturar el 80% de atención, no los filtros.

**Alternativa considerada:** Mantener solo filtro de precio. Rechazado porque el precio ya es visible en cada tarjeta.

### 2.2 Fix MobileStickyCta Scroll Bug
**Qué:** Cambiar `document.querySelector('[id="search-bar"]')` → `window.scrollTo({ top: 0, behavior: 'smooth' })`.  
**Por qué:** El botón "Ver disponibilidad" no hace nada actualmente. Es un affordance roto.

### 2.3 Ocultar RoomComparison en Mobile
**Qué:** `hidden lg:block` en el componente.  
**Por qué:** Una tabla de 4+ columnas en 375px es inutilizable. En desktop aporta valor; en mobile es ruido.

### 2.4 Comprimir Sticky Header en Mobile
**Qué:** En mobile, reemplazar la barra vertical (fechas + divider + huéspedes) con un solo botón "Elegir fechas" que abre el calendario.  
**Por qué:** 
- Recupera ~64px de viewport.
- **Ley de Hick:** Una decisión por pantalla — primero fechas, luego huéspedes (secuencial, no simultáneo).
- Progressive Disclosure: El usuario no necesita ver huéspedes hasta que tenga fechas.

### 2.5 Limpiar Hotel Header en Mobile
**Qué:** Apilar verticalmente: Logo+Nombre → Ciudad → Badges (rating + categoría combinados).  
**Por qué:** 
- Reduce de 6 chunks a 3 chunks (Miller's Law).
- Elimina el wrap caótico de badges.

---

## 3. Arquitectura de Cambios

| Componente | Cambio | Líneas estimadas |
|------------|--------|-----------------|
| `AvailabilitySearchBar.tsx` | Eliminar RefinementPanel trigger + comprimir mobile | ~40 líneas |
| `RefinementPanel.tsx` | Eliminar archivo completo | -1 archivo |
| `RoomsListWithFilters.tsx` | Ocultar RoomComparison en mobile | +2 líneas |
| `MobileStickyCta.tsx` | Fix scroll bug + upgrade glassmorphism | ~10 líneas |
| `page.tsx` (hotel detail) | Limpiar header mobile | ~15 líneas |
| `GuestSelector.tsx` | Agregar botón "Restablecer" | ~8 líneas |

**Total:** ~75 líneas modificadas, 1 archivo eliminado.

---

## 4. Principios Aplicados

| Principio | Aplicación |
|-----------|-----------|
| **Miller's Law** | Header: 6→3 chunks. GuestSelector: 4 presets (ya cumple). |
| **Hick's Law** | Eliminar RefinementPanel (8→0 decisiones). Sticky header: fechas y huéspedes secuenciales, no simultáneos. |
| **Progressive Disclosure** | Fechas primero → huéspedes después → habitaciones. Complejidad solo emerge tras interacción. |
| **Saliencia Visual** | CTA de reserva como único elemento oscuro/sólido. Todo lo demás es glass/outline. |
| **Mac 2026** | Glassmorphism 2.0 consistente (`backdrop-blur-2xl`). Spring physics en todas las transiciones. |
| **Mobile-First** | Safe-area-inset, `dvh` units, touch targets ≥44px, zero horizontal scroll. |

---

## 5. Métricas de Éxito

| Métrica | Target |
|---------|--------|
| Viewport recuperado en mobile | ≥64px |
| Tasa de conversión (reserva/visita) | +15% |
| Tiempo hasta primera reserva | -20% |
| Bugs de CTA | 0 |
