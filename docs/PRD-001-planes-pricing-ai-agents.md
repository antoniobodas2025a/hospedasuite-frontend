# Product Requirements Document (PRD)

# HospedaSuite — Planes, Pricing & Agentes IA

**Documento:** PRD-001  
**Versión:** 3.0  
**Fecha:** 19 de Mayo, 2026  
**Autor:** HospedaSuite Team  
**Estado:** Draft — Pending Review

---

## 1. Executive Summary

HospedaSuite evoluciona a **3 tiers diferenciados en pesos colombianos (COP)**:

- **Starter ($49.000):** Hostales y B&Bs de 1-4 unidades. 3 meses gratis.
- **Pro ($99.000):** Hoteles boutique de 5-14 unidades. Carta digital + Channel Manager. 3 meses gratis.
- **Enterprise ($199.000):** Hoteles de 15-30 unidades. Más OTAs, más staff, soporte prioritario. **Sin IA** — sin costos adicionales. 3 meses gratis.

**Filosofía:** Enterprise sin IA porque los costos de IA destruyen el margen y el mercado colombiano no está listo para pagar $800K+/mes. Enterprise ofrece más capacidad, no IA. La IA se ofrecerá como add-on futuro cuando haya demanda.

---

## 2. Precios Actuales vs. Propuestos

### 2.1 Lo que tenemos hoy (landing page + código)

| Plan | Precio actual (COP) | En código (`saas-plans.ts`) | En flags (`pricing.ts` control) |
|------|---------------------|----------------------------|-------------------------------|
| Starter | No visible en landing | $49.000 | $49.000 |
| Pro | $99.000/mes | $99.000 | $99.000 |
| Enterprise | No visible en landing | $169.000 | $169.000 |

**Inconsistencia detectada:** La landing page NO muestra Starter ni Enterprise. Solo muestra Pro a $99.000 COP. El código tiene 3 planes pero la landing solo vende 1.

### 2.2 Precios propuestos (COP)

| Plan | Precio mensual COP | Precio anual COP (ahorro ~17%) | Setup fee | Target |
|------|-------------------|-------------------------------|-----------|--------|
| **Starter** | $49.000 | $490.000 ($40.833/mes) | $0 | Hostales, B&Bs, 1-4 unidades |
| **Pro** | $99.000 | $990.000 ($82.500/mes) | $0 | Hoteles boutique, 5-14 unidades |
| **Enterprise** | $199.000 | $1.990.000 ($165.833/mes) | $0 | Hoteles, 15-30 unidades |

### 2.3 Por qué estos precios — Análisis de mercado

**Competencia internacional (precios en USD, convertidos a COP a ~$4.200):**

| Competidor | Plan más bajo | Plan medio | Enterprise |
|------------|--------------|------------|------------|
| Cloudbeds | ~$100 USD ($420.000 COP) | ~$200 USD ($840.000 COP) | Custom ($2M+ COP) |
| Little Hotelier | ~$50 USD ($210.000 COP) | ~$100 USD ($420.000 COP) | Custom |
| **HospedaSuite** | **$49.000 COP** | **$99.000 COP** | **$1.290.000 COP** |

**Racional:** HospedaSuite es **10x más barato** que la competencia internacional para el mercado colombiano. Esto es intencional:

- Colombia tiene un poder adquisitivo menor que EE.UU./Europa.
- Un hostal en Cartagena con 3 habitaciones no puede pagar $420.000/mes en software.
- $49.000 COP es el precio de una cena — barrera de entrada casi cero.
- $99.000 COP sigue siendo accesible para un hotel boutique de 10 habitaciones.
- $899.000 COP para Enterprise incluye IA que reemplaza 40h/mes de trabajo (~$1.200.000 en personal).

### 2.4 Comparación en lenguaje sencillo

| Si tu hotel tiene... | Plan ideal | Pagas por mes | Qué obtienes |
|---------------------|-----------|---------------|--------------|
| 1-4 habitaciones, sos el dueño y hacés todo | Starter | $49.000 | El sistema básico para no perder reservas |
| 5-14 habitaciones, tenés recepcionista | Pro | $99.000 | Todo lo básico + carta digital para tu restaurante + sincronización con Booking/Airbnb |
| 15-50 habitaciones, varias propiedades, querés que la IA trabaje por vos | Enterprise | $899.000 | Todo lo anterior + 5 agentes IA que atienden huéspedes, ajustan precios, sincronizan OTAs y gestionan reseñas automáticamente |

---

## 3. Feature Matrix — Lo que TENEMOS vs. Lo que NECESITAMOS

### 3.1 Starter ($49.000 COP/mes)

