# Proposal: Búsqueda Inteligente por Veredas y Zonas

**Change**: `smart-location-search`
**Type**: Enhancement
**Scope**: searchLocationsAction + fuzzySearch + searchSuggestions

## Problem

El buscador actual solo indexa `city` para autocomplete y búsqueda. Si un hotel está en "Vereda Boquía, Salento" y un usuario busca "Boquía", no encuentra nada. Para glampings y hoteles boutique en zonas rurales, esto es un blocker.

## Solution

Indexar también `location` (zona/vereda/barrio) en:

1. **searchLocationsAction** (autocomplete del wizard y OTA): buscar en `city` Y `location`
2. **fuzzySearch** (búsqueda tipográfica): incluir `location` en el índice
3. **fetchOTAHotelsAction**: ya busca en `location` — verificar

## Files

- `src/app/actions/ota.ts:searchLocationsAction` — líneas 50-80
- `src/lib/fuzzy-search.ts` — línea 76
- `src/components/ota/OTADashboard.tsx` — llamadas a fuzzySearch

## Risks

- Bajo: cambios acotados a funciones de búsqueda existentes
- Sin migraciones de DB
- Sin cambios de schema

## Acceptance

- [ ] Buscar "Boquía" devuelve hoteles con location "Vereda Boquía"
- [ ] Buscar "Sierra Nevada" funciona como antes
- [ ] Autocomplete muestra veredas además de ciudades
