/**
 * 🔍 Audit RLS — Verifica que todas las tablas de negocio tengan RLS habilitado
 *
 * Ejecutar: node scripts/audit-rls.mjs
 *
 * Falla si encuentra tablas de negocio sin Row Level Security.
 */

import { execSync } from 'child_process';
import { config } from 'dotenv';

config({ path: '.env.local' });

// Tablas de negocio que DEBEN tener RLS
const BUSINESS_TABLES = [
  'hotels',
  'rooms',
  'bookings',
  'guests',
  'staff',
  'service_items',
  'payments',
  'menu_items',
  'hunted_leads',
  'upsell_transactions',
  'billing_invoices',
  'audit_logs',
];

function auditRLS() {
  console.log('🔍 Auditando RLS en tablas de negocio...\n');

  const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.log('⚠️  No se encontró DIRECT_URL o DATABASE_URL en .env.local');
    console.log('📋 No se puede verificar RLS automáticamente.');
    console.log('\n📋 Verificá manualmente en Supabase:');
    console.log('   Table Editor → cada tabla → "Row Level Security" debe estar ON.');
    console.log('\n📋 O agregá DIRECT_URL a tu .env.local:');
    console.log('   DIRECT_URL="postgresql://postgres:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"');
    process.exit(0);
  }

  try {
    const query = `
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN (${BUSINESS_TABLES.map(t => `'${t}'`).join(',')})
      ORDER BY tablename;
    `;

    const result = execSync(`psql "${dbUrl}" -t -A -c "${query.replace(/\n/g, ' ')}"`, {
      encoding: 'utf-8',
    });

    const lines = result.trim().split('\n').filter(l => l.length > 0);
    
    if (lines.length === 0) {
      console.log('⚠️  No se encontraron tablas. Verificá la conexión.');
      process.exit(1);
    }

    const disabledRLS = lines.filter(line => {
      const [name, rls] = line.split('|');
      return rls.trim() === 'f';
    });

    if (disabledRLS.length > 0) {
      console.log(`\n🚨 CRÍTICO: ${disabledRLS.length} tabla(s) sin RLS:`);
      disabledRLS.forEach(line => {
        const [name] = line.split('|');
        console.log(`   ❌ ${name.trim()} — RLS DESHABILITADO`);
      });
      console.log('\n📋 Para habilitar RLS:');
      disabledRLS.forEach(line => {
        const [name] = line.split('|');
        console.log(`   ALTER TABLE ${name.trim()} ENABLE ROW LEVEL SECURITY;`);
      });
      process.exit(1);
    }

    console.log('✅ Todas las tablas de negocio tienen RLS habilitado.');
    console.log(`   (${lines.length}/${BUSINESS_TABLES.length} verificadas)`);
  } catch (error) {
    console.error('❌ Error ejecutando psql:', error.message);
    process.exit(1);
  }
}

auditRLS();