| Feature | Estado actual | Necesita implementación | Costo adicional | Alternativa gratis |
|---------|--------------|------------------------|-----------------|-------------------|
| PMS Core (dashboard, calendario, reservas) | ✅ Implementado | — | $0 | No hay alternativa gratis con OTA incluida |
| Gestión de habitaciones (CRUD) | ✅ Implementado | — | $0 | — |
| Onboarding wizard (6 pasos) | ✅ Implementado | — | $0 | — |
| OTA pública (página del hotel) | ✅ Implementado | — | $0 | — |
| Reviews moderadas | ✅ Implementado | — | $0 | — |
| Link Directo (WhatsApp + Wompi) | ✅ Implementado | — | $0 | — |
| 3 meses gratis (trial) | ✅ Implementado (DB migration 008) | — | $0 | — |
| **Subtotal costo infra** | | | **~$8.000 COP/mes** (Supabase free + VPS compartido) | |

**Lo que NECESITAMOS para vender Starter YA:**
- ❌ **Landing page actualizada:** Mostrar los 3 planes con precios. Hoy solo muestra Pro.
- ❌ **Plan authorization:** El middleware `plan-authorization.ts` existe pero no se usa para bloquear features.
- ❌ **Billing recurrente:** Wompi subscriptions está en `WompiButton.tsx` pero falta el flujo completo de facturación mensual.
- ❌ **Gating de features:** Si un hotel Starter intenta usar algo de Pro, debe ver un upgrade prompt.

**Margen estimado Starter:** $49.000 - $8.000 = **$41.000 COP/hotel/mes (84% margen)**

### 3.2 Pro ($99.000 COP/mes)

| Feature | Estado actual | Necesita implementación | Costo adicional | Alternativa gratis |
|---------|--------------|------------------------|-----------------|-------------------|
| Todo lo de Starter | ✅ | — | $0 | — |
| **Carta Digital (POS)** | ✅ Mencionado en `saas-plans.ts` | ❌ No implementado | ~$2.000 COP/mes (storage R2 extra) | No hay alternativa gratis con integración PMS |
| **Channel Manager (iCal)** | ✅ Mencionado en landing | ⚠️ Parcial (iCal básico) | ~$3.000 COP/mes (QStash sync) | iCal es protocolo abierto, gratis |
| **Sincronización Booking/Airbnb** | ⚠️ Parcial | ❌ Falta sync bidireccional real | ~$5.000 COP/mes (API calls) | No hay gratis — OTAs cobran comisión |
| **POS (Punto de Venta)** | ✅ Mencionado en landing | ❌ No implementado | ~$2.000 COP/mes | Square/Toast pero no integrados con PMS |
| **Libro Registro (Forensic Book)** | ✅ Mencionado en `saas-plans.ts` | ❌ No implementado | ~$1.000 COP/mes (storage) | Excel/manual (pero no cumple normativa) |
| Hasta 14 unidades | ❌ No hay límite en DB | ❌ Falta validación | $0 | — |
| Hasta 3 OTAs conectadas | ❌ No hay límite en DB | ❌ Falta validación | $0 | — |
| **Subtotal costo infra** | | | **~$13.000 COP/mes** | |

**¿Qué quiere decir "hasta 3 OTAs"?**
Significa que el hotel puede conectar su inventario a **3 plataformas de reservas externas** simultáneamente. Ejemplo: Booking.com + Airbnb + Expedia. El Channel Manager sincroniza disponibilidad y precios entre las 3. Si una habitación se reserva en Booking, se bloquea automáticamente en Airbnb y Expedia.

**Margen estimado Pro:** $99.000 - $13.000 = **$86.000 COP/hotel/mes (87% margen)**

### 3.3 Enterprise ($199.000 COP/mes) — MÁS CAPACIDAD, SIN IA

| Feature | Estado actual | Necesita implementación | Costo adicional mensual |
|---------|--------------|------------------------|------------------------|
| Todo lo de Pro | ✅ | — | ~$21.000 |
| Hasta 30 unidades (vs 14 en Pro) | ❌ | ✅ Cambiar límite en DB | $0 |
| Hasta 6 OTAs (vs 3 en Pro) | ❌ | ✅ Cambiar límite en DB | ~$5.000 (QStash extra) |
| Hasta 15 staff (vs 5 en Pro) | ❌ | ✅ Cambiar límite en DB | $0 |
| 20 GB storage (vs 5 GB en Pro) | ❌ | ✅ Cambiar límite en DB | ~$5.000 (R2 extra) |
| Soporte prioritario | ❌ | ✅ Tag en sistema de soporte | ~$10.000 |
| Reportes avanzados | ❌ | ✅ Queries + UI | ~$5.000 |
| **Subtotal costo infra** | | | **~$46.000 COP/mes** |

