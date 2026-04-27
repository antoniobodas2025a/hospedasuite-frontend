'use client';

import { useState } from 'react';
import { injectDemoDataAction } from '@/app/actions/seeding';
import { Rocket, Loader2 } from 'lucide-react';

export default function SeedingButton({ hotelId, hotelName }: { hotelId: string, hotelName: string }) {
  const [isPending, setIsPending] = useState(false);

  const handleSeed = async () => {
    if (!confirm(`⚠️ ¿Inyectar datos de demostración en ${hotelName}?`)) return;
    
    setIsPending(true);
    const res = await injectDemoDataAction(hotelId); // 👈 Pasamos el ID explícito
    setIsPending(false);

    if (res.success) {
      alert('✅ Demostración lista.');
    } else {
      alert('❌ Error: ' + res.error);
    }
  };

  return (
    <button 
      onClick={handleSeed}
      disabled={isPending}
      className="flex items-center gap-2 text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1.5 rounded-lg hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-50"
    >
      {isPending ? <Loader2 className="animate-spin size-3" /> : <Rocket size={12} />}
      Demo Seed
    </button>
  );
}