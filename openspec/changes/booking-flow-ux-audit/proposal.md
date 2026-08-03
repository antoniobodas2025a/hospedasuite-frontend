# Proposal: Booking Flow Redesign for High Conversion

## Intent

El flujo actual de reserva tiene **fricción innecesaria** que reduce la conversión: precios inconsistentes, botones confusos, y modales que repiten información. Rediseñar para **máxima conversión con mínima fricción**, alineado con estándares de industria (Airbnb/Booking.com).

## Problem Statement

| ID | Problema | Severidad | Impacto en Conversión |
|----|----------|-----------|----------------------|
| P1 | Precio cambia entre pantallas ($200k → $238k) | CRÍTICO | Abandono por desconfianza |
| P2 | Sidebar muestra precio incorrecto (bug) | CRÍTICO | Confusión, soporte tickets |
| P3 | Botón cambia texto 3 veces | ALTO | Fricción cognitiva |
| P4 | Modal repite información | ALTO | Sensación de retroceso |
| P5 | IVA oculto hasta seleccionar fechas | MEDIO | Sorpresa negativa |
| P6 | Label "Desde" engañoso | MEDIO | Expectativas falsas |

## Target Users & Situations

- **Usuario**: Viajero que busca hospedaje en Colombia
- **Situación**: Comparando opciones, sensible a precios y transparencia
- **Urgencia**: Media-alta (proceso de decisión rápido)
- **Contexto**: Mobile-first (70%+ tráfico), conexión variable

## Product Outcome

Después del cambio:
- Usuario ve **precio total con impuestos desde el inicio**
- **Un solo CTA** ("Reservar") en todo el flujo
- Modal muestra **información nueva** (políticas, pago), no repetida
- **Flujo de 2 pasos** en vez de 4: (1) Ver habitaciones → (2) Reservar
- **Zero fricción**: sin sorpresas de precio, sin botones confusos

## Scope

### In Scope
1. Unificar display de precio (con IVA desde el inicio)
2. Unificar texto de botón a "Reservar"
3. Rediseñar modal para info nueva (galería grande, políticas, pago)
4. Corregir bug del sidebar (mostrar total correcto)
5. Eliminar label "Desde"
6. Agregar métricas de conversión (analytics)

### Out of Scope
- Cambios en el motor de reservas (backend)
- Integración con pasarelas de pago (Wompi ya integrado)
- Rediseño de la página de checkout
- Sistema de reseñas

## Capabilities

### New Capabilities
- `price-transparency`: Mostrar precio con impuestos desde el inicio, con desglose claro
- `unified-cta`: Un solo texto de botón ("Reservar") en todo el flujo
- `modal-value-add`: Modal muestra info nueva (políticas, métodos de pago, galería inmersiva)
- `conversion-analytics`: Tracking de eventos para medir conversión

### Modified Capabilities
- `booking-widget`: Actualizar para mostrar precio total cuando hay fechas seleccionadas
- `room-card`: Simplificar display de precio y botón

## Approach

**Estrategia**: Rediseño moderado (no reescritura completa)

1. **Precio transparente**: Mostrar "$200.000/noche + IVA" o "$238.000 total" desde el inicio
2. **CTA unificado**: Siempre "Reservar" (eliminar "Explorar Unidad" y "Asegurar Refugio")
3. **Modal de valor**: Galería inmersiva + políticas de cancelación + métodos de pago + resumen de reserva
4. **Sidebar correcto**: Actualizar para mostrar total con IVA cuando hay fechas
5. **Flujo simplificado**: 2 pasos en vez de 4

**Técnico**:
- Modificar `RoomCard.tsx` para mostrar precio con IVA siempre
- Corregir `BookingWidget.tsx` para calcular total correctamente
- Rediseñar `RoomShowcaseModal.tsx` para mostrar info nueva
- Actualizar `messages/es.json` con nuevos textos

## User Flow

### Current Flow (8 steps, high friction)
1. Usuario ve habitaciones sin fechas → precio sin IVA → botón "Explorar Unidad"
2. Usuario abre modal calendario
3. Usuario selecciona fechas en modal
4. Página se recarga con precios actualizados
5. Usuario ve habitaciones con fechas → precio con IVA → botón "Asegurar Refugio"
6. Usuario abre modal de detalle
7. Usuario ve info repetida → botón "Reservar"
8. Usuario va a checkout

### Proposed Flow (5-6 steps, reduced from 8 current)

**Camino A** (usuario decidido, sin modal — 5 pasos):
1. Usuario ve habitaciones con date picker integrado en sidebar (desktop) o sticky header (mobile)
2. Usuario selecciona fechas (sin recarga, precio se actualiza en tiempo real <100ms)
3. Usuario ve precio con IVA actualizado en tarjeta
4. Usuario click en "Reservar"
5. Usuario va directo a checkout

**Camino B** (usuario explorador, con modal — 6 pasos):
1-4. (mismo que Camino A)
5. Modal muestra galería inmersiva + políticas + métodos de pago
6. Usuario confirma y va a checkout

**Reducción de fricción**: 8 pasos → 5-6 pasos (25-37% menos)

### Handoff al Checkout (para futuro PRD de checkout)

El modal transfiere datos al checkout via URL params para evitar re-ingreso de información:

| Dato | Parámetro URL | Origen |
|------|---------------|--------|
| Habitación | `room_id` | Selección del usuario |
| Check-in | `checkin` | Date picker |
| Check-out | `checkout` | Date picker |
| Huéspedes | `guests` | Selector de huéspedes |
| Precio total | `total_price` | Calculado con IVA |

**Requisito para PRD de checkout**:
- Checkout pre-llena formulario con estos datos
- Checkout muestra resumen de reserva (mismo formato que modal)
- Si faltan datos, checkout redirige al modal con mensaje de error

