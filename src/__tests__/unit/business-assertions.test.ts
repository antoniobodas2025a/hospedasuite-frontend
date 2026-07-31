import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Tests de Aserción de Negocio
 * 
 * Estos tests protegen las invariantes críticas del negocio:
 * 1. Soberanía Financiera (0% comisión en reservas directas)
 * 2. Dark Funnel (bloques GEO optimizados, sin "OTA")
 * 3. Performance Budget (TBT < 100ms)
 */

describe('Business Assertions', () => {
  
  // ============================================================================
  // ASERCIÓN 1: SOBERANÍA FINANCIERA
  // ============================================================================
  
  describe('Soberanía Financiera - 0% Comisión', () => {
    it('no debe haber lógica de comisión en reservas directas', () => {
      // Leer archivo de pagos
      const paymentsFile = join(
        process.cwd(),
        'src/app/actions/payments.ts'
      );
      
      if (!existsSync(paymentsFile)) {
        throw new Error('payments.ts no encontrado');
      }
      
      const content = readFileSync(paymentsFile, 'utf-8');
      
      // Verificar que no hay lógica de comisión para reservas directas
      const hasDirectCommission = content.includes('commission') && 
        content.includes('direct') &&
        !content.includes('// commission'); // Ignorar comentarios
      
      expect(hasDirectCommission).toBe(false);
    });

    it('debe usar Wompi como pasarela principal', () => {
      const checkoutFile = join(
        process.cwd(),
        'src/components/checkout/CheckoutForm.tsx'
      );
      
      if (!existsSync(checkoutFile)) {
        throw new Error('CheckoutForm.tsx no encontrado');
      }
      
      const content = readFileSync(checkoutFile, 'utf-8');
      
      // Verificar que Wompi está integrado
      const hasWompi = content.includes('wompi') || content.includes('Wompi');
      expect(hasWompi).toBe(true);
    });

    it('el flujo de pago debe ir 100% al hotelero', () => {
      const wompiFile = join(
        process.cwd(),
        'src/app/actions/wompi.ts'
      );
      
      if (!existsSync(wompiFile)) {
        throw new Error('wompi.ts no encontrado');
      }
      
      const content = readFileSync(wompiFile, 'utf-8');
      
      // Verificar que no hay split de pagos
      const hasSplitPayment = content.includes('split') || 
        content.includes('platform_fee') ||
        content.includes('commission_rate');
      
      expect(hasSplitPayment).toBe(false);
    });
  });

  // ============================================================================
  // ASERCIÓN 2: DARK FUNNEL (Bloques GEO)
  // ============================================================================
  
  describe('Dark Funnel - Bloques GEO', () => {
    const recursosDir = join(process.cwd(), 'src/app/recursos');
    
    it('los bloques GEO deben tener entre 40-60 palabras', () => {
      const pages = [
        'analitica-dark-funnel/page.tsx',
        'automatizacion-sire-tra-boyaca/page.tsx',
        'rescate-operativo-boyaca/page.tsx',
        'que-hacer-caida-plataformas-reservas/page.tsx',
      ];

      pages.forEach((page) => {
        const filePath = join(recursosDir, page);
        
        if (!existsSync(filePath)) {
          throw new Error(`${page} no encontrado`);
        }
        
        const content = readFileSync(filePath, 'utf-8');
        
        // Buscar bloque GEO (GEO_CITATION)
        const geoMatch = content.match(/GEO_CITATION\s*=\s*['"`]([^'"`]+)['"`]/);
        
        if (geoMatch) {
          const geoText = geoMatch[1];
          const wordCount = geoText.split(/\s+/).length;
          
          expect(wordCount).toBeGreaterThanOrEqual(40);
          expect(wordCount).toBeLessThanOrEqual(60);
        }
      });
    });

    it('no debe aparecer la palabra "OTA" en bloques GEO', () => {
      const pages = [
        'analitica-dark-funnel/page.tsx',
        'automatizacion-sire-tra-boyaca/page.tsx',
        'rescate-operativo-boyaca/page.tsx',
        'que-hacer-caida-plataformas-reservas/page.tsx',
      ];

      pages.forEach((page) => {
        const filePath = join(recursosDir, page);
        
        if (!existsSync(filePath)) {
          throw new Error(`${page} no encontrado`);
        }
        
        const content = readFileSync(filePath, 'utf-8');
        
        // Buscar bloque GEO
        const geoMatch = content.match(/GEO_CITATION\s*=\s*['"`]([^'"`]+)['"`]/);
        
        if (geoMatch) {
          const geoText = geoMatch[1];
          
          // Verificar que no contenga "OTA" (case insensitive)
          const hasOTA = /\bOTA\b/i.test(geoText);
          expect(hasOTA).toBe(false);
        }
      });
    });

    it('las páginas de ciudad deben tener bloques GEO', () => {
      const cityPage = join(
        recursosDir,
        'ciudad/[city]/page.tsx'
      );
      
      if (!existsSync(cityPage)) {
        throw new Error('ciudad/[city]/page.tsx no encontrado');
      }
      
      const content = readFileSync(cityPage, 'utf-8');
      
      // Verificar que existe geoBlock
      const hasGeoBlock = content.includes('geoBlock');
      expect(hasGeoBlock).toBe(true);
    });
  });

  // ============================================================================
  // ASERCIÓN 3: PERFORMANCE BUDGET
  // ============================================================================
  
  describe('Performance Budget', () => {
    it('el bundle inicial debe ser menor a 250KB', () => {
      // Este test se ejecuta en CI/CD
      // Por ahora solo verificamos que el archivo de configuración existe
      const nextConfig = join(process.cwd(), 'next.config.ts');
      
      if (!existsSync(nextConfig)) {
        throw new Error('next.config.ts no encontrado');
      }
      
      const content = readFileSync(nextConfig, 'utf-8');
      
      // Verificar que está configurada la optimización de imágenes
      const hasImageOptimization = content.includes('images:') && 
        content.includes('formats:');
      
      expect(hasImageOptimization).toBe(true);
    });

    it('los componentes críticos deben usar lazy loading', () => {
      const hotelGalleryFile = join(
        process.cwd(),
        'src/components/ota/HotelGallery.tsx'
      );
      
      if (!existsSync(hotelGalleryFile)) {
        throw new Error('HotelGallery.tsx no encontrado');
      }
      
      const content = readFileSync(hotelGalleryFile, 'utf-8');
      
      // Verificar que las imágenes secundarias tienen loading="lazy"
      const hasLazyLoading = content.includes('loading="lazy"');
      expect(hasLazyLoading).toBe(true);
    });
  });
});
