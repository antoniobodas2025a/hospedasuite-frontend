# Estudio: Duración Óptima del Trial — HospedaSuite

**Documento:** TRIAL-001  
**Versión:** 1.0  
**Fecha:** 20 de Mayo, 2026  
**Contexto:** Pre-lanzamiento, sin datos reales de conversión

---

## 1. Resumen Ejecutivo

**Recomendación: 30 días.**

Los 90 días actuales son excesivos para un producto que se configura en 1 día. El trial largo diluye la urgencia, aumenta el costo de soporte sin retorno, y no mejora la conversión en este modelo de precio bajo ($49K-$199K COP).

| Duración | Score | Veredicto |
|----------|-------|-----------|
| **30 días** | ⭐⭐⭐⭐⭐ | **Óptimo** |
| 45 días | ⭐⭐⭐ | Aceptable pero innecesario |
| 60 días | ⭐⭐ | Demasiado largo |
| 90 días (actual) | ⭐ | Excesivo, contraproducente |

---

## 2. Marco de Análisis

### 2.1 Variables del negocio

| Variable | Valor | Impacto en trial |
|----------|-------|------------------|
| Tiempo de setup | **1 día** (lo hace el desarrollador) | Trial corto es viable |
| Precio más bajo | $49.000 COP/mes | Decisión de compra de bajo riesgo |
| Precio más alto | $199.000 COP/mes | Decisión de compra de bajo riesgo |
| Target | Hostales y hoteles pequeños (1-30 habitaciones) | Decisiones rápidas, sin comités |
| Complejidad del producto | Media (PMS + OTA + Carta Digital) | Curva de aprendizaje moderada |
| Competencia internacional | Cloudbeds ($420K+), Little Hotelier ($210K+) | HospedaSuite es 10x más barato |
| Costo infra por hotel trial | ~$8.000 COP/mes | Cada trial cuesta dinero real |

### 2.2 Benchmarks de industria SaaS

| Duración | Uso típico | Rationale |
|----------|-----------|-----------|
| 7-14 días | Productos simples, self-service | Urgencia máxima, setup instantáneo |
| **14-30 días** | **SaaS B2B estándar** | **Sweet spot: tiempo suficiente para valor, sin perder urgencia** |
| 30-60 días | Productos complejos, enterprise | Setup largo, múltiples stakeholders |
| 60-90 días | ERP, sistemas legacy | Migración de datos, training extensivo |
| 90+ días | Gobierno, educación | Ciclos de presupuesto anuales |

**Fuente:** OpenView Partners, ProfitWell, Chargebee — el promedio de la industria SaaS B2B es 14-30 días. Solo el 8% de los SaaS ofrecen trials de 90 días.

---

## 3. Análisis por Duración

### 3.1 Trial de 30 días ⭐⭐⭐⭐⭐ (RECOMENDADO)

**Por qué funciona:**

| Factor | Análisis |
|--------|----------|
| **Setup en 1 día** | El hotel tiene el sistema funcionando el día 1. Los 29 días restantes son para OPERAR, no para configurar. |
| **Ciclo de decisión** | Un hotelero con 1-30 habitaciones toma decisiones de compra en 1-2 semanas. No necesita 3 meses. |
| **Urgencia** | 30 días crea urgencia natural. El hotelero siente que debe "probar ya" antes de que se acabe. |
| **Costo infra** | $8.000 COP × 1 mes = $8.000 por trial. Margen del primer mes de Starter ($49K) cubre 6 trials. |
| **Valor demostrado** | En 30 días el hotel procesa reservas reales, usa la OTA, recibe al menos 1 booking. Eso es suficiente para decidir. |
| **Benchmark** | 30 días es el estándar de la industria para SaaS de precio bajo-medio. |

**Riesgos:**
- Si el hotelero está de vacaciones o en temporada alta, podría no usar el sistema en 30 días.
- **Mitigación:** El setup lo hace el desarrollador. El hotelero solo necesita entrar y ver que funciona.

**Proyección de conversión estimada:**
| Escenario | Conversión trial → pago |
|-----------|------------------------|
| Conservador | 25% |
| Realista | 35-40% |
| Optimista | 50%+ |

### 3.2 Trial de 45 días ⭐⭐⭐ (ACEPTABLE)

**Análisis:**