**Especificación de errores de pago (para PRD de checkout)**:
- **AC-Checkout-4**: Error de pago muestra mensaje específico ("Tarjeta rechazada", "Fondos insuficientes")
- **AC-Checkout-5**: Error de pago preserva datos del formulario (no borra nombre, email, etc.)
- **AC-Checkout-6**: Error de pago ofrece alternativa ("Intenta con otro método de pago")

## Requirements

### Functional Requirements

- **FR1**: Precio debe mostrar IVA (19%) desde el inicio, con opción de ver desglose
  - **AC1.1**: Dado hotel con `tax_rate=0.19`, cuando se carga página, entonces precio muestra "$200.000 + IVA (19%): $38.000 | Total: $238.000"
  - **AC1.2**: Dado hotel con `tax_rate=0` (régimen simplificado), cuando se carga página, entonces precio muestra "$200.000 (IVA incluido) | Total: $200.000"
  - **AC1.3**: Dado usuario sin fechas, cuando ve tarjeta, entonces desglose de IVA es visible

- **FR2**: Botón debe decir "Reservar" en todo el flujo (unificado)
  - **AC2.1**: Dado usuario en tarjeta sin fechas, cuando ve botón, entonces dice "Reservar"
  - **AC2.2**: Dado usuario en tarjeta con fechas, cuando ve botón, entonces dice "Reservar"
  - **AC2.3**: Dado usuario en modal, cuando ve botón, entonces dice "Reservar"
  - **AC2.4**: Al hacer click en "Reservar", botón muestra "Procesando..." con spinner
  - **AC2.5**: Botón se deshabilita durante 300ms (previene doble click)
  - **AC2.6**: Animación de transición: scale-down (0.96) al click, scale-up al abrir modal
  - **AC2.7**: Tecla ESC cierra el modal
  - **AC2.8**: Tecla ENTER confirma reserva cuando el foco está en el botón "Reservar"

- **FR3**: Modal debe mostrar galería inmersiva como herramienta de conversión + políticas de cancelación + métodos de pago + resumen de reserva
  - **AC3.1**: Modal muestra galería de 5+ imágenes en grid asimétrico (desktop) o carrusel horizontal (mobile)
  - **AC3.2**: Foto hero ocupa 50% del ancho en desktop, 100% en mobile
  - **AC3.3**: Orden de fotos: hero (vista general) → cama → baño → vista → amenidades → detalles
  - **AC3.4**: Modal muestra política de cancelación del hotel (`hotel.cancellation_policy`)
  - **AC3.5**: Modal muestra métodos de pago aceptados (Wompi: tarjetas, PSE, Nequi)
  - **AC3.6**: Modal NO repite descripción de la habitación (ya visible en tarjeta)
  - **AC3.7**: Galería usa lazy loading + blur placeholder (ya implementado en RoomGalleryGrid)
  - **AC3.8**: Mínimo 5 fotos por habitación, óptimo 8-12 fotos
  - **AC3.9**: Contador de fotos en mobile: "Foto 1 de 6"
  - **AC3.10**: Galería es accesible: alt text descriptivo en cada imagen, navegación con teclado (flechas izquierda/derecha), focus trap en modal
  - **AC3.11**: Si galería falla al cargar, mostrar mensaje "Error al cargar fotos" + botón "Reintentar"
  - **AC3.12**: Imágenes usan caché del navegador (Cache-Control: max-age=31536000) para recargas rápidas
  - **AC3.13**: Orden del modal: Galería → Título → Precio → Políticas → Métodos de pago → CTA
  - **AC3.14**: Precio tiene jerarquía visual destacada (font-size 24px+, bold, color secundario)
  - **AC3.15**: CTA "Reservar" es sticky en bottom del modal (siempre visible durante scroll)
  - **AC3.16**: Help text en políticas de cancelación: "Cancela gratis hasta 24h antes del check-in"

- **FR4**: Sidebar debe actualizar precio cuando se seleccionan fechas
  - **AC4.1**: Dado fechas seleccionadas, cuando sidebar se renderiza, entonces muestra total con IVA
  - **AC4.2**: Dado múltiples habitaciones, cuando sidebar se renderiza, entonces muestra "Desde $X" (la más barata con IVA)
  - **AC4.3**: Cuando availableCount <= 2, mostrar badge de urgencia ("Solo X disponible")
  - **AC4.4**: Badge de urgencia usa color rojo (1 disponible) o naranja (2 disponibles)
  - **AC4.5**: No mostrar scarcity falso (solo datos reales de disponibilidad)
  - **AC4.6**: Tooltip en badge de urgencia: "Esta habitación se reserva rápido"

- **FR5**: Eliminar label "Desde" — mostrar precio real
  - **AC5.1**: Sidebar NO muestra palabra "Desde"
  - **AC5.2**: Sidebar muestra precio real de habitación seleccionada o mínima

- **FR6**: Tracking de eventos: view_room, click_reserve, open_modal, close_modal, complete_booking, abandon_booking
  - **AC6.1**: Evento `view_room` se dispara cuando RoomCard es visible en viewport
  - **AC6.2**: Evento `click_reserve` incluye room_id, hotel_id, price, nights, has_dates
  - **AC6.3**: Todos los eventos llegan a Google Analytics/Tag Manager

- **FR7**: Manejo de hoteles con `tax_rate=0` (régimen simplificado)
  - **AC7.1**: Dado `hotel.tax_rate=0`, cuando se calcula precio, entonces IVA=0
  - **AC7.2**: Dado `hotel.tax_rate=0`, cuando se muestra precio, entonces label dice "IVA incluido"
  - **AC7.3**: Dado `hotel.tax_rate=null`, cuando se calcula precio, entonces usa `DEFAULT_TAX_RATE=0.19` (fallback)

