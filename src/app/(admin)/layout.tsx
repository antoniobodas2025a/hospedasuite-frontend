import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import SubscriptionBanner from '@/components/layout/SubscriptionBanner';
import PostHogProvider from '@/components/analytics/PostHogProvider';
import { getCurrentHotel } from '@/lib/hotel-context';
import type { TrialHotel } from '@/lib/trial-check';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  // Obtenemos los datos del hotel desde el servidor de forma segura
  const hotel = await getCurrentHotel();

  // 🚨 PROTECCIÓN DE SERIALIZACIÓN: Preparamos un objeto de usuario plano 
  // Previene fugas (leaks) de objetos complejos Supabase hacia componentes Client (RSC Boundary)
  const plainUser = {
    id: user.id,
    email: user.email
  };

  return (
    // Océano Profundo dark theme — PMS/Dashboard
    <div className='flex h-screen bg-sidebar text-sidebar-foreground overflow-hidden font-poppins selection:bg-brand-500/30 selection:text-brand-200 dark'>
      {/* 📊 PostHog Analytics */}
      <PostHogProvider
        hotelId={hotel?.id}
        email={plainUser.email}
        name={hotel?.name}
      />
      
      {/* Sidebar para Desktop */}
      <div className='hidden lg:block w-72 h-full border-r border-sidebar-border bg-sidebar/50 relative z-20'>
        <Sidebar 
          user={plainUser} 
          hotelName={hotel?.name || 'HospedaSuite'}
          subscriptionPlan={(hotel?.subscription_plan as 'starter' | 'pro' | 'enterprise') || 'starter'}
        />
      </div>

      {/* Contenido Principal */}
      <main className='flex-1 flex flex-col min-w-0 overflow-hidden relative bg-background'>
        {/* Nav para Móvil */}
        <MobileNav subscriptionPlan={(hotel?.subscription_plan as 'starter' | 'pro' | 'enterprise') || 'starter'} />
        
        {/* ⚠️ Banner de suscripción (si aplica) */}
        <div className="px-4 lg:px-8 pt-4 z-20">
          <SubscriptionBanner
            subscriptionStatus={hotel?.subscription_status}
            trialHotel={hotel ? {
              subscription_status: hotel.subscription_status,
              subscription_plan: hotel.subscription_plan,
              trial_ends_at: hotel.trial_ends_at,
            } as TrialHotel : undefined}
          />
        </div>
        
        {/* Área de Renderizado de Hijos (Paneles) */}
        <div className='flex-1 overflow-y-auto p-4 pb-48 md:pb-16 lg:p-8 custom-scrollbar relative z-10'>
          {children}
        </div>
      </main>
    </div>
  );
}