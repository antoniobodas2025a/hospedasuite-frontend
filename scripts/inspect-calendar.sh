#!/bin/bash
# Script para inspeccionar el DOM del calendario en producción
# Uso: ./inspect-calendar.sh [url]

URL=${1:-"http://localhost:3000"}

echo " Inspeccionando calendario en: $URL"
echo "======================================"
echo ""

# Usar curl para obtener el HTML y buscar clases de react-day-picker
curl -s "$URL" | grep -o 'class="[^"]*rdp[^"]*"' | sort | uniq -c | sort -rn | head -20

echo ""
echo "📋 Clases CSS encontradas en el calendario:"
echo "======================================"
curl -s "$URL" | grep -oP 'rdp-\w+' | sort | uniq