**Margen estimado Enterprise:** $199.000 - $46.000 = **$153.000 COP/hotel/mes (77% margen)**

> **Nota:** Enterprise sin IA porque el mercado colombiano no está listo para pagar $800K+/mes. Enterprise ofrece MÁS CAPACIDAD (unidades, OTAs, staff, storage) sin costos de IA. Se implementa cambiando límites en la DB — 1 día de trabajo.

---

## 4. Explicación Técnica + Lenguaje Sencillo (Columnas)

### 4.1 Carta Digital

| Aspecto | Técnico (para devs) | Sencillo (para el hotelero) |
|---------|---------------------|----------------------------|
| Qué es | CRUD de menú items con categorías, precios, fotos en R2, página pública `/carta/[hotel-slug]` | Tu carta/restaurante digital. Los huéspedes escanean un QR y ven tu menú en el celular |
| Plan Starter | ❌ No disponible | No tenés carta digital. Podés usar un PDF impreso |
| Plan Pro | ✅ CRUD manual: el hotel crea cada item, sube fotos, pone precios | Vos creás tu carta: escribís el nombre del plato, ponés el precio, subís la foto. Se actualiza al instante |
| Plan Enterprise | ✅ Igual que Pro + auto-traducción a inglés cuando el huésped cambia idioma | Tu carta se traduce automáticamente al inglés para los turistas. Vos la escribís en español, el sistema la traduce |
| Costo infra | ~$2.000 COP/mes (R2 storage + CDN) | — |
| Alternativa gratis | No hay nada gratis que se integre con tu PMS | Podés hacer un PDF en Canva, pero no se actualiza solo ni tiene QR ni analytics |

### 4.2 Channel Manager (iCal + OTAs)

| Aspecto | Técnico | Sencillo |
|---------|---------|----------|
| Qué es | Parser iCal (.ics) que lee/escribe calendarios de OTAs. Sync bidireccional vía QStash cron jobs. Idempotency con `processed_events` table | Un seguro anti-sobreventa. Si vendés una habitación en tu web, se bloquea en Booking.com y Airbnb automáticamente |
| Plan Starter | ❌ Sin channel manager. Solo Link Directo (WhatsApp) | Si vendés por WhatsApp, tenés que bloquear manualmente en Booking.com. Riesgo de sobreventa |
| Plan Pro | ✅ iCal sync con hasta 3 OTAs (Booking.com, Airbnb, Expedia) | Conectá hasta 3 plataformas. Si alguien reserva en una, las otras 2 se actualizan solas |
| Plan Enterprise | ✅ iCal sync con hasta 6 OTAs (Booking, Airbnb, Expedia, TripAdvisor, Despegar, Hotelbeds) | Conectá hasta 6 plataformas. Más canales = más reservas |
| Costo infra | ~$5.000 COP/mes (QStash + API calls) | — |
| Alternativa gratis | iCal es protocolo abierto, podés hacer sync manual | Podés actualizar manualmente cada OTA, pero es lento y propenso a errores humanos |

### 4.3 Traducción Automática (Opción C — Híbrida)

| Aspecto | Técnico | Sencillo |
|---------|---------|----------|
| Qué es | Cuando el hotelero guarda info del hotel (nombre, descripción, habitaciones), se traduce automáticamente a inglés usando DeepL/Google Translate API. El hotelero puede editar la traducción si quiere | Escribís la info de tu hotel en español. El sistema la traduce automáticamente al inglés. Si querés corregir algo, podés editarla |
| Plan Starter | ✅ Auto-traducción incluida | Tu página de hotel se ve en inglés para los turistas |
| Plan Pro | ✅ Auto-traducción + carta digital bilingüe | Tu carta también se traduce al inglés |
| Plan Enterprise | ✅ Todo lo anterior + más idiomas si se solicitan | Podés pedir traducción a portugués o francés si tenés muchos huéspedes de esos países |
| Costo infra | ~$5.000 COP/mes por hotel (DeepL API) | — |
| Alternativa gratis | Google Translate free tier (limitado) | El hotelero traduce manualmente (lento, propenso a errores) |

