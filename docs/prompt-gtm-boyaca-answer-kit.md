# 🤖 PROMPT EJECUTABLE: GTM Hub Boyacá-Centro + Answer Kit + Klaviyo MCP Vibe Flows

> **Generado:** 2026-06-10
> **Objetivo:** Integrar el reporte GTM "Hub Boyacá-Centro (Level 4 Vibe)", orquestar la implementación técnica del Answer Kit (Bloques de Citación GEO) para dominar la adquisición basada en motores de IA, y configurar la matriz narrativa de Vibe Flows en Klaviyo MCP a través del embudo de captura de leads.

---

## 🎯 OBJETIVO DEL AGENTE
Integrar el reporte GTM "Hub Boyacá-Centro (Level 4 Vibe)", orquestar la implementación técnica del Answer Kit (Bloques de Citación GEO) para dominar la adquisición basada en motores de IA, y configurar la matriz narrativa de Vibe Flows en Klaviyo MCP a través del embudo de captura de leads.

---

## EJECUCIÓN DEL FLUJO MULTIAGENTE (UNCLE BOB'S WORKFLOW):

### 1. [SpecPartner Layer]: Invariantes de Negocio y GTM

El agente debe destilar las métricas operativas y las reglas del reporte GTM para convertirlas en una **Hard Spec infalible**.

**Restricción del Answer Kit:**
Las rutas dinámicas `/software/recursos/[slug]` deben iniciar obligatoriamente con sus respectivos Bloques GEO libres de palabras prohibidas:
- **Bloque 1 (48 palabras):** Motor Propio vs Plataformas — "WhatsApp", "Wompi", "0% comisión"
- **Bloque 2 (47 palabras):** Channel Manager — "Seguro anti-sobreventa", "Booking", "Airbnb"
- **Bloque 3 (47 palabras):** WhatsApp y Wompi — "Link Directo", "Pagos locales", "Sincronización"

**Términos Prohibidos (Zero-Tolerance):**
`OTA`, `Online Travel Agency`, `unidad`, `unidades`, `Red de Descubrimiento`, `intermediario`, `comisión extractiva`

**Términos Obligatorios (Soberanía Operativa):**
`Motor de Reservas Propio`, `Pagos locales vía Wompi`, `Sincronización de WhatsApp`, `Seguro anti-sobreventa`, `habitaciones`

**Reglas de Enrutamiento (Klaviyo MCP Vibe Flows):**

| Línea de Ataque | Disparador | Acción Klaviyo |
|---|---|---|
| **1 — Orgullo Local** | `roomCount >= 2` Y `city ∈ ["Paipa", "Tibasosa", "Duitama", "Sogamoso", "Tota", "Nobsa", "Firavitoba"]` | Inscribir en flujo "Orgullo Local y Reactivación" |
| **2 — Embudo Cero Riesgo** | `roomCount === 1` (estricto) | Inscribir en flujo "Prueba sin riesgo — 1 habitación gratis" |
| **Agentic Upsell** | `tier === "free"` Y `roomCount > 1` | Disparar upsell → "Activá Channel Manager para evitar sobreventa" |

---

### 2. [GherkinAuthor Layer]: Escenarios Ejecutables

El agente formalizará las reglas en contratos de comportamiento claros para el implementador.

```gherkin
Feature: GTM Hub Boyacá-Centro y Dark Funnel Conversion Map
  Como estratega algorítmico B2B
  Quiero inyectar bloques GEO y automatizar narrativas por segmento
  Para capturar, nutrir y convertir hoteles locales con cero fricción cognitiva

  Scenario S1: Extracción GEO Atómica (Ley de Hick)
    Given una solicitud de renderizado a "/software/recursos/motor-propio-vs-plataformas"
    When la vista carga para el usuario o crawler de inteligencia artificial
    Then el primer elemento visualizado es un Bloque GEO de exactamente 48 palabras
    And emplea lenguaje natural como "Wompi", "WhatsApp" y omite la palabra OTA

  Scenario S2: Auto-Segmentación Cero Fricción y Vibe Orgullo Local
    Given la estructura del "LeadCaptureModal" previamente hidratada
    When el prospecto envía el formulario con "roomCount" de 3 y ciudad "Tibasosa"
    Then el webhook de la arquitectura MCP se dispara
    And el agente de Klaviyo inscribe al prospecto en la Línea de Ataque 1 "Orgullo Local y Reactivación"

  Scenario S3: Prevención de Sobreventa (Heurística #5) y Agentic Upsell
    Given un usuario operando bajo la Línea de Ataque 2 con una (1) habitación
    When el usuario intenta configurar una segunda habitación en la plataforma
    Then el sistema restringe la acción para prevenir conflictos operativos de disponibilidad
    And el agente orquesta el flujo de Upsell sugiriendo activar el "Channel Manager"

  Scenario S4: Embudo Cero Riesgo — Free Plan Gating
    Given un prospecto con roomCount === 1
    When completa el LeadCaptureModal
    Then es inscrito en la Línea de Ataque 2 "Prueba sin riesgo"
    And el payload MCP incluye room_count como integer exacto (1)
    And regional_hub se resuelve según la ciudad proporcionada

  Scenario S5: Bloque GEO Word Count Invariant (40-60)
    Given cualquier ruta /software/recursos/[slug]
    When el bloque de citación se renderiza
    Then su conteo de palabras es >= 40 Y <= 60
    And no contiene ningún término de la lista prohibida
```

