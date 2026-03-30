'use client';

import React, { Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useOnboardingStore } from '@/store/useOnboardingStore';
import { ShieldCheck, ArrowRight, Building, CreditCard, Lock } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

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

// 2. Componente Interno (Maneja la Lógica y los Parámetros)
function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 🚨 Extracción Dinámica del Precio desde la URL de Marketing
  const planPrice = searchParams.get('price') || '89.900';
  
  const { step, nextStep, prevStep, setAdminData, setHotelData, isSubmitting, error } = useOnboardingStore();

  const adminForm = useForm({ resolver: zodResolver(adminSchema) });
  const hotelForm = useForm({ resolver: zodResolver(hotelSchema) });

  const onAdminSubmit = (data: any) => { setAdminData(data); nextStep(); };
  const onHotelSubmit = (data: any) => { setHotelData(data); nextStep(); };
  
  const handleWompiTokenization = async () => {
    const mockToken = "tok_prod_12345secure"; 
    useOnboardingStore.getState().setPaymentToken(mockToken);
    nextStep();
    
    const success = await useOnboardingStore.getState().submitToSupabase();
    if (success) router.push('/dashboard?onboarding=success');
  };

  return (
    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100 relative overflow-hidden">
      
      {error && (
        <div className="mb-4 bg-red-50 p-4 rounded-md text-red-800 text-sm border border-red-200 font-medium">
          {error}
        </div>
      )}

      {/* PASO 1 */}
      {step === 1 && (
        <form onSubmit={adminForm.handleSubmit(onAdminSubmit)} className="space-y-6 animate-in fade-in slide-in-from-right-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Correo Electrónico Administrador</label>
            <input 
              type="email"
              placeholder="admin@hotel.com"
              {...adminForm.register('email')} 
              className="mt-1 block w-full bg-white text-gray-900 placeholder-gray-400 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border" 
            />
            {adminForm.formState.errors.email && <p className="text-red-500 text-xs mt-1">{adminForm.formState.errors.email.message as string}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Contraseña Segura</label>
            <input 
              type="password" 
              placeholder="••••••••"
              {...adminForm.register('password')} 
              className="mt-1 block w-full bg-white text-gray-900 placeholder-gray-400 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border" 
            />
            {adminForm.formState.errors.password && <p className="text-red-500 text-xs mt-1">{adminForm.formState.errors.password.message as string}</p>}
          </div>
          <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800">
            Continuar <ArrowRight className="ml-2 w-4 h-4 mt-0.5" />
          </button>
        </form>
      )}

      {/* PASO 2 */}
      {step === 2 && (
        <form onSubmit={hotelForm.handleSubmit(onHotelSubmit)} className="space-y-6 animate-in fade-in slide-in-from-right-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre del Hotel / Alojamiento</label>
            <input 
              type="text"
              placeholder="Ej. Glamping Paraíso"
              {...hotelForm.register('name')} 
              className="mt-1 block w-full bg-white text-gray-900 placeholder-gray-400 border-gray-300 rounded-md shadow-sm p-2 border" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Ciudad</label>
              <input 
                type="text"
                placeholder="Ej. Villa de Leyva"
                {...hotelForm.register('city')} 
                className="mt-1 block w-full bg-white text-gray-900 placeholder-gray-400 border-gray-300 rounded-md shadow-sm p-2 border" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Habitaciones</label>
              <input 
                type="number" 
                placeholder="Ej. 5"
                {...hotelForm.register('rooms')} 
                className="mt-1 block w-full bg-white text-gray-900 placeholder-gray-400 border-gray-300 rounded-md shadow-sm p-2 border" 
              />
            </div>
          </div>
          <div className="flex space-x-3">
            <button type="button" onClick={prevStep} className="w-1/3 py-2 px-4 border rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Volver</button>
            <button type="submit" className="w-2/3 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800">
              Configurar Sistema
            </button>
          </div>
        </form>
      )}

      {/* PASO 3 */}
      {step === 3 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start">
            <ShieldCheck className="w-6 h-6 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-blue-900">Garantía Total de 90 Días</h4>
              <p className="text-xs text-blue-800 mt-1">
                Tu sistema está listo. Ingresa un método de pago para activar la cuenta. <strong>No se hará ningún cargo hoy.</strong> Tu primer cobro de <strong>${planPrice} COP</strong> se realizará en 90 días. Cancela con un clic antes de esa fecha y no pagarás nada.
              </p>
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-900 mb-4 font-medium">Integración Segura Wompi</p>
            <button onClick={handleWompiTokenization} className="bg-[#1A1A1A] text-white px-6 py-2 rounded-full text-sm font-medium shadow-lg hover:scale-105 transition-transform">
              Vincular Tarjeta de Forma Segura
            </button>
          </div>
          
          <button type="button" onClick={prevStep} className="w-full py-2 px-4 border rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Atrás</button>
        </div>
      )}

      {/* PASO 4 */}
      {step === 4 && (
        <div className="text-center py-8 animate-in zoom-in-95">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Building className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Construyendo tu Hotel...</h3>
          <p className="text-sm text-gray-500 mt-2">Creando base de datos, asegurando bóveda y preparando el calendario.</p>
        </div>
      )}

    </div>
  );
}

// 3. Componente Principal Exportado (Con Suspense para Next.js)
export default function GoldenGateOnboarding() {
  const { step } = useOnboardingStore();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          HospedaSuite <span className="text-blue-600">PRO</span>
        </h2>
        
        {/* Barra de Progreso */}
        <div className="mt-8 flex justify-center space-x-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`h-2 w-16 rounded ${step >= i ? 'bg-blue-600' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        
        {/* Aquí envolvemos el formulario que lee la URL para evitar que Next.js falle */}
        <Suspense fallback={<div className="text-center py-10 text-gray-500">Cargando bóveda segura...</div>}>
          <OnboardingForm />
        </Suspense>
        
        <p className="text-center text-xs text-gray-500 mt-6 flex items-center justify-center font-medium">
          <Lock className="w-3 h-3 mr-1" /> Encriptación AES-256 de extremo a extremo
        </p>
      </div>
    </div>
  );
}