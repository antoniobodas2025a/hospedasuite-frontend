import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import MigrationPanel from '@/components/admin/MigrationPanel';

export default async function MigrationPage() {
  const supabase = await createClient();
  
  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // Verificar rol de administrador
  const { data: staff } = await supabase
    .from('staff')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!staff || staff.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Panel de Administración
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Herramientas de administración del sistema
          </p>
        </div>
        
        <MigrationPanel />
      </div>
    </div>
  );
}
