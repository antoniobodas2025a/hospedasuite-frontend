import { Suspense } from 'react';
import DemoOnboardingClient from './DemoOnboardingClient';

export const dynamic = 'force-dynamic';

export default function DemoOnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-zinc-500">Cargando demo...</p>
      </div>
    }>
      <DemoOnboardingClient />
    </Suspense>
  );
}