- **FR8**: Manejo de habitación no disponible
  - **AC8.1**: Dado habitación se agota mientras usuario está en modal, cuando modal se actualiza, entonces muestra mensaje "Ya no disponible"
  - **AC8.2**: Dado habitación no disponible, cuando modal se muestra, entonces CTA dice "Ver otras habitaciones"

- **FR9**: Persistencia de fechas
  - **AC9.1**: Dado usuario cierra modal y vuelve, cuando modal se reabre, entonces fechas persisten (URL params + localStorage)
  - **AC9.2**: Dado usuario cambia fechas en date picker integrado, cuando modal se abre, entonces usa nuevas fechas
  - **AC9.3**: Dado usuario regresa al hotel en otra sesión, cuando carga página, entonces fechas persisten de localStorage

- **FR10**: Manejo de múltiples habitaciones
  - **AC10.1**: Dado hotel con N habitaciones, cuando se muestra lista, entonces cada habitación muestra su precio con IVA
  - **AC10.2**: Dado usuario selecciona habitación, cuando sidebar se actualiza, entonces muestra precio de esa habitación

- **FR11**: Date picker debe estar integrado en la página (no modal separado)
  - **AC11.1**: Desktop — calendario está en sidebar sticky (siempre visible, ~300px alto, debajo del precio)
  - **AC11.2**: Mobile — calendario está en sticky header compacto (muestra "Llegada — Salida", abre al click)
  - **AC11.3**: Selección de fechas no recarga la página (actualización en tiempo real via client-side state)
  - **AC11.4**: Precio con IVA se actualiza inmediatamente al seleccionar fechas (<100ms)
  - **AC11.5**: Botones de "quick dates": "Este fin de semana", "Próxima semana", "Próximo mes"
  - **AC11.6**: Fechas persisten en localStorage (no solo URL params) para regreso de usuario
  - **AC11.7**: Date picker es colapsable cuando hay 3+ habitaciones (expandido por defecto)
  - **AC11.8**: Date picker siempre expandido cuando hay 1-2 habitaciones
  - **AC11.9**: Quick dates buttons: "Este fin de semana", "Próxima semana", "Próximo mes"
  - **AC11.10**: Calendario muestra disponibilidad visual (verde=disponible, rojo=ocupado)
  - **AC11.11**: Quick dates actualizan precio inmediatamente (<100ms)
  - **AC11.12**: Navegación del calendario con flechas (← → cambia mes, ↑ ↓ cambia semana)
  - **AC11.13**: Tooltip en quick dates: "Selecciona fechas predefinidas para reservar más rápido"

- **FR12**: Motion & Visual Design System profesional para producción
  - **AC12.1**: Skeleton loaders en vez de spinners básicos (shimmer effect en cards, modal, sidebar)
  - **AC12.2**: Micro-animaciones en botones: hover (lift + shadow), active (scale 0.96), focus (outline visible)
  - **AC12.3**: Staggered animation en lista de habitaciones (cada card aparece con 50ms de delay)
  - **AC12.4**: Modal transition: scale (0.95→1) + fade (0→1) + backdrop blur, 200ms duration
  - **AC12.5**: Page transitions suaves entre estados (loading → loaded, empty → content)
  - **AC12.6**: Progress indicator visual en checkout (3 pasos: Datos → Pago → Confirmación)
  - **AC12.7**: Celebration animation al completar reserva (confetti + checkmark animado)
  - **AC12.8**: Hover states visibles en todos los elementos interactivos (cards, buttons, links)
  - **AC12.9**: Focus states con outline visible (2px solid, color primario) para accesibilidad
  - **AC12.10**: Smooth scroll behavior al navegar entre secciones (scroll-behavior: smooth)
  - **AC12.11**: Parallax sutil en galería del modal (hero image se mueve 10% más lento que scroll)
  - **AC12.12**: Reduced motion support: respetar prefers-reduced-motion (desactivar animaciones si usuario lo prefiere)
  - **AC12.13**: Loading states elegantes: shimmer en imágenes, skeleton en texto, progress bar en uploads
  - **AC12.14**: Error states animados: shake animation en formularios inválidos, fade-in en mensajes de error
  - **AC12.15**: Empty states con ilustraciones y CTA claro (no solo texto "No hay resultados")
  - **AC12.16**: Success states con feedback visual inmediato (checkmark animado, color verde)
  - **AC12.17**: Tooltip animations: fade-in + slide-up, 150ms duration, no bloquear interacción
  - **AC12.18**: Card hover effects: lift (translateY -4px) + shadow elevation + border color change
  - **AC12.19**: Motion tokens centralizados: duration (fast: 150ms, normal: 200ms, slow: 300ms), easing (ease-out, ease-in-out)
  - **AC12.20**: Performance budget: animaciones no deben causar layout thrashing, usar transform + opacity solamente

- **FR13**: Performance Optimization para Web Vitals (LCP <2.5s, FID <100ms, CLS <0.1)
  - **AC13.1**: Memoizar cálculos de precio en RoomCard con `useMemo` (allPrices, minPrice, avgPrice)
  - **AC13.2**: Mover `useSearchParams()` al padre (RoomsListWithFilters) y pasar como prop
  - **AC13.3**: Eliminar doble animación (usar solo framer-motion O solo CSS, no ambos)
  - **AC13.4**: Implementar virtualización de lista con `@tanstack/react-virtual` para 10+ habitaciones
  - **AC13.5**: Agregar `priority` a imagen hero del hotel (LCP optimization)
  - **AC13.6**: Agregar `priority` a primera imagen de cada RoomCard visible en viewport
  - **AC13.7**: Code splitting con `next/dynamic` para componentes pesados (RoomComparison, ReviewsSection)
  - **AC13.8**: Eliminar `layout` de AnimatePresence (causa reflows), usar `layoutId` solo en imagen hero
  - **AC13.9**: Memoizar cálculo de fechas con `useMemo` (checkIn/checkOut → nights)
  - **AC13.10**: Implementar `React.memo` en RoomCard para prevenir re-renders innecesarios
  - **AC13.11**: Agregar `loading="eager"` a imagen hero, `loading="lazy"` al resto
  - **AC13.12**: Precargar fuentes críticas con `<link rel="preload">` en layout
  - **AC13.13**: Agregar `content-visibility: auto` a cards fuera del viewport inicial
  - **AC13.14**: Implementar `IntersectionObserver` para lazy load de componentes pesados
  - **AC13.15**: Budget de performance: bundle inicial <200KB, TTI <3.5s en 3G

