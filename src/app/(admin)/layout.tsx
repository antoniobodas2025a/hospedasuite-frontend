import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import SubscriptionBanner from '@/components/layout/SubscriptionBanner';
import PostHogProvider from '@/components/analytics/PostHogProvider';
import { getCurrentHotel, getStaffSession, getStaffHotel } from '@/lib/hotel-context';
import type { TrialHotel } from '@/lib/trial-check';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // 1. Verificación dual: Admin Auth O Staff Cookie
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const staffSession = await getStaffSession();

  // Si no hay NINGUNA sesión activa, expulsar al login
  if (!user && !staffSession) {
    return redirect('/login');
  }

  // 2. Resolver hotel según tipo de sesión
  let hotel = null;
  let plainUser: { id: string; email?: string } | undefined = undefined;
  let staffIdentity: { id: string; name: string; role: string } | undefined = undefined;

  if (user) {
    // Sesión de Admin
    hotel = await getCurrentHotel();
    plainUser = {
      id: user.id,
      email: user.email
    };
  } else if (staffSession) {
    // Sesión de Staff
    hotel = await getStaffHotel();
    staffIdentity = {
      id: staffSession.id,
      name: staffSession.name,
      role: staffSession.role,
    };
  }

  // Si no se pudo resolver el hotel, redirigir
  if (!hotel) {
    return redirect('/staff-login');
  }

  return (
    // Océano Profundo dark theme — PMS/Dashboard
    <div className='flex h-screen bg-sidebar text-sidebar-foreground overflow-hidden font-poppins selection:bg-brand-500/30 selection:text-brand-200 dark'>
      {/* 📊 PostHog Analytics */}
      <PostHogProvider
        hotelId={hotel?.id}
        email={plainUser?.email}
        name={hotel?.name}
      />
      
      {/* Sidebar para Desktop */}
      <div className='hidden lg:block w-72 h-full border-r border-sidebar-border bg-sidebar/50 relative z-20'>
        <Sidebar 
          user={plainUser}
          staffIdentity={staffIdentity}
          hotelName={hotel?.name || 'HospedaSuite'}
          subscriptionPlan={(hotel?.subscription_plan as 'starter' | 'pro' | 'enterprise') || 'starter'}
        />
      </div>

      {/* Contenido Principal */}
      <main className='flex-1 flex flex-col min-w-0 overflow-hidden relative bg-background'>
        {/* Nav para Móvil */}
        <MobileNav 
          subscriptionPlan={(hotel?.subscription_plan as 'starter' | 'pro' | 'enterprise') || 'starter'}
          staffIdentity={staffIdentity}
        />
        
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
        {/* P1: pb-28 replaces pb-48 — dock is at bottom-6, not bottom-0. Saves ~80px viewport on mobile. */}
        <div className='flex-1 overflow-y-auto p-4 pb-28 md:pb-16 lg:p-8 custom-scrollbar relative z-10'>
          {children}
        </div>
      </main>
    </div>
  );
}