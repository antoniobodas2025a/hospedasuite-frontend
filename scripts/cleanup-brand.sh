#!/bin/bash

# ============================================================================
# BRAND PURGE SCRIPT — Limpieza automática de términos prohibidos
# ============================================================================
# Este script reemplaza términos como "OTA", "Marketplace", "Intermediarios"
# por el lenguaje del Brand Core OS ("Motor Propio", "Canales", etc.).
#
# Uso: bash scripts/cleanup-brand.sh
# ============================================================================

echo "🧹 Iniciando limpieza de marca..."

# 1. Archivos de configuración y lógica (manteniendo nombres internos si es necesario)
# Reemplazo de "OTA" por "Channel" en comentarios y UI
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/OTA/Channel/g' {} +
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/ota/channel/g' {} +

# 2. Reemplazos específicos de UI para el usuario final
# "Canales tradicionales" en lugar de "OTAs tradicionales"
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/Canales tradicionales/Canales tradicionales/g' {} +

# "Sincronización de Canales" en lugar de "Sincronización OTA"
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/Sincronización de Channels/Sincronización de Canales/g' {} +

# "Perfil de Canales" en lugar de "Perfil OTA"
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/Perfil de Channels/Perfil de Canales/g' {} +

# 3. Limpieza de términos prohibidos
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/Marketplace/Ecosistema/g' {} +
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/intermediarios/plataformas externas/g' {} +

echo "✅ Limpieza completada."
echo "⚠️  Revisá los cambios con 'git diff' antes de commitear."