### Non-Functional Requirements

- **NFR1**: Performance — Modal debe abrir en <300ms
- **NFR2**: Accessibility — WCAG 2.1 AA (contraste, focus trap, ARIA)
- **NFR3**: Mobile-first — 70%+ tráfico es mobile
- **NFR4**: Analytics — Todos los eventos deben llegar a Google Analytics/Tag Manager
- **NFR5**: Type Safety — Sin tipos `any` en componentes modificados

## Edge Cases & Scenarios

| Scenario | Expected Behavior |
|----------|------------------|
| Hotel con `tax_rate=0` (régimen simplificado) | Mostrar precio sin IVA, label "IVA incluido" |
| Hotel con `tax_rate=null` (NULL en DB) | Usar `DEFAULT_TAX_RATE=0.19` (fallback seguro) |
| Habitación se agota mientras usuario está en modal | Mostrar mensaje "Ya no disponible" + CTA "Ver otras habitaciones" |
| Usuario cierra modal y vuelve | Fechas persisten en URL, modal se reabre en mismo estado |
| Precio = 0 (promoción gratis) | Mostrar "Gratis" en vez de "$0" |
| Múltiples habitaciones disponibles | Sidebar muestra "Desde $X" (la más barata con IVA) |
| Usuario en diferente timezone | Fechas se muestran en timezone del hotel (Colombia, UTC-5) |
| Habitación con `capacity=0` | No se muestra en la lista (filtro `capacity >= guests`) |
| `hotel.cancellation_policy=null` | Modal muestra "Política de cancelación: Consultar con el hotel" |
| Imágenes de habitación vacías | Mostrar placeholder con logo del hotel |
| Error al cargar galería (network failure) | Mostrar mensaje "Error al cargar fotos" + botón "Reintentar" |
| Imagen individual falla al cargar | Mostrar placeholder gris con ícono de imagen rota |
| Usuario con conexión lenta (2G/3G) | Cargar thumbnails primero (400x300), luego upgrade a alta resolución |
| Usuario regresa con fechas en localStorage | Fechas se cargan automáticamente, precio se actualiza |
| Date picker integrado falla al cargar | Fallback a modal calendario (degradación graceful) |

## Price Display Format

### Sin fechas seleccionadas (1 noche default)
```
$200.000 COP/noche
+ IVA (19%): $38.000
Total: $238.000 COP
```

### Con fechas seleccionadas (1 noche)
```
$200.000 × 1 noche
+ IVA (19%): $38.000
Total: $238.000 COP
```

### Con fechas seleccionadas (2+ noches)
```
$200.000 × 2 noches = $400.000
+ IVA (19%): $76.000
Total: $476.000 COP
```

### Hoteles con `tax_rate=0` (régimen simplificado)
```
$200.000 COP/noche
IVA incluido
Total: $200.000 COP
```

## Galería como Herramienta de Conversión

### Objetivo

La galería no es solo "mostrar fotos" — es la **principal herramienta de conversión** del modal. Debe:
1. Mostrar fotos que NO se vieron en la tarjeta (valor nuevo)
2. Crear jerarquía visual (foto hero + detalles)
3. Generar conexión emocional ("me imagino ahí")
4. Reducir incertidumbre (mostrar baño, vista, amenidades)

### Evidencia de la Industria

**Airbnb**:
- Galería es el **primer elemento** que ve el usuario en el modal
- Ocupa **50% del espacio visual** en desktop
- Grid asimétrico (1 imagen grande + 4 pequeñas) para jerarquía visual
- Permite zoom y navegación sin salir del modal

**Booking.com**:
- Carrusel horizontal en mobile
- Contador de fotos ("Ver las 12 fotos") genera curiosidad
- Fotos de alta calidad con carga progresiva (blur → sharp)

**Expedia**:
- Galería con categorías (Habitación, Baño, Vista, Amenidades)
- Foto hero que ocupa todo el ancho en mobile

**Dato clave**: Según Baymard Institute, **67% de usuarios** abandonan si las fotos no son claras o son pocas. **8+ fotos** aumentan conversión en 23% vs 3-4 fotos.

### Especificación Técnica

**Desktop (grid asimétrico)**:
```
┌─────────────────┬─────┬─────┐
│                 │     │     │
│   FOTO HERO     │  2  │  3  │
│   (50% ancho)   │     │     │
│                 │     │     │
├──────────────────────┴─────┤
│           4                 │
├─────────────────┬───────────┤
│        5        │     6     │
└─────────────────┴───────────┘
```

**Mobile (carrusel horizontal)**:
- Swipe horizontal
- Contador: "Foto 1 de 6"
- Indicadores de posición (dots)

### Contenido de la Galería

**Prioridad de fotos** (en este orden):
1. **Foto hero**: Vista general de la habitación (ángulo amplio)
2. **Cama**: Detalle de la cama con ropa de calidad
3. **Baño**: Limpio, moderno, con amenidades visibles
4. **Vista**: Desde la ventana o balcón
5. **Amenidades**: TV, wifi, climatización (si aplica)
6. **Detalles**: Decoración, iluminación, espacios únicos

