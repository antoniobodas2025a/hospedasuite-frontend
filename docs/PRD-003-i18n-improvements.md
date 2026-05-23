# PRD-003: i18n — Type Safety + Dynamic Metadata + Cleanup

**Fecha:** 2026-05-23  
**Estado:** Draft  
**Autor:** Gentle AI (SDD Orchestrator)

---

## 1. Problema

El sistema de i18n funciona pero tiene 3 deficiencias:

1. **Sin type-safe keys:** Todas las llamadas `t('ota.search.guest')` son strings literales. Un typo solo se detecta en runtime.
2. **Metadata estática:** `<title>` y `<meta description>` están hardcodeados en un solo idioma en los layouts.
3. **Dead code:** El middleware de Supabase normaliza paths con prefijos `/en` y `/es` que nunca se generan.

---

## 2. Solución

### 2.1 Type-Safe Message Keys (next-intl `global.d.ts`)

next-intl soporta generación automática de tipos para las claves de mensajes. Esto da:
- Autocompletado en el IDE
- Errores de compilación si una clave no existe
- Refactor seguro

**Implementación:**
```ts
// src/i18n/global.d.ts
import en from '../../messages/en.json';
type Messages = typeof en;
declare global {
  type IntlMessages = Messages;
}
```

### 2.2 Dynamic Metadata por Locale

Cada layout debe generar `<title>` y `<meta description>` según el locale activo.

**Implementación:**
```tsx
// src/app/layout.tsx
import { getTranslations } from 'next-intl/server';

export async function generateMetadata() {
  const t = await getTranslations('common.metadata');
  return {
    title: t('title'),
    description: t('description'),
  };
}
```

### 2.3 Cleanup de Dead Code

Eliminar la normalización de prefijos `/en` y `/es` en `src/utils/supabase/middleware.ts` ya que el proyecto no usa path-based routing.

---

## 3. Scope

| Feature | Incluye | No Incluye |
|---------|---------|-------------|
| Type-safe keys | `global.d.ts`, TS compilation check | Migración de keys existentes |
| Dynamic metadata | Root layout + OTA layout + Direct layout | Páginas individuales (cada una ya tiene su metadata) |
| Dead code cleanup | Supabase middleware path normalization | Refactor de proxy.ts |

---

## 4. Arquitectura

```
┌─────────────────────────────────────────────────┐
│  Type-Safe Keys                                  │
│  messages/en.json → global.d.ts → IntlMessages  │
│  ↓                                                │
│  t('ota.search.guest') → autocomplete + type    │
│  t('typo.key') → ❌ TS error en compile time    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Dynamic Metadata                                │
│  Layout RSC → getTranslations('common.metadata')│
│  ↓                                                │
│  generateMetadata() → { title, description }    │
│  ↓                                                │
│  <head> con metadata en locale correcto         │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Dead Code Cleanup                               │
│  middleware.ts: remove ^\/(en|es) normalization │
│  ↓                                                │
│  Código más limpio, menos confusión             │
└─────────────────────────────────────────────────┘
```

---

## 5. Métricas de Éxito

| Métrica | Target |
|---------|--------|
| TS errors por typos en keys | 0 (detectados en compile time) |
| Metadata en locale correcto | 100% de layouts |
| Líneas de dead code eliminadas | ~10 líneas |

---

## 6. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| `global.d.ts` puede ser pesado si messages.json crece | next-intl lo maneja bien hasta ~500 claves (actualmente ~200) |
| Cambiar metadata puede afectar SEO existente | Los textos son equivalentes en ambos idiomas |
| Eliminar path normalization podría romper algo futuro | Se puede revertir con un commit; el código no se usa actualmente |
