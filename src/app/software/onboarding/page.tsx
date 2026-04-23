'use client';

import React, { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { ShieldCheck, ArrowRight, Building, CreditCard, Lock, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Script from 'next/script';

// 1. Esquemas de Validación
const adminSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres para seguridad'),
});

const hotelSchema = z.object({
  name: z.string().min(3, 'El nombre es muy corto'),
  city: z.string().min(3, 'Ingresa una ciudad válida'),
  rooms: z.coerce.number().min(1, 'Mínimo 1 habitación').max(500, 'Límite excedido'),
});

function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planPrice = searchParams.get('price') || '89.900';
  
  // Estados de Control de Entorno
  const [wompiReady, setWompiReady] = useState(false);
  const [isWidgetOpening, setIsWidgetOpening] = useState(false);
  
  const { step, nextStep, prevStep, setAdminData, setHotelData, isSubmitting, error, adminData } = useOnboardingStore();

  const adminForm = useForm({ resolver: zodResolver(adminSchema) });
  const hotelForm = useForm({ resolver: zodResolver(hotelSchema) });

  const onAdminSubmit = (data: any) => { setAdminData(data); nextStep(); };
  const onHotelSubmit = (data: any) => { setHotelData(data); nextStep(); };
  
  // 🚀 Integración Real con Wompi Web Tokenizer (Card-on-File)
  const handleWompiPayment = () => {
    if (typeof window === 'undefined' || !(window as any).$wompi || isWidgetOpening) return;

    // Bloqueo temporal para evitar apertura múltiple de Iframes
    setIsWidgetOpening(true);
    setTimeout(() => setIsWidgetOpening(false), 2000); // Liberar tras el fade-in de Wompi

    const checkout = new (window as any).$wompi.Widget({
      key: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || 'pub_test_Q5yS9j9vD177N68494Yy637R9Y6606vH',
      amountInCents: 0, // 0 COP = Tokenización pura de seguridad
      reference: `ONB-${Date.now()}`,
      currency: 'COP',
      customerData: {
        email: adminData.email,
        fullName: adminData.email.split('@')[0], 
      }
    });

    checkout.open(async (result: any) => {
      const transaction = result.transaction;
      
      if (transaction.status === 'APPROVED' || transaction.status === 'PENDING') {
        const store = useOnboardingStore.getState();
        store.setPaymentToken(transaction.id);
        
        nextStep(); // Transición a Pantalla de Aprovisionamiento (Paso 4)
        
        const success = await store.submitToSupabase();
        
        if (success) {
          // BARRERA DE AUTO-LOGIN
          const supabase = createClient();
          const { error: authError } = await supabase.auth.signInWithPassword({
            email: adminData.email,
            password: adminData.password,
          });

          if (authError) {
             console.error("[SecOps] Auto-Login Fallido:", authError.message);
             router.push('/login?message=Sesión configurada. Por favor ingresa manualmente.');
             return;
          }

          router.push('/dashboard?onboarding=success');
        } else {
          store.prevStep(); // Rollback en caso de fallo DB
        }
      } else {
        alert("Validación bancaria rechazada. Por favor intenta con otra tarjeta.");
      }
    });
  };

  return (
    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100 relative overflow-hidden">
      <Script 
        src="https://checkout.wompi.co/widget.js" 
        onLoad={() => setWompiReady(true)}
      />

      {error && (
        <div className="mb-6 bg-red-50 p-4 rounded-md text-red-800 text-sm border border-red-200 font-medium animate-in fade-in">
          {error}
        </div>
      )}

      {/* PASO 1: CREACIÓN DE ADMINISTRADOR */}
      {step === 1 && (
        <form onSubmit={adminForm.handleSubmit(onAdminSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email Administrador</label>
            <input type="email" {...adminForm.register('email')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 border" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Contraseña Segura</label>
            <input type="password" {...adminForm.register('password')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 border" />
          </div>
          <button type="submit" className="w-full py-2 px-4 rounded-md text-white bg-gray-900 hover:bg-gray-800 flex justify-center items-center">
            Continuar <ArrowRight className="ml-2 w-4 h-4" />
          </button>
        </form>
      )}

      {/* PASO 2: DATOS DEL ALOJAMIENTO */}
      {step === 2 && (
        <form onSubmit={hotelForm.handleSubmit(onHotelSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre del Alojamiento</label>
            <input type="text" {...hotelForm.register('name')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 border" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Ciudad Base</label>
              <input type="text" {...hotelForm.register('city')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nº Habitaciones</label>
              <input type="number" {...hotelForm.register('rooms')} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 border" />
            </div>
          </div>
          <div className="flex space-x-3">
            <button type="button" onClick={prevStep} className="w-1/3 py-2 border rounded-md">Atrás</button>
            <button type="submit" className="w-2/3 py-2 rounded-md text-white bg-gray-900 hover:bg-gray-800">Siguiente Paso</button>
          </div>
        </form>
      )}

      {/* PASO 3: BOVEDA FINANCIERA (WOMPI) */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start">
            <ShieldCheck className="w-6 h-6 text-blue-600 mt-0.5 mr-3" />
            <div className="text-xs text-blue-800">
              <p className="font-bold text-sm mb-1">Activación de Cuenta (Meses Gratis)</p>
              Garantiza tu acceso gratuito vinculando tu tarjeta. El primer cobro de <strong>${planPrice} COP</strong> ocurrirá el día 91. Si cancelas antes, tu tarjeta no será debitada jamás.
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <button 
              onClick={handleWompiPayment}
              disabled={!wompiReady || isSubmitting || isWidgetOpening}
              className="bg-[#1A1A1A] text-white px-8 py-3 rounded-full text-sm font-bold shadow-xl hover:scale-105 transition-all disabled:opacity-50 flex items-center justify-center mx-auto"
            >
              {isSubmitting || isWidgetOpening ? <Loader2 className="animate-spin mr-2" /> : null}
              {isSubmitting || isWidgetOpening ? 'Conectando Bóveda...' : 'VINCULAR TARJETA CON WOMPI'}
            </button>
            <p className="text-[10px] text-gray-400 mt-4 uppercase tracking-widest font-semibold">Validación Encriptada PCI-DSS</p>
          </div>
          <button onClick={prevStep} className="w-full text-sm text-gray-500 hover:underline">Modificar datos previos</button>
        </div>
      )}

      {/* PASO 4: CARGADOR DE INSTANCIACIÓN */}
      {step === 4 && (
        <div className="text-center py-10 animate-in zoom-in-95">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
             <Building className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="font-bold text-lg text-gray-900">Aprovisionando Infraestructura...</h3>
          <p className="text-sm text-gray-500 mt-2">Creando base de datos aislada y configurando bóveda financiera segura.</p>
        </div>
      )}
    </div>
  );
}

export default function GoldenGateOnboarding() {
  const { step } = useOnboardingStore();
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="text-3xl font-extrabold text-gray-900 mb-8">HospedaSuite <span className="text-blue-600">PRO</span></h2>
        
        {/* Barra de Progreso */}
        <div className="flex justify-center space-x-2 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`h-1.5 rounded transition-all duration-300 ${step >= i ? 'w-12 bg-blue-600' : 'w-8 bg-gray-200'}`} />
          ))}
        </div>
      </div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense fallback={<Loader2 className="mx-auto animate-spin text-gray-400 w-8 h-8" />}>
          <OnboardingForm />
        </Suspense>
        <p className="text-center text-[10px] text-gray-400 mt-6 font-semibold tracking-wider">
          <Lock className="inline w-3 h-3 mb-1 mr-1" /> SEGURIDAD DE GRADO BANCARIO Y PROTECCIÓN DE DATOS
        </p>
      </div>
    </div>
  );
}