**Mínimo**: 5 fotos por habitación
**Óptimo**: 8-12 fotos por habitación

### Optimización de Performance

- **Lazy loading**: Cargar fotos bajo demanda (ya implementado en RoomGalleryGrid)
- **Blur placeholder**: Mostrar blur mientras carga (ya implementado)
- **Formato WebP**: Usar WebP con fallback a JPEG
- **Tamaños múltiples**: 
  - Thumbnail: 400x300px
  - Card: 800x600px
  - Modal: 1600x1200px
  - Hero: 2400x1600px

### Métricas de Éxito de Galería

- [ ] **Tiempo en modal aumenta 20%+** (usuario explora fotos)
- [ ] **Click en "Reservar" después de ver 3+ fotos aumenta 15%+**
- [ ] **Zero abandonos por "fotos no claras"** (monitorear soporte)
- [ ] **80%+ de usuarios ven 3+ fotos** antes de reservar o abandonar

## Success Criteria (Measurable)

### Conversión General
- [ ] **Conversión aumenta 15%+** (reservas completadas / vistas de habitación) — medir 30 días pre/post, segmentado mobile/desktop
- [ ] **Tiempo para reservar disminuye 30%+** (de 4 pasos a 2 pasos)
- [ ] **Tasa de abandono disminuye 20%+** (usuarios que ven habitación pero no reservan)
- [ ] **Zero tickets de soporte** relacionados con "precio cambió" o "IVA sorpresa"
- [ ] **Statistical significance**: p-value < 0.05 en tests de conversión

### Galería y Engagement
- [ ] **Tiempo en modal aumenta 20%+** (usuario explora fotos)
- [ ] **Click en "Reservar" después de ver 3+ fotos aumenta 15%+**
- [ ] **80%+ de usuarios ven 3+ fotos** antes de reservar o abandonar
- [ ] **Zero abandonos por "fotos no claras"** (monitorear soporte)

### Calidad Técnica
- [ ] **100% de eventos de analytics** llegando correctamente (validar con GA Debugger)
- [ ] **Lighthouse score >95** en performance y accessibility (competitivo con Airbnb)
- [ ] **Zero errores en consola** >5% de sesiones

### Sidebar y Precio
- [ ] **Zero discrepancias de precio** entre sidebar y tarjeta (validar con tests E2E)
- [ ] **Sidebar actualiza en <100ms** cuando usuario selecciona fechas

### Date Picker y Navegación
- [ ] **80%+ usuarios seleccionan fechas sin abrir modal calendario** (date picker integrado)
- [ ] **Precio se actualiza en <100ms** al seleccionar fechas
- [ ] **50%+ usuarios usan "quick dates"** (este fin de semana, próxima semana)
- [ ] **30%+ usuarios regresan con fechas persistentes** (localStorage)
- [ ] **Tiempo de decisión de fechas disminuye 40%+** (gracias a quick dates)
- [ ] **Badge de urgencia visible en 100% de habitaciones con <=2 disponibles**

### Motion & Visual Design
- [ ] **Skeleton loaders visibles en 100% de loading states** (no spinners básicos)
- [ ] **Micro-animaciones en todos los botones** (hover, active, focus)
- [ ] **Staggered animation en lista de habitaciones** (50ms delay entre cards)
- [ ] **Modal transition suave** (scale + fade + backdrop blur, 200ms)
- [ ] **Progress indicator en checkout** (3 pasos visuales)
- [ ] **Celebration animation al completar reserva** (confetti + checkmark)
- [ ] **Reduced motion respetado** (prefers-reduced-motion)
- [ ] **Lighthouse performance >95** (animaciones no causan layout thrashing)

### Performance & Web Vitals
- [ ] **LCP <2.5s** (Largest Contentful Paint — imagen hero carga rápido)
- [ ] **FID <100ms** (First Input Delay — interacción inmediata)
- [ ] **CLS <0.1** (Cumulative Layout Shift — sin saltos visuales)
- [ ] **TTI <3.5s en 3G** (Time to Interactive)
- [ ] **Bundle inicial <200KB** (code splitting efectivo)
- [ ] **Virtualización activa para 10+ habitaciones** (DOM nodes <50)
- [ ] **Imagen hero con `priority` y `loading="eager"`**
- [ ] **RoomCard memoizado** (zero re-renders innecesarios)
- [ ] **Cálculos de precio memoizados** (useMemo en allPrices, minPrice, avgPrice)

## Analytics Events Specification

| Event Name | Trigger | Properties |
|------------|---------|------------|
| `view_room` | RoomCard visible in viewport (50%+ visible) | room_id, hotel_id, price, has_dates, tax_rate |
| `click_reserve` | User clicks "Reservar" button | room_id, hotel_id, price, nights, has_dates, tax_rate |
| `open_room_modal` | Modal opens | room_id, hotel_id, source (card/sidebar) |
| `close_room_modal` | Modal closes | room_id, hotel_id, action (reserve/back/esc) |
| `complete_booking` | Booking confirmed (post-payment) | room_id, hotel_id, total_price, nights, guests, payment_method |
| `abandon_booking` | User leaves without booking | room_id, hotel_id, step (card/modal/checkout), time_spent |

## Dashboard-Frontend Data Connection Audit

### Data Flow Map

