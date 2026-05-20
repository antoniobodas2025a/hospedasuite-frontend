# Estudio Financiero: Enterprise 15-30 Unidades sin IA

**Documento:** FIN-001  
**Fecha:** 19 de Mayo, 2026

---

## 1. Definición del Nuevo Enterprise

| Característica | Valor |
|----------------|-------|
| **Rango** | 15-30 unidades (habitaciones) |
| **Precio** | $199.000 COP/mes |
| **Trial** | 3 meses gratis (igual que Starter y Pro) |
| **Setup fee** | $0 |
| **IA** | ❌ No incluida |
| **Features adicionales vs Pro** | Más unidades, más OTAs, más staff, prioridad soporte |

### Features del Enterprise (sin IA)

| Feature | Pro | Enterprise |
|---------|-----|------------|
| Unidades | Hasta 14 | 15-30 |
| OTAs conectadas | 3 | 6 |
| Staff accounts | 5 | 15 |
| Almacenamiento | 5 GB | 20 GB |
| Carta Digital | ✅ | ✅ |
| Channel Manager | ✅ (3 OTAs) | ✅ (6 OTAs) |
| POS | ✅ | ✅ |
| Libro Registro | ✅ | ✅ |
| Soporte | Email + Chat | Email + Chat + Prioridad |
| Reportes | Básicos | Avanzados |
| Multi-propiedad | ❌ | ❌ (fase futura) |
| IA Agents | ❌ | ❌ (add-on futuro) |

---

## 2. Análisis de Costos por Plan

| Concepto | Starter | Pro | Enterprise |
|----------|---------|-----|------------|
| Supabase (storage + compute) | ~$3.000 | ~$5.000 | ~$10.000 |
| Cloudflare R2 (imágenes) | ~$1.000 | ~$2.000 | ~$5.000 |
| QStash (sync iCal) | $0 | ~$3.000 | ~$5.000 |
| Wompi fees (2.9%) | ~$1.500 | ~$3.000 | ~$6.000 |
| Soporte estimado | ~$5.000 | ~$8.000 | ~$15.000 |
| **Total costo/hotel/mes** | **~$10.500** | **~$21.000** | **~$41.000** |

### Margen por Plan

| Plan | Precio | Costo | Margen COP | Margen % |
|------|--------|-------|-----------|----------|
| Starter | $49.000 | $10.500 | $38.500 | 79% |
| Pro | $99.000 | $21.000 | $78.000 | 79% |
| **Enterprise** | **$199.000** | **$41.000** | **$158.000** | **79%** |

**El margen se mantiene constante al 79% porque los costos son proporcionales al uso.**

---

## 3. Proyección Financiera (12 meses)

### Escenario Conservador

| Mes | Starter | Pro | Enterprise | MRR Total |
|-----|---------|-----|------------|-----------|
| 1 | 20 × $49K = $980K | 5 × $99K = $495K | 1 × $199K = $199K | $1.674.000 |
| 3 | 40 × $49K = $1.960K | 12 × $99K = $1.188K | 2 × $199K = $398K | $3.546.000 |
| 6 | 70 × $49K = $3.430K | 25 × $99K = $2.475K | 5 × $199K = $995K | $6.900.000 |
| 9 | 100 × $49K = $4.900K | 40 × $99K = $3.960K | 8 × $199K = $1.592K | $10.452.000 |
| 12 | 120 × $49K = $5.880K | 50 × $99K = $4.950K | 12 × $199K = $2.388K | $13.218.000 |

**ARR a 12 meses:** ~$158.600.000 COP (~$37.800 USD)

### Costos Operativos (Mes 12)

| Concepto | Costo mensual |
|----------|---------------|
| VPS Hetzner CX22 | ~$20.000 |
| Supabase (escalado) | ~$50.000 |
| Cloudflare R2 | ~$15.000 |
| Wompi fees (2.9% del MRR) | ~$383.000 |
| QStash (sync) | ~$60.000 |
| Soporte (1 part-time) | ~$500.000 |
| **Total** | **~$1.028.000** |

### Margen Neto (Mes 12)

```
Revenue:    $13.218.000
Costos:     $1.028.000
Margen:     $12.190.000 (92%)
```

### Comparación de Escenarios

| Escenario | MRR Mes 12 | Costos | Margen Neto | % |
|-----------|-----------|--------|------------|---|
| Sin Enterprise | $12.422.000 | $1.710.000 | $10.712.000 | 86% |
| **Con Enterprise $199K** | **$13.218.000** | **$1.028.000** | **$12.190.000** | **92%** |
| Con Enterprise IA ($899K) | $12.410.000 | $1.695.000 | $10.715.000 | 86% |

**Con Enterprise sin IA:**
- ✅ $1.478.000 COP más de margen mensual vs sin Enterprise
- ✅ $1.475.000 COP más de margen vs Enterprise con IA
- ✅ 92% de margen (el más alto)
- ✅ Cero costo de IA
- ✅ Cero complejidad de agentes
- ✅ Se implementa con lo que ya existe (solo cambiar límites)

---

## 4. Veredicto

**Enterprise sin IA a $199.000 COP/mes es la mejor opción financiera.**

- Cubre hoteles de 15-30 unidades que hoy no tienen plan
- No requiere infra nueva (solo cambiar límites en DB)
- Margen del 92%
- Se puede implementar en 1 día de desarrollo
- Los 3 meses gratis aplican igual que Starter y Pro

---

*Estudio creado el 19 de Mayo, 2026.*