| Aspecto | Técnico | Sencillo |
|---------|---------|----------|
| Qué son | 5 agentes Mastra con herramientas MCP que interactúan con la DB de HospedaSuite. Cada agente tiene su propio prompt, memory, y toolset | 5 "empleados digitales" que trabajan 24/7 sin descanso. Cada uno se encarga de una tarea diferente |
| Agente 1: Concierge | `streamText` con Claude Sonnet 4. Tools: `bookings.search`, `rooms.availability`. Memory en Supabase `agent_conversations` | Atiende a los huéspedes por WhatsApp o chat. Responde "¿tienen habitación?", "¿cuánto cuesta?", "¿tienen WiFi?" en segundos |
| Agente 2: Revenue | Workflow determinístico + GPT-5.4 para pricing decisions. Trigger: cron diario + eventos booking.created/cancelled | Ajusta los precios de tus habitaciones automáticamente. Si hay mucha demanda, sube el precio. Si está vacío, baja para llenar |
| Agente 3: OTA Sync | Event-driven via QStash. Tools: `ota.sync`. Idempotency con `processed_events` | Sincroniza tus precios y disponibilidad entre todas las OTAs automáticamente |
| Agente 4: Review Manager | Claude Sonnet 4 para análisis de sentimiento. Trigger: `review.created` event | Responde a las reseñas de tus huéspedes automáticamente. Si es negativa, te alerta inmediatamente |
| Agente 5: Carta Digital IA | Claude Sonnet 4 para generación de contenido. Tools: `carta_digital.write`, `carta_digital.translate` | Crea y mantiene tu carta digital automáticamente. Sugiere platos, precios, y traduce a otros idiomas |
| Costo tokens | ~$150.000-250.000 COP/mes por hotel | — |
| Alternativa gratis | No hay agentes IA gratis de calidad | Podés contratar personal, pero cuesta $1.200.000+/mes y no trabaja 24/7 |

### 4.5 Training de Agentes con Markdown (Enterprise)

| Aspecto | Técnico | Sencillo |
|---------|---------|----------|
| Qué es | Editor Markdown en el dashboard Enterprise. Los archivos `.md` se parsean y se inyectan como contexto en el system prompt de cada agente. Hot-reload sin redeploy | Vos le enseñás a tu agente IA escribiendo en lenguaje natural. Ejemplo: "Si un huésped pregunta por late checkout, decile que puede ser hasta las 2pm con un costo de $50.000" |
| Cómo funciona | Tabla `agent_knowledge_base` con `hotel_id`, `agent_type`, `content_md`, `version`. Al guardar, se re-embeddea el contenido y se actualiza el prompt del agente | Es como escribirle instrucciones a un empleado nuevo. Escribís las reglas de tu hotel y el agente las sigue |
| Ejemplo de MD | `# Política de Late Checkout\n- Check-out estándar: 12:00 PM\n- Late checkout disponible hasta 2:00 PM\n- Costo: $50.000 COP\n- Sujeto a disponibilidad` | El agente ahora sabe: si alguien pregunta por late checkout, responde con la política exacta de TU hotel |
| Costo infra | ~$10.000 COP/mes (storage + parseo) | — |
| Por qué es potente | Los agentes de la competencia son genéricos. Los de HospedaSuite se personalizan con el conocimiento específico de cada hotel | Tu agente conoce TU hotel, no un hotel genérico. Sabe tus reglas, tus precios, tus políticas |

---

## 5. OTA Bilingüe (Español + Inglés) — FASE 1 PRIORITARIA

### 5.1 Por qué es urgente

- Colombia recibe **millones de turistas extranjeros** al año (Cartagena, San Andrés, Medellín, Bogotá, Eje Cafetero).
- Muchos visitantes **no hablan español**.
- La OTA actual está **100% en español** — esto pierde reservas directamente.
- Es un requisito de venta: un hotel en Cartagena no puede tener su página de reservas solo en español.

### 5.2 Análisis Heurístico Aplicado

#### Ley de Miller (máximo 7±2 elementos por chunk)

**Problema actual:** La OTA tiene demasiados elementos visibles simultáneamente (filtros, navegación, galería, precios, badges, reviews).

**Solución:** Agrupar en chunks semánticos de máximo 5 elementos:

| Chunk | Elementos (máx 5) |
|-------|-------------------|
| Hero | 1. Nombre del hotel, 2. Ubicación, 3. Rating, 4. Galería principal, 5. CTA "Reservar" |
| Búsqueda | 1. Fechas, 2. Huéspedes, 3. Botón buscar, 4. Refinar (oculto), 5. Resultados count |
| Habitaciones | 1. Foto, 2. Nombre, 3. Precio, 4. Capacidad, 5. CTA "Ver más" |
| Reviews | 1. Rating promedio, 2. Cantidad de reviews, 3. Review destacada, 4. Formulario (oculto), 5. CTA "Ver todas" |

#### Ley de Hick (una decisión por pantalla)

**Problema actual:** El usuario ve fechas + huéspedes + precio + camas + amenities todo al mismo tiempo → parálisis.

**Solución:** Secuencia de decisiones:
1. **Pantalla 1:** ¿Cuándo venís? (fechas) → sola
2. **Pantalla 2:** ¿Cuántos son? (huéspedes) → sola
3. **Pantalla 3:** Acá están tus habitaciones → elegí una