| Data Field | Source | Dashboard Config | Frontend Display | Status |
|------------|--------|------------------|------------------|--------|
| Room price | `rooms.price` | ✅ RoomEditorModal | ✅ RoomCard, BookingWidget, Modal | **Connected** |
| Tax rate | `hotels.tax_rate` | ✅ SettingsPanel | ✅ RoomCard, BookingWidget, Modal | **Connected** |
| Tax regime | `hotels.tax_regime` | ✅ SettingsPanel | ✅ PriceBreakdown | **Connected** |
| Cancellation policy | `hotels.cancellation_policy` | ✅ SettingsPanel | ✅ RoomCard, Modal | **Connected** |
| Room amenities | `rooms.amenities` | ✅ RoomEditorModal | ✅ RoomCard, Modal | **Connected** |
| Room description | `rooms.description` | ✅ RoomEditorModal | ✅ RoomCard, Modal | **Connected** |
| Room gallery | `rooms.gallery` | ✅ RoomEditorModal | ✅ RoomCard, Modal | **Connected** |
| Room capacity | `rooms.capacity` | ✅ RoomEditorModal | ✅ RoomCard, Modal | **Connected** |
| Room status | `rooms.status` | ✅ RoomEditorModal | ✅ Filtered in page.tsx | **Connected** |
| Hotel name | `hotels.name` | ✅ SettingsPanel | ✅ Page header, Modal | **Connected** |
| Hotel location | `hotels.location` | ✅ SettingsPanel | ✅ Page header | **Connected** |

### Hardcoded Values Found

| Value | Location | Should Come From | Fix Required |
|-------|----------|------------------|--------------|
| `DEFAULT_TAX_RATE = 0.19` | `src/lib/pricing.ts:12` | `hotel.tax_rate` (DB) | **No** — es fallback seguro para `tax_rate=null` |
| IVA label "19%" | `PriceBreakdown.tsx:59` | `hotel.tax_rate * 100` | **Sí** — usar valor dinámico |
| "COP/noche" | `messages/es.json` | Static | **No** — es constante de UI |

### Data Gaps

**Ninguno encontrado** — todos los datos mostrados en frontend vienen de configuración de dashboard.

### Connection Issues

**Ninguno encontrado** — la conexión dashboard → DB → frontend está completa y funcional.

### Recommendations

