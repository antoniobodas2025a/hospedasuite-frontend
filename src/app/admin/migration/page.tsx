import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import MigrationPanel from '@/components/admin/MigrationPanel';

export default async function MigrationPage() {
  const supabase = await createClient();
  
  // TEMPORAL: Sin verificación de autenticación para staging
  // TODO: Revertir antes de producción
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Panel de Administración - Migración
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Herramienta de migración de imágenes de hoteles
          </p>
          <div className="mt-4 p-4 bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 rounded">
            <p className="text-yellow-800 dark:text-yellow-200 text-sm">
              ⚠️ <strong>ATENCIÓN:</strong> Esta ruta temporal no requiere autenticación. 
              Solo para uso en staging. No usar en producción.
            </p>
          </div>
        </div>
        
        <MigrationPanel />
      </div>
    </div>
  );
}
