/**
 * 🧪 Dynamic Pricing Section — Server Component con Feature Flags
 *
 * Evalúa los flags de precios en el servidor y renderiza la sección
 * con los precios dinámicos. Se puede usar como reemplazo de la
 * sección de precios hardcodeada en la landing page.
 *
 * Uso:
 *   import { DynamicPricingSection } from '@/components/pricing/DynamicPricingSection';
 *   <DynamicPricingSection />
 */

import { getPricingForPlan, pricingExperiment, type PricingVariant } from '@/flags/pricing';

const PLAN_FEATURES = {
  starter: ['Motor de Reservas Básico', 'Calendario Interactivo', 'Gestión de Huéspedes', 'Channel Manager (Manual)'],
  pro: ['Todo lo del Plan Starter', 'Channel Manager Automatizado (iCal)', 'Sincronización con Booking/Airbnb', 'POS (Punto de Venta)'],
  enterprise: ['Todo lo del Plan Pro', 'Reportes Financieros Avanzados', 'Facturación Automática'],
};

const formatPrice = (price: number) => price.toLocaleString('es-CO');

export async function DynamicPricingSection() {
  const variant = await pricingExperiment();
  const starterPrice = await getPricingForPlan('starter');
  const proPrice = await getPricingForPlan('pro');
  const enterprisePrice = await getPricingForPlan('enterprise');

  const plans = [
    { id: 'starter', label: 'Starter', price: starterPrice, features: PLAN_FEATURES.starter, recommended: false },
    { id: 'pro', label: 'Pro (Recomendado)', price: proPrice, features: PLAN_FEATURES.pro, recommended: true },
    { id: 'enterprise', label: 'Enterprise', price: enterprisePrice, features: PLAN_FEATURES.enterprise, recommended: false },
  ];

  const isExperiment = variant !== 'control';

  return (
    <section id="precios" className="py-24 px-6 bg-white border-t border-black/5 relative">
      <div className="max-w-[980px] mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight mb-6">
            Empieza gratis hoy.
          </h2>
          <p className="text-lg text-[#1d1d1f]/60">Sin pagos de instalación. Tu suscripción inicia en el mes 4.</p>
          {isExperiment && (
            <p className="text-xs text-[#007dfa] mt-2 font-medium">
              🔬 Precio experimental activo
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`
                rounded-[var(--radius-squircle-3xl)] p-8 shadow-sm border relative overflow-hidden
                ${plan.recommended
                  ? 'bg-[#007dfa] text-white shadow-lg ring-2 ring-[#007dfa]'
                  : 'bg-white border-black/5 hover:shadow-xl transition-all duration-500'
                }
              `}
            >
              {plan.recommended && (
                <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">
                  <span className="text-xs font-bold text-white">Recomendado</span>
                </div>
              )}

              <h3 className={`text-xl font-semibold mb-2 tracking-tight ${plan.recommended ? 'text-white' : 'text-[#1d1d1f]'}`}>
                {plan.label}
              </h3>

              <div className="flex items-baseline gap-1 mb-6">
                <span className={`text-2xl font-normal ${plan.recommended ? 'text-white/60' : 'text-[#1d1d1f]/40'}`}>$</span>
                <span className={`text-5xl font-semibold tracking-tighter ${plan.recommended ? 'text-white' : 'text-[#1d1d1f]'}`}>
                  {formatPrice(plan.price)}
                </span>
                <span className={`text-sm ${plan.recommended ? 'text-white/60' : 'text-[#1d1d1f]/40'}`}>COP/mes</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feat, i) => (
                  <li key={i} className={`flex items-center gap-2 text-sm ${plan.recommended ? 'text-white/90' : 'text-[#1d1d1f]/70'}`}>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${plan.recommended ? 'bg-white/20' : 'bg-[#34c759]/20'}`}>
                      <span className={`text-xs ${plan.recommended ? 'text-white' : 'text-[#34c759]'}`}>✓</span>
                    </span>
                    {feat}
                  </li>
                ))}
              </ul>

              <a
                href={`/software/onboarding?plan=${plan.id}&price=${plan.price}`}
                className={`
                  block w-full text-center py-3 rounded-full font-semibold text-sm transition-all duration-200
                  ${plan.recommended
                    ? 'bg-white text-[#007dfa] hover:bg-white/90 shadow-md'
                    : 'bg-[#1d1d1f] text-white hover:bg-black'
                  }
                `}
              >
                Empezar 1 Mes Gratis
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