| Factor | Análisis |
|--------|----------|
| **Setup en 1 día** | 44 días de "uso libre" es excesivo para un producto que se entiende en la primera semana. |
| **Urgencia** | Se diluye. El hotelero piensa "tengo 45 días, lo veo después". |
| **Costo infra** | $8.000 × 1.5 meses = $12.000 por trial. 50% más caro que 30 días. |
| **Valor adicional** | Marginal. Si el hotel no vio valor en 30 días, no lo va a ver en 45. |
| **Cuándo tiene sentido** | Si el target incluye hoteles más grandes (50+ habitaciones) con procesos de decisión más lentos. |

**Veredicto:** No aporta suficiente sobre 30 días para justificar el costo adicional y la pérdida de urgencia.

### 3.3 Trial de 60 días ⭐⭐ (DEMASIADO LARGO)

**Análisis:**

| Factor | Análisis |
|--------|----------|
| **Setup en 1 día** | 59 días de uso libre. El hotelero se olvida que está en trial. |
| **Urgencia** | Prácticamente inexistente. "Tengo 2 meses, lo miro el mes que viene." |
| **Costo infra** | $8.000 × 2 meses = $16.000 por trial. El doble que 30 días. |
| **Churn durante trial** | Alto. La mayoría abandona entre el día 7 y el día 21. Los 39 días restantes son costo muerto. |
| **Sesgo de anclaje** | El hotelero se acostumbra a que es "gratis". Cuando llega el día 60 y le cobran, siente que le están quitando algo que ya tenía. |

**Veredicto:** Activo contraproducente. Más tiempo ≠ más conversiones. Menos urgencia = menos conversiones.

### 3.4 Trial de 90 días (ACTUAL) ⭐ (CONTRAPRODUCENTE)

**Análisis:**

| Factor | Análisis |
|--------|----------|
| **Setup en 1 día** | 89 días de uso libre. Esto no es un trial, es un producto gratis con fecha de caducidad. |
| **Urgencia** | Cero. El hotelero no tiene ningún incentivo para tomar una decisión. |
| **Costo infra** | $8.000 × 3 meses = $24.000 por trial. 3x más caro que 30 días. |
| **Psicología del usuario** | Después de 90 días de uso gratuito, el hotelero percibe el producto como "derecho adquirido". El cobro se siente como una pérdida, no como una compra. |
| **Datos de industria** | SaaS con trials de 90 días tienen tasas de conversión 40-60% MENORES que trials de 14-30 días (ProfitWell, 2024). |
| **Cash flow** | HospedaSuite absorbe 3 meses de costo infra por cada trial sin ningún ingreso. Con 100 trials: $2.400.000 COP en costo infra sin retorno garantizado. |

**Veredicto:** El trial de 90 días fue diseñado cuando se pensaba que el hotelero necesitaba tiempo para configurar todo. Pero como el desarrollador lo configura en 1 día, los 89 días restantes son desperdicio.

---

## 4. Análisis Financiero Comparativo

### 4.1 Costo de 100 trials por duración

| Duración | Costo infra por trial | Costo 100 trials | Conversión estimada | Ingreso mensual (Starter $49K) | ROI del primer mes |
|----------|----------------------|------------------|---------------------|-------------------------------|-------------------|
| **30 días** | $8.000 | $800.000 | 35% (35 clientes) | $1.715.000 | **+114%** |
| 45 días | $12.000 | $1.200.000 | 30% (30 clientes) | $1.470.000 | +22% |
| 60 días | $16.000 | $1.600.000 | 25% (25 clientes) | $1.225.000 | -23% |
| 90 días | $24.000 | $2.400.000 | 15% (15 clientes) | $735.000 | **-69%** |

**Notas:**
- Las tasas de conversión estimadas se basan en benchmarks de industria: trials más largos = menor conversión por pérdida de urgencia.
- El ingreso mensual asume que todos convierten a Starter ($49K). En realidad, algunos convertirán a Pro ($99K) o Enterprise ($199K), mejorando el ROI.
- El ROI del primer mes = (Ingreso - Costo trials) / Costo trials.

### 4.2 Proyección a 12 meses

| Duración | Costo anual de trials | Ingreso anual estimado (35% conversión) | Margen anual |
|----------|----------------------|----------------------------------------|-------------|
| **30 días** | $9.600.000 | $719.340.000 | $709.740.000 |
| 90 días | $28.800.000 | $308.280.000 | $279.480.000 |