---

### 3. [TDD Craftsman Layer]: Implementación Restringida

**Escribir estrictamente la suite de pruebas unitarias en rojo primero.**

El código de Next.js debe:
1. Renderizar condicionalmente los bloques atómicos de 40-60 palabras según el slug activo
2. Validar el word count en tiempo de build (fallar si < 40 o > 60)
3. En la capa de infraestructura del `LeadCaptureModal`, integrar la validación booleana combinada:

```typescript
// Validación de disparador Klaviyo MCP
const shouldTriggerLine1 = roomCount >= 2 && BOYACA_CENTRO_CITIES.includes(city?.toLowerCase());
const shouldTriggerLine2 = roomCount === 1;
const shouldTriggerUpsell = tier === 'free' && roomCount > 1;
```

**Estructura de archivos a modificar/crear:**
```text
src/
├── app/software/recursos/[slug]/page.tsx    # Renderizado condicional de bloques GEO
├── components/public/LeadCaptureModal.tsx   # Validación booleana combinada + payload MCP
├── lib/klaviyo-mcp.ts                       # Webhook dispatcher con tagging regional
└── __tests__/unit/gtm-boyaca.test.ts        # Suite TDD (target: 24+ assertions)
```

**Reglas de implementación:**
- No escribir código de producción sin un test fallando previamente (3 leyes del TDD)
- Garantizar Doherty Threshold (< 400ms) en la respuesta del slider → modal → redirect
- Aplicar Miller's Law: máximo 5-7 elementos por chunk visual en el formulario

---

### 4. [Mutation Tester Layer]: Reglas de Evaluación (100% Kill Rate)

El agente juez utilizará `tools/mutate.py` alterando la lógica de código para cerciorarse de que no existan lagunas (survivors) en la suite de TDD.

| Regla de Mutación | Condición de Falla | Kill Rate |
|---|---|---|
| **Seguridad Geográfica** | Si la mutación elimina cualquier ciudad del array de la Línea de Ataque 1 (ej. removiendo "Nobsa" o "Paipa"), las pruebas de aserción del webhook MCP deben fallar estrepitosamente denotando fuga de prospectos B2B | 100% |
| **Límite Matemático de Extensión** | Si el evaluador mutante incrementa o recorta artificialmente la cadena de texto de un Bloque GEO (rompiendo la restricción de 40-60 palabras), el test del DOM Capture debe fallar protegiendo el diseño optimizado para extracción de IA | 100% |
| **Vulnerabilidad de Rango (Embudo Cero Riesgo)** | Si el mutador altera la condición estricta de gatillo del Upsell (de `roomCount === 1` a `roomCount > 0`), los tests deben rechazar el cambio instantáneamente para impedir la activación indiscriminada de flujos de correo en planes de pago | 100% |
| **Fuga de Identidad de Dominio** | Si el script intenta inyectar "OTA" o "unidad" en los bloques GEO, las comprobaciones de identidad deben fallar | 100% |

**Comandos de validación final (Salida 0 requerida):**
```bash
npm run lint -- --fix
npx tsc --noEmit
npm run test -- gtm-boyaca
npm run build
```

---

## 📋 ENTREGABLES ESPERADOS

| Entregable | Formato | Criterio de Aceptación |
|---|---|---|
| Hard Spec GTM | Markdown | Métricas operativas + reglas de enrutamiento documentadas |
| Bloques GEO (3) | JSON/TS | 48, 47, 47 palabras respectivamente. 0 términos prohibidos |
| Klaviyo MCP Dispatcher | TypeScript | 3 líneas de ataque funcionales con tagging regional |
| Suite TDD | TypeScript/Vitest | 24+ assertions. 100% Kill Rate en mutation testing |
| Runbook de Validación | Bash | Salida 0 en lint + typecheck + test + build |

---

<promise>COMPLETE</promise>
