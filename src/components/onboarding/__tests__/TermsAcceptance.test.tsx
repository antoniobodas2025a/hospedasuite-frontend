// @vitest-environment jsdom
import '../../../__tests__/bun-test-dom-setup';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import TermsAcceptance from '../TermsAcceptance';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Shield: () => <span data-testid="shield-icon">Shield</span>,
  ExternalLink: () => <span data-testid="external-link-icon">ExternalLink</span>,
}));

describe('TermsAcceptance', () => {
  it('should render checkbox unchecked by default', () => {
    const onChange = vi.fn();
    const { container } = render(<TermsAcceptance accepted={false} onAcceptanceChange={onChange} />);
    
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).toBeTruthy();
    expect(checkbox.checked).toBe(false);
  });

  it('should render checkbox checked when accepted is true', () => {
    const onChange = vi.fn();
    const { container } = render(<TermsAcceptance accepted={true} onAcceptanceChange={onChange} />);
    
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('should call onAcceptanceChange when checkbox is clicked', () => {
    const onChange = vi.fn();
    const { container } = render(<TermsAcceptance accepted={false} onAcceptanceChange={onChange} />);
    
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(checkbox);
    
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('should render links to terms and privacy policy', () => {
    const onChange = vi.fn();
    const { container } = render(<TermsAcceptance accepted={false} onAcceptanceChange={onChange} />);
    
    const links = container.querySelectorAll('a');
    const termsLink = Array.from(links).find(link => link.textContent?.includes('Términos y Condiciones'));
    const privacyLink = Array.from(links).find(link => link.textContent?.includes('Política de Privacidad'));
    
    expect(termsLink).toBeTruthy();
    expect(termsLink?.getAttribute('href')).toBe('/software/terms');
    expect(privacyLink).toBeTruthy();
    expect(privacyLink?.getAttribute('href')).toBe('/software/privacy');
  });

  it('should show warning message when not accepted', () => {
    const onChange = vi.fn();
    const { container } = render(<TermsAcceptance accepted={false} onAcceptanceChange={onChange} />);
    
    const paragraphs = container.querySelectorAll('p');
    const warning = Array.from(paragraphs).find(p => p.textContent?.includes('Debés aceptar los términos'));
    expect(warning).toBeTruthy();
  });

  it('should not show warning message when accepted', () => {
    const onChange = vi.fn();
    const { container } = render(<TermsAcceptance accepted={true} onAcceptanceChange={onChange} />);
    
    const paragraphs = container.querySelectorAll('p');
    const warning = Array.from(paragraphs).find(p => p.textContent?.includes('Debés aceptar los términos'));
    expect(warning).toBeFalsy();
  });

  it('should toggle details when clicking "Ver qué implica aceptar"', () => {
    const onChange = vi.fn();
    const { container } = render(<TermsAcceptance accepted={false} onAcceptanceChange={onChange} />);
    
    const detailsButton = container.querySelector('button[type="button"]');
    expect(detailsButton).toBeTruthy();
    expect(detailsButton?.textContent).toContain('Ver qué implica aceptar');
    
    // Initially details are hidden
    expect(container.textContent).not.toContain('Al aceptar, entendés que');
    
    // Click to show details
    fireEvent.click(detailsButton!);
    expect(container.textContent).toContain('Al aceptar, entendés que');
    
    // Click to hide details
    fireEvent.click(detailsButton!);
    expect(container.textContent).not.toContain('Al aceptar, entendés que');
  });

  it('should render all key points in details section', () => {
    const onChange = vi.fn();
    const { container } = render(<TermsAcceptance accepted={false} onAcceptanceChange={onChange} />);
    
    const detailsButton = container.querySelector('button[type="button"]');
    fireEvent.click(detailsButton!);
    
    expect(container.textContent).toContain('Ley 1581 de 2012');
    expect(container.textContent).toContain('renovará automáticamente');
    expect(container.textContent).toContain('comisión del 8%');
    expect(container.textContent).toContain('veracidad de la información');
    expect(container.textContent).toContain('no es responsable por disputas');
  });
});