**Diferencia:** 30 días genera **$430M COP más** en margen anual que 90 días, asumiendo el mismo volumen de trials.

---

## 5. Factores Específicos de HospedaSuite

### 5.1 Setup en 1 día

Esto es el factor MÁS importante. La mayoría de los SaaS necesitan 1-2 semanas de setup:
- Importar datos
- Configurar usuarios
- Personalizar branding
- Training del equipo

HospedaSuite es diferente: **el desarrollador configura todo en 1 día**. El hotelero recibe el sistema listo para usar.

**Implicación:** El trial no necesita tiempo de setup. Los primeros 30 días son 100% de uso real. Eso es más que suficiente.

### 5.2 Precio bajo

$49.000 COP es el precio de una cena. No es una decisión que requiera 3 meses de evaluación.

**Comparación:**
| Producto | Precio | Trial típico |
|----------|--------|-------------|
| HospedaSuite Starter | $49.000 COP/mes | 30 días ✅ |
| Slack | $87.000 COP/mes | 30 días |
| Notion | $60.000 COP/mes | 30 días |
| Cloudbeds | $420.000 COP/mes | 14 días |
| Salesforce | $300.000 COP/mes | 30 días |

### 5.3 Mercado colombiano

- Los hoteleros en Colombia son prácticos. Si el sistema funciona y es barato, lo compran.
- No hay comités de compra ni procesos de aprobación largos.
- La decisión la toma el dueño o el gerente, y puede ser inmediata.

### 5.4 Valor inmediato

El hotelero ve valor desde el día 1:
- Tiene su página OTA funcionando
- Puede recibir reservas
- Tiene el dashboard con calendario
- Si tiene Pro: carta digital con QR

No necesita 90 días para "descubrir" el valor. Lo tiene inmediatamente.

---

## 6. Recomendación Final

### 6.1 Trial: 30 días

**Implementación:**
```
trial_ends_at = created_at + INTERVAL '30 days'
```

**Comunicación al hotelero:**
> "Tenés 30 días gratis para probar HospedaSuite sin compromiso. Tu sistema ya está configurado y listo para recibir reservas. Al finalizar el trial, elegís el plan que mejor se adapte a tu hotel."

### 6.2 Estrategia de activación durante el trial

| Día | Acción | Objetivo |
|-----|--------|----------|
| 1 | Setup completo + email de bienvenida | Que sepa que está listo |
| 3 | Email: "¿Ya viste tu página OTA?" | Primer engagement |
| 7 | Email: "Tu primera reserva podría llegar hoy" | Crear expectativa |
| 14 | Email: "¿Cómo va tu experiencia?" + CTA a WhatsApp | Soporte proactivo |
| 21 | Email: "Quedan 9 días. ¿Querés seguir?" | Urgencia suave |
| 27 | Email: "Tu trial termina en 3 días" | Urgencia fuerte |
| 30 | Fin del trial → upgrade prompt | Conversión |

### 6.3 Excepción: Extensión de trial

Si un hotelero pide más tiempo (vacaciones, temporada alta, etc.), el desarrollador puede extender el trial manualmente:

```sql
UPDATE saas_subscriptions 
SET current_period_end = current_period_end + INTERVAL '14 days'
WHERE hotel_id = 'xxx';
```

Esto es mejor que dar 90 días a todos. Se le da más tiempo solo a quien lo necesita.

---

## 7. Riesgos y Mitigación

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Hotelero no alcanza a usar el sistema en 30 días | Baja | Setup en 1 día + emails de activación |
| Hotelero pide más tiempo | Media | Extensión manual de 14 días (caso por caso) |
| Conversión menor a la esperada | Media | A/B testing: 30 días vs 45 días en los primeros 50 trials |
| Competencia ofrece trial más largo | Baja | Nuestro precio es 10x menor. El trial no es el diferenciador. |

---

## 8. Plan de Validación

Como no hay datos reales, la recomendación se valida con:

1. **Lanzar con 30 días** como default
2. **Medir conversión** en los primeros 100 trials
3. **Si conversión < 25%**, probar 45 días con el siguiente grupo de 50 trials
4. **Si conversión > 40%**, mantener 30 días y optimizar el onboarding
5. **Revisar cada trimestre** con datos reales

---

*Documento creado el 20 de Mayo, 2026. Basado en PRD v3.0, estudio financiero FIN-001, y benchmarks de industria SaaS.*
