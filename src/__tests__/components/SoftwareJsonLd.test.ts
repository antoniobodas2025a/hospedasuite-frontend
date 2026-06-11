// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import SoftwareJsonLd from '@/components/seo/SoftwareJsonLd';

describe('SoftwareJsonLd - E-E-A-T Review Schema (Red Phase)', () => {
  it('S1: Debe contener esquema de tipo "Review" anidado en SoftwareApplication', () => {
    // Use React.createElement to avoid JSX in .ts file
    const { container } = render(React.createElement(SoftwareJsonLd));
    const script = container.querySelector('script[type="application/ld+json"]');
    
    expect(script).not.toBeNull();
    
    const json = JSON.parse(script!.textContent || '{}');
    const softwareApp = json['@graph'].find((item: any) => item['@type'] === 'SoftwareApplication');
    
    expect(softwareApp).toBeDefined();
    
    // 🔴 FAILS: Actualmente no existe la propiedad "review"
    expect(softwareApp.review).toBeDefined(); 
    expect(softwareApp.review['@type']).toBe('Review');
  });
});
