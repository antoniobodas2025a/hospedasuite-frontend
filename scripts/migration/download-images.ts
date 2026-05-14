/**
 * Script de migración: Descarga todas las fotos de Supabase Storage
 * Las guarda localmente organizadas por carpetas, listas para subir a R2.
 *
 * Uso:
 *   npx tsx scripts/migration/download-images.ts
 *
 * Output: ./supabase-export/YYYY-MM-DD/ (organizado por carpetas del bucket)
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = 'hotel-media';
const EXPORT_DIR = path.join(process.cwd(), 'supabase-export');

interface ImageRecord {
  path: string;
  url: string;
}

async function downloadFile(filePath: string, destPath: string): Promise<boolean> {
  const { data, error } = await supabase.storage.from(BUCKET).download(filePath);

  if (error) {
    console.error(`  ❌ Error descargando ${filePath}:`, error.message);
    return false;
  }

  // Crear directorio si no existe
  fs.mkdirSync(path.dirname(destPath), { recursive: true });

  // Guardar como blob/arrayBuffer
  const buffer = Buffer.from(await data.arrayBuffer());
  fs.writeFileSync(destPath, buffer);

  const sizeKB = (buffer.length / 1024).toFixed(1);
  console.log(`  ✅ ${filePath} (${sizeKB} KB)`);
  return true;
}

async function listAllFiles(prefix: string = ''): Promise<string[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
    limit: 1000,
    offset: 0,
    sortBy: { column: 'name', order: 'asc' },
  });

  if (error) {
    console.error(`Error listing ${prefix}:`, error.message);
    return [];
  }

  const paths: string[] = [];

  for (const item of data || []) {
    if (!item.name) continue;

    const fullPath = `${prefix}${item.name}`;

    // Supabase JS v2: los archivos tienen metadata, los directorios no
    const hasMetadata = (item as any).metadata && (item as any).metadata.mimetype;

    if (hasMetadata) {
      // Es un archivo
      paths.push(fullPath);
    } else {
      // Es un directorio — recursivo
      const subPaths = await listAllFiles(`${fullPath}/`);
      paths.push(...subPaths);
    }
  }

  return paths;
}

async function main() {
  console.log('📥 Descargando todas las fotos de Supabase...\n');

  // Crear directorio de export con fecha
  const date = new Date().toISOString().split('T')[0];
  const outputDir = path.join(EXPORT_DIR, date);
  fs.mkdirSync(outputDir, { recursive: true });

  // Listar todos los archivos del bucket
  console.log('🔍 Escaneando bucket...');
  const allFiles = await listAllFiles();
  console.log(`📁 ${allFiles.length} archivos encontrados\n`);

  if (allFiles.length === 0) {
    console.log('No hay archivos en el bucket.');
    return;
  }

  // Descargar cada archivo
  let success = 0;
  let failed = 0;
  let totalBytes = 0;

  for (const filePath of allFiles) {
    const destPath = path.join(outputDir, filePath);
    const ok = await downloadFile(filePath, destPath);
    if (ok) {
      success++;
      try {
        totalBytes += fs.statSync(destPath).size;
      } catch {}
    } else {
      failed++;
    }
  }

  // Generar manifiesto
  const manifest = {
    exported_at: new Date().toISOString(),
    bucket: BUCKET,
    total_files: allFiles.length,
    success,
    failed,
    total_size_mb: (totalBytes / (1024 * 1024)).toFixed(2),
    output_dir: outputDir,
    files: allFiles.map((f) => ({
      original_path: f,
      local_path: path.relative(process.cwd(), path.join(outputDir, f)),
      r2_key: f, // La misma ruta se usa como key en R2
    })),
  };

  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`\n${'='.repeat(50)}`);
  console.log('📊 Resumen de descarga:');
  console.log(`   ✅ ${success} archivos descargados`);
  console.log(`   ❌ ${failed} archivos fallidos`);
  console.log(`   💾 ${(totalBytes / (1024 * 1024)).toFixed(2)} MB totales`);
  console.log(`   📁 Directorio: ${outputDir}`);
  console.log(`   📋 Manifiesto: ${manifestPath}`);
  console.log(`${'='.repeat(50)}`);
  console.log('\n📋 Próximos pasos:');
  console.log('   1. Revisar los archivos descargados');
  console.log('   2. Instalar wrangler: npm i -g wrangler');
  console.log('   3. Login a Cloudflare: wrangler login');
  console.log('   4. Subir a R2: wrangler r2 object put <bucket> --file <archivo>');
  console.log('   O usar el script upload-to-r2.ts (próximo paso)');
}

main().catch(console.error);