#### Saliencia Visual (80% atención en el CTA)

- El botón **"Book Now" / "Reservar"** debe ser el elemento más prominente.
- Contraste de peso (font-weight 700) y escala (1.1x) en lugar de color estridente.
- Todo lo demás en tonos neutros (zinc-400 a zinc-600).

#### Progressive Disclosure

- Configuraciones avanzadas (políticas de cancelación, amenities detallados, info del hotel) solo aparecen tras interacción deliberada.
- La complejidad técnica (channel manager, API de OTA) está oculta del huésped final.

#### Anticipación UX

- Si el usuario selecciona fechas → la UI transiciona orgánicamente a selección de habitaciones.
- El inventario no disponible se oculta automáticamente.
- El idioma se detecta por `navigator.language` o geolocalización IP.

#### Estética Mac 2026

- **Squircles** (radios de curvatura continua) en todos los contenedores.
- **Glassmorphism 2.0:** Backdrop blur de 10px a 40px, specular highlights (bordes 1px opacidad 10%).
- **Tipografía:** Geist con tracking dinámico. Jerarquía por espacio negativo activo.
- **Spring physics** en todas las micro-interacciones (masa, rigidez, amortiguación).

#### Feedback Háptico Visual

- Si una habitación no está disponible: sutil desaturación + vibración visual orgánica (NO pop-up de error).
- Si la reserva se confirma: animación de éxito con spring physics.

### 5.3 Implementación Técnica — i18n

```
Estrategia: next-intl (librería estándar para Next.js 16)

Estructura:
messages/
  en.json      ← Traducciones inglés
  es.json      ← Traducciones español (default)

Detección de idioma:
1. URL: /en/hotel/slug → inglés, /hotel/slug → español
2. navigator.language fallback
3. Cookie de preferencia

Componentes afectados:
- src/components/ota/*.tsx (todos los textos hardcoded → usar useTranslations())
- src/app/(ota)/hotel/[slug]/page.tsx (metadata, titles)
- src/lib/room-templates.ts (nombres de templates traducidos)
- src/components/onboarding/*.tsx (wizard también debe ser bilingüe)

Costo: ~$0 (next-intl es open source, traducciones iniciales con IA)
```

### 5.4 Textos clave a traducir

| Español | English |
|---------|---------|
| Reservar | Book Now |
| Habitaciones | Rooms |
| Disponibilidad | Availability |
| Desde $XXX/noche | From $XXX/night |
| Ver más | View Details |
| Reseñas | Reviews |
| Servicios | Amenities |
| Check-in / Check-out | Check-in / Check-out |
| Huéspedes | Guests |
| Fecha de entrada | Check-in Date |
| Fecha de salida | Check-out Date |
| Tu propiedad está lista | Your Property is Ready |
| Configurá tu propiedad | Set up your property |

---

## 6. Estudio de Precios Enterprise — Exhaustivo

### 6.1 Análisis de costos reales de IA

| Componente | Detalle | Costo mensual (COP) |
|------------|---------|---------------------|
| **Tokens LLM** | | |
| Concierge (Claude Sonnet 4) | 200 conversaciones × 2K tokens input + 500 output = ~500K tokens | ~$80.000 |
| Revenue Manager (GPT-5.4) | 30 análisis diarios × 1K tokens = ~900K tokens | ~$40.000 |
| OTA Sync (GPT-5.4) | 50 syncs × 500 tokens = ~750K tokens | ~$30.000 |
| Review Manager (Claude Sonnet 4) | 20 reviews × 1K tokens = ~600K tokens | ~$50.000 |
| Carta Digital IA (Claude Sonnet 4) | 5 actualizaciones × 3K tokens = ~45K tokens | ~$10.000 |
| **Subtotal tokens** | | **~$210.000** |
| **APIs externas** | | |
| WhatsApp Business API | 500 mensajes × $200 COP = | ~$100.000 |
| Apify (scraping competencia) | 100 ejecuciones × $0.25 = | ~$105.000 |
| **Infra adicional** | | |
| Supabase (storage + compute extra) | | ~$25.000 |
| QStash (eventos IA) | | ~$15.000 |
| Soporte dedicado (4h SLA) | Part-time support engineer | ~$200.000 |
| **TOTAL Enterprise** | | **~$655.000 COP/mes** |

### 6.2 Precio Enterprise: $1.290.000 COP/mes

```
Revenue:     $1.290.000
Costos:      $655.000
Margen:      $635.000 (49%)
```

**¿Por qué $1.290.000?** Porque necesitamos un margen saludable del ~49% para sostener el servicio de IA a largo plazo. Los costos de tokens pueden variar, y necesitamos un colchón.

**¿Es caro para el hotelero?** Veámoslo así:

