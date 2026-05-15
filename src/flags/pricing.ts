/**
 * 🧪 Feature Flags — Experimentos de Precios
 *
 * Permite cambiar precios, textos, o funcionalidades SIN hacer deploy.
 * Se configura desde el panel de Vercel o localmente en .env.
 *
 * Uso:
 *   const price = await getPricingVariant();
 *   // Retorna: 'control' (49k), 'variant-a' (59k), 'variant-b' (39k)
 */

import { flag } from '@vercel/flags/next';

// ——— Tipos de variantes de precio ———
export type PricingVariant = 'control' | 'variant-a' | 'variant-b';

// ——— Precios por variante ———
export const PRICING: Record<PricingVariant, { starter: number; pro: number; enterprise: number }> = {
  control: {
    starter: 49_000,
    pro: 99_000,
    enterprise: 169_000,
  },
  'variant-a': {
    starter: 59_000,
    pro: 119_000,
    enterprise: 199_000,
  },
  'variant-b': {
    starter: 39_000,
    pro: 79_000,
    enterprise: 139_000,
  },
};

// ——— Flag principal de experimento de precios ———
export const pricingExperiment = flag<PricingVariant>({
  key: 'pricing-experiment-2026',
  defaultValue: 'control',
  options: [
    { value: 'control', label: 'Precio actual (control)' },
    { value: 'variant-a', label: 'Precio +20% (test)' },
    { value: 'variant-b', label: 'Precio -20% (penetración)' },
  ],
  description: 'Experimento A/B de precios para la landing page',
  decide: () => 'control',
});

// ——— Flag de descuento temporal ———
export const discountActive = flag<{
  enabled: boolean;
  percentage: number;
  validUntil: string;
}>({
  key: 'discount-active',
  defaultValue: {
    enabled: false,
    percentage: 0,
    validUntil: '2026-12-31',
  },
  description: 'Descuento temporal activable sin deploy',
  decide: () => ({
    enabled: false,
    percentage: 0,
    validUntil: '2026-12-31',
  }),
});

// ——— Helper para obtener precio final ———
export async function getPricingForPlan(plan: 'starter' | 'pro' | 'enterprise'): Promise<number> {
  const variant = await pricingExperiment();
  const basePrice = PRICING[variant][plan];

  // Aplicar descuento si está activo
  const discount = await discountActive();
  if (discount.enabled && new Date(discount.validUntil) > new Date()) {
    return Math.round(basePrice * (1 - discount.percentage / 100));
  }

  return basePrice;
}
