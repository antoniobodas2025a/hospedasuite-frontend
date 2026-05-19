import { Suspense } from 'react';
import OnboardingClient from './OnboardingClient';

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Cargando onboarding...</p>
      </div>
    }>
      <OnboardingClient />
    </Suspense>
  );
}