| Si el hotelero hace esto manualmente | Le cuesta |
|-------------------------------------|-----------|
| 1 recepcionista extra (turno noche) | ~$800.000/mes |
| 1 persona gestionando reseñas y precios | ~$600.000/mes |
| **Total en personal** | **~$1.400.000/mes** |
| **Con HospedaSuite Enterprise** | **$1.290.000/mes** |

**El hotelero ahorra $110.000/mes Y trabaja menos.** Los agentes no se enferman, no llegan tarde, y trabajan 24/7.

### 6.3 Setup Fee Enterprise: $1.500.000 COP

| Concepto | Detalle | Costo para HospedaSuite |
|----------|---------|------------------------|
| Configuración de agentes | Prompt engineering personalizado para cada hotel | ~$200.000 (4 horas de ingeniero) |
| Importación de datos | Migrar datos de PMS anterior | ~$150.000 (3 horas) |
| Training con MD | Configurar knowledge base del hotel | ~$100.000 (2 horas) |
| Onboarding del equipo | Capacitar al staff del hotel | ~$200.000 (4 horas) |
| **Total costo** | | **~$650.000** |
| **Setup fee cobrado** | | **$1.500.000** |
| **Margen setup** | | **$850.000 (57%)** |

### 6.4 Límites Enterprise (NO ilimitado)

| Recurso | Límite | Por qué |
|---------|--------|---------|
| Unidades (habitaciones) | **50 máximo** | Más de 50 requiere infra separada. Un hotel con 50+ habitaciones es una cadena real que necesita solución custom. |
| OTAs conectadas | **10 máximo** | No existen más de 10 OTAs relevantes para un hotel colombiano. |
| Agentes IA | **5 máximo** | Concierge + Revenue + OTA Sync + Review + Carta Digital. Más agentes = complejidad sin valor agregado. |
| Propiedades (multi-property) | **5 máximo** | Más de 5 propiedades requiere arquitectura de multi-tenant separada. |
| Staff accounts | **20 máximo** | Más de 20 usuarios concurrentes requiere infra de autenticación separada. |
| Almacenamiento | **50 GB** | Suficiente para 500+ imágenes de alta resolución. |
| API calls/mes | **100.000** | Suficiente para integraciones custom. Más requiere plan custom. |
| Conversaciones Concierge/mes | **1.000** | ~33 por día. Si un hotel tiene más tráfico, necesita infra dedicada. |

### 6.5 Qué pasa si un hotel necesita más que los límites

**Plan Custom (Enterprise+):** Precio negociado individualmente. Para hoteles con 50+ habitaciones, 10+ propiedades, o necesidades especiales. Contactar ventas.

---

## 7. Roadmap — Fases de Implementación

### FASE 0: OTA Bilingüe (ES/EN) — PRIORIDAD MÁXIMA

**Objetivo:** Tener la OTA pública en español e inglés para poder vender a hoteles con turistas extranjeros.

| Task | Descripción | Esfuerzo | Dependencias |
|------|-------------|----------|--------------|
| 0.1 | Instalar `next-intl` y configurar `messages/en.json` + `messages/es.json` | 2h | — |
| 0.2 | Routing i18n: `/en/hotel/[slug]` + `/hotel/[slug]` (default ES) | 3h | 0.1 |
| 0.3 | Traducir todos los componentes OTA (`useTranslations()`) | 8h | 0.2 |
| 0.4 | Traducir onboarding wizard | 4h | 0.1 |
| 0.5 | Detección automática de idioma (navigator + cookie) | 2h | 0.2 |
| 0.6 | Language switcher en header de OTA | 2h | 0.2 |
| 0.7 | Traducir room templates | 1h | 0.1 |
| 0.8 | QA: verificar que todo funcione en ambos idiomas | 4h | 0.3-0.7 |

**Total estimado:** ~26 horas (1 semana de trabajo)
**Costo:** $0 (open source + traducciones con IA)

### FASE 1: Vender Starter y Pro YA

**Objetivo:** Landing page con 3 planes, billing funcional, gating de features.

| Task | Descripción | Esfuerzo | Dependencias |
|------|-------------|----------|--------------|
| 1.1 | Landing page: mostrar 3 planes con precios en COP | 4h | — |
| 1.2 | Actualizar `saas-plans.ts` con precios definitivos | 1h | — |
| 1.3 | Actualizar `pricing.ts` flags con nuevos precios | 1h | 1.2 |
| 1.4 | Billing: flujo de suscripción recurrente con Wompi | 8h | — |
| 1.5 | Plan gating: middleware que bloquea features según plan | 4h | 1.2 |
| 1.6 | Upgrade prompt: cuando un Starter intenta usar feature Pro | 3h | 1.5 |
| 1.7 | DB: agregar columnas de límites (max_units, max_otas) | 2h | — |
| 1.8 | Facturación mensual: generar factura consolidada | 6h | 1.4 |

