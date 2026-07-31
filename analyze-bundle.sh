#!/bin/bash
echo " Analizando bundle de Next.js..."
echo "=================================="
echo ""

# Tamaño total de chunks
echo "📊 Tamaño total de chunks:"
du -sh .next/static/chunks/ | cut -f1
echo ""

# Top 10 chunks más pesados
echo "📦 Top 10 chunks más pesados:"
ls -lh .next/static/chunks/*.js 2>/dev/null | sort -k5 -h | tail -10 | awk '{print $5, $9}' | sed 's|.next/static/chunks/||'
echo ""

# Análisis de dependencias comunes
echo "🔗 Dependencias en chunks grandes:"
for chunk in $(ls -lh .next/static/chunks/*.js | sort -k5 -h | tail -3 | awk '{print $9}'); do
  echo "  $chunk:"
  grep -oE "(framer-motion|leaflet|@supabase|lucide-react|next-intl|react-dom)" "$chunk" | sort | uniq -c | sort -rn | head -3
  echo ""
done

echo "✅ Análisis completado"