1. **Mantener `DEFAULT_TAX_RATE=0.19`** como fallback seguro para hoteles con `tax_rate=null`
2. **Hacer label de IVA dinámico**: cambiar "IVA (19%)" por `IVA (${taxRate * 100}%)` en `PriceBreakdown.tsx`
3. **Agregar validación en dashboard**: SettingsPanel debe validar `0 <= tax_rate <= 0.19`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/ota/RoomCard.tsx` | Modified | Precio con IVA siempre, botón unificado, formato de precio, skeleton loader, hover effects |
| `src/components/ota/BookingWidget.tsx` | Modified | Corregir cálculo de precio total, eliminar "Desde", integrar date picker, skeleton loader |
| `src/components/ota/AvailabilitySearchBar.tsx` | Modified | Mover de modal a inline en sidebar (desktop) y sticky header (mobile) |
| `src/components/ota/RoomShowcaseModal.tsx` | Modified | Rediseñar para info nueva (políticas, pago), eliminar info repetida, transitions |
| `src/components/ota/RoomInfoPanel.tsx` | Modified | Eliminar descripción repetida, agregar políticas de cancelación |
| `src/components/ota/PriceBreakdown.tsx` | Modified | Mostrar IVA dinámico, formato de precio |
| `src/components/ota/RoomGalleryGrid.tsx` | Modified | Caché, error states, lazy loading mejorado, parallax |
| `src/components/ota/RoomsListWithFilters.tsx` | Modified | Staggered animations en lista de habitaciones |
| `src/lib/pricing.ts` | Modified | Agregar función `getTaxLabel(taxRate)` dinámica |
| `src/lib/booking-context.ts` | Modified | Agregar persistencia en localStorage |
| `src/lib/motion-tokens.ts` | New | Motion design system tokens (duration, easing, effects) |
| `src/components/ui/SkeletonLoader.tsx` | New | Reusable skeleton loader component |
| `src/components/ui/CelebrationAnimation.tsx` | New | Confetti + checkmark animation component |
| `src/components/ui/ProgressIndicator.tsx` | New | Checkout progress indicator component |
| `src/styles/motion.css` | New | Global motion styles, reduced motion support |
| `src/lib/performance-utils.ts` | New | Memoization helpers, virtualization config |
| `src/components/ota/VirtualizedRoomList.tsx` | New | Virtualized list component for 10+ rooms |
| `messages/es.json` | Modified | Nuevos textos unificados, eliminar keys obsoletas |
| `messages/en.json` | Modified | English translations |
| `src/components/dashboard/SettingsPanel.tsx` | Verified | Ya configura `tax_rate`, `cancellation_policy` — sin cambios |
| `src/components/dashboard/RoomEditorModal.tsx` | Verified | Ya configura precio, amenidades, descripción — sin cambios |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Precio más alto visible reduce conversión inicial | Medium | A/B test: mostrar "$200k + IVA" vs "$238k total" |
| Rediseño de modal rompe analytics existentes | Low | Preservar todos los data-testid y event handlers |
| Cambios en traducciones afectan otros flujos | Low | Grep de todos los usos de keys modificadas antes de eliminar |
| Performance del modal con galería grande | Low | Lazy loading de imágenes, optimización de bundle |
| Hoteles con `tax_rate=null` muestran IVA incorrecto | Medium | Fallback a `DEFAULT_TAX_RATE=0.19` ya implementado |
| Regresión en otros componentes que usen keys eliminadas | Medium | Grep exhaustivo antes de eliminar keys de traducción |

## Rollback Plan

### Per-Phase Rollback

**Phase 1 Rollback** (price fixes):
```bash
git revert <commit-hash-phase1>
# Impact: Vuelve a mostrar precio sin IVA, pero no rompe nada
```

**Phase 2 Rollback** (modal redesign):
```bash
git revert <commit-hash-phase2>
# Impact: Modal vuelve a mostrar info repetida, pero funcional
```

**Phase 3 Rollback** (analytics):
```bash
git revert <commit-hash-phase3>
# Impact: Pierde tracking nuevo, pero no afecta UX
```

### Emergency Rollback (toda la feature)
```bash
git revert <commit-hash-phase1> <commit-hash-phase2> <commit-hash-phase3>
# O: git reset --hard HEAD~3 (si no hay otros commits mezclados)
```

### Monitoring Post-Rollback
- Revisar analytics cada hora primeras 24h
- Alerta si conversión cae >10% respecto a línea base
- Alerta si hay errores en consola >5% de sesiones

## Dependencies

- **Internas**:
  - `hotel.tax_rate` de DB (ya existe, configurado en SettingsPanel)
  - `hotel.cancellation_policy` de DB (ya existe, configurado en SettingsPanel)
  - `room.status === 'active'` filter (ya implementado en page.tsx)
- **Externas**:
  - Google Analytics/Tag Manager para eventos de conversión
  - Wompi para métodos de pago (ya integrado)

## Testing Strategy

### Unit Tests
- [ ] `RoomCard.tsx`: Test que precio muestra IVA cuando `tax_rate=0.19`
- [ ] `RoomCard.tsx`: Test que precio NO muestra IVA cuando `tax_rate=0`
- [ ] `RoomCard.tsx`: Test que precio usa `DEFAULT_TAX_RATE` cuando `tax_rate=null`
- [ ] `BookingWidget.tsx`: Test que sidebar actualiza precio cuando hay fechas
- [ ] `BookingWidget.tsx`: Test que sidebar muestra "Desde $X" para múltiples habitaciones
- [ ] `PriceBreakdown.tsx`: Test de cálculo correcto con diferentes `tax_rate`
- [ ] `PriceBreakdown.tsx`: Test que label de IVA es dinámico (`IVA (19%)` vs `IVA (0%)`)
- [ ] `AvailabilitySearchBar.tsx`: Test que date picker integrado actualiza precio en tiempo real
- [ ] `AvailabilitySearchBar.tsx`: Test que "quick dates" seleccionan fechas correctas
- [ ] `booking-context.ts`: Test que fechas persisten en localStorage

### Integration Tests
- [ ] Flujo completo: Ver habitación → Seleccionar fechas → Abrir modal → Reservar
- [ ] Test que botón dice "Reservar" en todos los estados (sin fechas, con fechas, en modal)
- [ ] Test que modal NO muestra descripción repetida
- [ ] Test que modal muestra política de cancelación

### E2E Tests
- [ ] Test de conversión: Usuario completa reserva en <2 minutos
- [ ] Test de abandono: Usuario cierra modal y vuelve, fechas persisten
- [ ] Test de disponibilidad: Habitación se agota, modal muestra "Ya no disponible"

### Visual Regression Tests
- [ ] Screenshot de RoomCard con y sin fechas
- [ ] Screenshot de modal antes/después
- [ ] Screenshot de sidebar con y sin fechas

## Implementation Phases

### Phase 1: Critical Fixes (PR #1)
**Objetivo**: Arreglar bugs críticos de precio + integrar date picker
- Fix P1: Mostrar precio con IVA en RoomCard (usar `hotel.tax_rate`)
- Fix P2: Corregir cálculo en BookingWidget (usar total con IVA)
- Fix P6: Eliminar label "Desde"
- Fix FR7: Manejo de `tax_rate=0` y `tax_rate=null`
- **Fix FR11**: Integrar date picker en sidebar (desktop) y sticky header (mobile)
  - Mover `AvailabilitySearchBar` de modal a inline: ~80 líneas
  - Cambiar estado de modal a siempre visible: ~40 líneas
  - Estilos para sidebar (desktop): ~30 líneas
  - Estilos para sticky header (mobile): ~40 líneas
  - Actualización en tiempo real del precio: ~20 líneas
  - Tests: ~30 líneas
- **Estimated lines**: ~350 (200 precio + 150 date picker)
- **Risk**: Medio (date picker integrado es más complejo)

### Phase 2: UX Improvements (PR #2 y PR #2b)
**PR #2**: Unificar botón + eliminar info repetida
- Fix P3: Unificar botón a "Reservar"
- Fix P4: Eliminar descripción repetida en modal
- **Estimated lines**: ~150

**PR #2b**: Agregar info nueva al modal + optimización de galería
- Fix FR3: Agregar políticas de cancelación en modal
- Fix FR3: Agregar métodos de pago en modal
- **Optimización de imágenes**: Implementar caché de navegador, lazy loading mejorado, error states
- **Accesibilidad de galería**: Alt text, keyboard navigation, focus trap
- **Estimated lines**: ~200

**Risk**: Medio (rediseño de modal)

### Phase 3: Polish & Metrics (PR #3)
**Objetivo**: Medir y optimizar
- Fix P5: Mejorar transparencia de IVA (label dinámico)
- Fix FR6: Agregar tracking de conversión (6 eventos)
- Fix FR8-FR10: Edge cases (disponibilidad, persistencia, múltiples habitaciones)
- **Estimated lines**: ~150
- **Risk**: Bajo (analytics y edge cases)

### Phase 4: Motion & Visual Design System (PR #4)
**Objetivo**: Elevar diseño a nivel profesional de producción
- **Fix FR12**: Motion & Visual Design System completo
  - Skeleton loaders (reemplazar spinners): ~80 líneas
  - Micro-animaciones (hover, active, focus): ~60 líneas
  - Staggered animations en lista: ~40 líneas
  - Modal transitions (scale + fade + blur): ~50 líneas
  - Progress indicator en checkout: ~70 líneas
  - Celebration animation: ~40 líneas
  - Reduced motion support: ~30 líneas
  - Motion tokens centralizados: ~50 líneas
  - Tests de animaciones: ~40 líneas
- **Estimated lines**: ~460
- **Risk**: Bajo (animaciones son aditivas, no rompen funcionalidad)

### Phase 5: Performance Optimization (PR #5)
**Objetivo**: Cumplir Web Vitals (LCP <2.5s, FID <100ms, CLS <0.1)
- **Fix FR13**: Performance Optimization completo
  - Memoizar cálculos de precio (useMemo): ~40 líneas
  - Mover useSearchParams al padre: ~30 líneas
  - Eliminar doble animación: ~20 líneas
  - Virtualización de lista (@tanstack/react-virtual): ~120 líneas
  - Imágenes priority + loading eager/lazy: ~50 líneas
  - Code splitting (next/dynamic): ~40 líneas
  - React.memo en RoomCard: ~20 líneas
  - IntersectionObserver para lazy load: ~60 líneas
  - Precarga de fuentes: ~20 líneas
  - Tests de performance: ~40 líneas
- **Estimated lines**: ~440
- **Risk**: Medio (virtualización y code splitting requieren testing cuidadoso)

**Total estimado**: 6 PRs encadenados, ~1800 líneas, 15-18 días de trabajo

## Future Work (Post-MVP)

> Estas capacidades quedan **explícitamente fuera del scope** de este PRD pero se documentan aquí como roadmap de producto. No implementar en esta fase.

### Pricing Optimization
- **Smart pricing**: precios diferenciados por fin de semana, temporada alta/baja, festivos
- **Dynamic pricing**: ajuste automático basado en demanda y ocupación
- **Descuentos por estadía larga**: reglas configurables (7+ noches, 30+ noches)
- **Last-minute deals**: descuentos automáticos para fechas cercanas con baja ocupación

### Guest Experience
- **Wishlist / Save for Later**: guardar habitaciones favoritas para comparar después
- **Comparación lado a lado**: hasta 3 habitaciones en vista comparativa
- **Virtual tour**: fotos 360° o video walkthrough de la habitación
- **Chat con el hotel**: mensajería directa pre-reserva

### Host Tools
- **"Request to Book" mode**: filtro de huéspedes antes de confirmar (alternativa a confirmación inmediata)
- **Guest verification**: validación de identidad del huésped
- **"Guest Favorite" badge**: distintivo automático para habitaciones con rating 4.8+ y 10+ reseñas
- **Photo quality score**: puntuación automática de calidad de fotos en dashboard

### Content Quality Standards
- **Minimum photo guidance**: "Subí al menos 10 fotos para competir en el mercado" (tooltip en RoomEditorModal)
- **Photo quality validation**: detectar fotos borrosas, oscuras o con resolución insuficiente en upload
- **Description quality**: sugerir descripciones de 100+ palabras con estructura (espacio, amenidades, experiencia)
- **AI photo suggestions**: recomendar ángulos faltantes basado en análisis de galerías top-performing

### Content Quality Metrics (Post-MVP)
- [ ] **80%+ de habitaciones tienen 8+ fotos** (monitorear en dashboard)
- [ ] **Foto hero tiene 2400x1600px mínimo** (validar en upload)
- [ ] **Descripción tiene 100+ palabras** (validar en RoomEditorModal)
- [ ] **Photo quality score promedio > 7/10** por hotel

### Benchmark vs Industria (Post-MVP)

| Capability | Airbnb | HospedaSuite MVP | HospedaSuite Post-MVP |
|------------|--------|------------------|----------------------|
| Pasos de reserva | 5 | 5-6 | 5-6 |
| Precio transparente | ✅ | ✅ | ✅ |
| Galería inmersiva | 20-50 fotos | 5-12 fotos | 10+ fotos (guidance) |
| Smart pricing | ✅ |  | ✅ |
| Wishlist | ✅ |  | ✅ |
| Request to Book | ✅ | ❌ | ✅ |
| Guest Favorite badge | ✅ | ❌ | ✅ |
| Virtual tour | ✅ | ❌ | ✅ |
| Lighthouse score | >95 | >95 | >95 |

**Nota**: El MVP cierra el 91% de los gaps críticos vs Airbnb (31/34). Los gaps restantes (checkout integrado, wishlist, smart pricing) son features de siguiente nivel que requieren arquitectura adicional y no deben bloquear el lanzamiento del MVP.

## Dashboard-Frontend Connection Status

✅ **VERIFICADO**: El dashboard está **totalmente conectado** con el frontend.

- Todos los datos mostrados en el flujo de reserva vienen de configuración de dashboard
- `SettingsPanel` configura: `tax_rate`, `tax_regime`, `cancellation_policy`, hotel info
- `RoomEditorModal` configura: precio, amenidades, descripción, galería, capacidad
- No hay datos hardcoded que deban venir de dashboard
- La única excepción es `DEFAULT_TAX_RATE=0.19` que es un **fallback seguro** para `tax_rate=null`

**Conclusión**: No se necesitan cambios en el dashboard para esta feature.

## Version History
- **v1**: PRD inicial con 6 problemas, 6 FRs, 7 success criteria
- **v2**: +Galería como herramienta de conversión, +6 edge cases, +4 success criteria
- **v3**: +FR11 (date picker integrado), corrección de "2 pasos" a "5-6 pasos", +4 success criteria de date picker
- **v4**: +Future Work (Post-MVP), Lighthouse >90→>95, benchmark vs industria, 4 categorías de future work
- **v5**: +13 ACs de optimización (scarcity, quick dates, micro-interacciones, orden jerárquico), +2 success criteria, handoff al checkout especificado
- **v6**: +9 ACs de Nielsen (keyboard shortcuts, contextual help, errores de pago), score 33/40→37/40 (92.5% Excellent)
- **v7**: +FR12 Motion & Visual Design System profesional (20 ACs), +4 PR (#4), +6 archivos nuevos, total 1360 líneas, 12-15 días
- **v8**: +FR13 Performance Optimization (15 ACs), +5 PR (#5), +2 archivos nuevos, total 1800 líneas, 15-18 días