**Total estimado:** ~29 horas (1.5 semanas)

### FASE 2: Carta Digital (Pro)

| Task | Descripción | Esfuerzo |
|------|-------------|----------|
| 2.1 | DB schema: `menu_items`, `menu_categories`, `qr_codes` | 2h |
| 2.2 | CRUD de carta digital en dashboard | 8h |
| 2.3 | Página pública de carta: `/carta/[hotel-slug]` | 6h |
| 2.4 | QR generator por mesa/habitación | 3h |
| 2.5 | Analytics básico (views, items populares) | 4h |
| 2.6 | Integración con POS (punto de venta) | 6h |

**Total estimado:** ~29 horas (1.5 semanas)

### FASE 3: Channel Manager Real (Pro)

| Task | Descripción | Esfuerzo |
|------|-------------|----------|
| 3.1 | iCal parser robusto (leer .ics de Booking/Airbnb) | 6h |
| 3.2 | iCal writer (generar .ics para OTAs) | 4h |
| 3.3 | Sync bidireccional con QStash cron | 6h |
| 3.4 | Detección de conflictos (overbooking) | 4h |
| 3.5 | Dashboard de OTAs conectadas | 4h |

**Total estimado:** ~24 horas (1 semana)

### FASE 4: Libro Registro Forense (Pro)

| Task | Descripción | Esfuerzo |
|------|-------------|----------|
| 4.1 | DB schema: `guest_registry` (cumplimiento normativa colombiana) | 2h |
| 4.2 | Formulario de registro de huéspedes | 4h |
| 4.3 | Exportación PDF para autoridades | 3h |
| 4.4 | Retención de datos (5 años según ley) | 2h |

**Total estimado:** ~11 horas (2 días)

### FASE 5+: Agentes IA (Enterprise) — FUTURO

> **NO IMPLEMENTAR AHORA.** Documentado para referencia futura. Se activa cuando tengamos 50+ clientes de Starter/Pro validando el producto.

Ver sección 4.4 para detalle técnico de cada agente.

---

## 8. Decisiones Técnicas Clave

| Decisión | Opciones | Elección | Racional |
|----------|----------|----------|----------|
| i18n | next-intl vs react-i18next vs manual | **next-intl** | Nativo de Next.js App Router, routing automático, tipos seguros |
| Billing | Wompi subscriptions vs Stripe vs MercadoPago | **Wompi** (existente) | Ya integrado, soporta COP nativo, sin cambio de proveedor |
| Carta Digital | CRUD custom vs Shopify POS vs Square | **CRUD custom** | Integración directa con PMS, sin dependencia externa |
| Channel Manager | iCal vs API directa vs middleware | **iCal primero, API después** | iCal es universal y gratis. APIs directas requieren aprobación de cada OTA. |
| Framework IA | Mastra vs LangGraph vs CrewAI | **Mastra** | TypeScript nativo, MCP first-class, corre en Next.js serverless |
| Modelo Concierge | GPT-5 vs Claude Sonnet 4 vs Gemini 2.5 | **Claude Sonnet 4** | Mejor tono conversacional, menos alucinaciones en español |
| Modelo Revenue | GPT-5 vs Claude Sonnet 4 | **GPT-5.4** | Mejor en análisis numérico |
| Memory agentes | Supabase vs Redis vs Vector DB | **Supabase** | Ya tenemos la infra. pgvector si necesitamos semantic search |
| WhatsApp | Meta Cloud API vs Twilio vs Waha | **Meta Cloud API** | Más barato, directo, sin vendor lock-in |
| Training MD | Editor custom vs TipTap vs MDX | **Editor MD nativo** | Simple, sin dependencias pesadas. Markdown puro que se parsea a contexto |

---

## 9. Riesgos & Mitigación

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|--------------|------------|
| Landing page no convierte | Alto | Media | A/B testing con flags de precios. Testear $49k vs $39k vs $59k para Starter. |
| Wompi subscriptions falla | Alto | Baja | Fallback a facturación manual con recordatorios por email. |
| iCal sync tiene delays | Medio | Media | Cron cada 5 min (no cada 15). Alerta si sync falla >2 veces seguidas. |
| IA alucina respuestas a huéspedes | Alto | Media | Guardrails: solo responder con datos de DB. Fallback a "consulto con recepción". |
| Costo de tokens supera budget | Medio | Baja | Rate limiting por hotel. Cache de respuestas frecuentes. |
| Hotel no confía en IA | Alto | Media | Toggle por agente. Modo "sugerir" antes de "automático". |
| Competencia baja precios | Medio | Alta | Nuestra ventaja es precio + OTA incluida. Diferenciarnos por servicio local. |

---

## 10. DB Schema — Actualizaciones Necesarias

### 10.1 Actualizar tabla `plans` (nueva)

```sql
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,              -- 'starter', 'pro', 'enterprise'
  display_name TEXT NOT NULL,            -- 'Starter', 'Pro', 'Enterprise'
  price_monthly_cents INT NOT NULL,      -- 4900000, 9900000, 89900000
  price_annual_cents INT NOT NULL,       -- 49000000, 99000000, 89900000
  setup_fee_cents INT DEFAULT 0,         -- 0, 0, 150000000
  max_units INT,                         -- 4, 14, 50
  max_otas INT,                          -- 0, 3, 10
  max_staff INT,                         -- 2, 5, 20
  storage_mb INT,                        -- 500, 5120, 51200
  has_carta_digital BOOLEAN DEFAULT false,
  has_channel_manager BOOLEAN DEFAULT false,
  has_ai_agents BOOLEAN DEFAULT false,
  max_ai_agents INT DEFAULT 0,
  has_api_access BOOLEAN DEFAULT false,
  has_multi_property BOOLEAN DEFAULT false,
  max_properties INT DEFAULT 1,
  has_forensic_book BOOLEAN DEFAULT false,
  has_pos BOOLEAN DEFAULT false,
  max_concierge_chats INT DEFAULT 0,     -- 0, 0, 1000
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data
INSERT INTO plans (key, display_name, price_monthly_cents, price_annual_cents, setup_fee_cents, max_units, max_otas, max_staff, storage_mb, has_carta_digital, has_channel_manager, has_ai_agents, max_ai_agents, has_api_access, has_multi_property, max_properties, has_forensic_book, has_pos, max_concierge_chats) VALUES
('starter',    'Starter',    4900000,  49000000,  0,       4,  0,  2,  500,   false, false, false, 0, false, false, 1, false, false, 0),
('pro',        'Pro',        9900000,  99000000,  0,      14,  3,  5, 5120,   true,  true,  false, 0, false, false, 1, true,  true,  0),
('enterprise', 'Enterprise', 89900000, 899000000, 150000000, 50, 10, 20, 51200, true,  true,  true,  5, true,  true,  5, true,  true,  1000);
```

### 10.2 Tablas nuevas para Enterprise (futuro)

```sql
-- Agent Configuration
CREATE TABLE IF NOT EXISTS agent_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES hotels(id),
  agent_type TEXT NOT NULL,        -- 'concierge', 'revenue', 'ota_sync', 'review', 'carta_digital'
  enabled BOOLEAN DEFAULT true,
  mode TEXT DEFAULT 'suggest',     -- 'suggest' (human approves) or 'auto'
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Knowledge Base (training con MD)
CREATE TABLE IF NOT EXISTS agent_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES hotels(id),
  agent_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content_md TEXT NOT NULL,        -- Markdown con las reglas del hotel
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Activity Log
CREATE TABLE IF NOT EXISTS agent_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES hotels(id),
  agent_type TEXT NOT NULL,
  action TEXT NOT NULL,
  input JSONB,
  output JSONB,
  tokens_used INT,
  cost_cents INT,
  status TEXT,                     -- 'success', 'error', 'pending_approval'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Conversations (Concierge memory)
CREATE TABLE IF NOT EXISTS agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES hotels(id),
  guest_identifier TEXT,           -- phone, email, session_id
  messages JSONB NOT NULL,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Multi-property grouping
CREATE TABLE IF NOT EXISTS property_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE hotels ADD COLUMN IF NOT EXISTS property_group_id UUID REFERENCES property_groups(id);
```

---

## 11. Métricas de Éxito (KPIs)

| KPI | Target | Medición |
|-----|--------|----------|
| Conversión landing → trial | >5% | Analytics |
| Conversión trial → Starter | >40% | Billing |
| Conversión Starter → Pro | >15% en 90 días | Billing |
| Churn mensual | <3% | Billing |
| OTA bilingüe: reservas de extranjeros | >20% del total | Analytics |
| Respuesta promedio Concierge IA (futuro) | <3 segundos | Agent logs |
| Overbooking incidents | <1/mes | Event logs |

---

## 12. Sign-off

| Rol | Nombre | Fecha | Estado |
|-----|--------|-------|--------|
| Product Owner | — | — | Pending |
| Tech Lead | — | — | Pending |
| Engineering | — | — | Pending |

---

*Documento creado el 19 de Mayo, 2026. Versión 2.0 — Precios en COP, límites definidos, OTA bilingüe como Fase 0, Enterprise como fase futura.*
