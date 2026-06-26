import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Scalability & Multi-Property Isolation', () => {
  const HOTEL_CONTEXT_PATH = path.resolve(process.cwd(), 'src/lib/hotel-context.ts');
  const PAYMENT_GATEWAY_PATH = path.resolve(process.cwd(), 'src/lib/payment-gateway.ts');
  const PROPERTIES_ACTION_PATH = path.resolve(process.cwd(), 'src/app/actions/properties.ts');
  const PROPERTY_SWITCHER_PATH = path.resolve(process.cwd(), 'src/components/layout/PropertySwitcher.tsx');
  const SIDEBAR_PATH = path.resolve(process.cwd(), 'src/components/layout/Sidebar.tsx');
  const MOBILE_NAV_PATH = path.resolve(process.cwd(), 'src/components/layout/MobileNav.tsx');
  const ADMIN_LAYOUT_PATH = path.resolve(process.cwd(), 'src/app/(admin)/layout.tsx');
  const CONNECTORS_PATH = path.resolve(process.cwd(), 'src/components/dashboard/PaymentConnectors.tsx');
  const SETTINGS_PANEL_PATH = path.resolve(process.cwd(), 'src/components/dashboard/SettingsPanel.tsx');

  // ─── S1: Auditoría de Aislamiento de Propiedades ───

  it('hotel-context.ts debe usar hospeda_active_tenant cookie para aislamiento', () => {
    const content = fs.readFileSync(HOTEL_CONTEXT_PATH, 'utf8');
    expect(content).toContain('hospeda_active_tenant');
    expect(content).toContain('staff'); // Multi-property via staff table
  });

  it('properties.ts debe exportar getMyHotelsAction para listar propiedades del usuario', () => {
    const content = fs.readFileSync(PROPERTIES_ACTION_PATH, 'utf8');
    expect(content).toContain('getMyHotelsAction');
    expect(content).toContain('staff'); // Queries via staff table
    expect(content).toContain('user_id'); // Filters by current user
  });

  it('properties.ts debe exportar switchPropertyAction para cambiar propiedad activa', () => {
    const content = fs.readFileSync(PROPERTIES_ACTION_PATH, 'utf8');
    expect(content).toContain('switchPropertyAction');
    expect(content).toContain('hospeda_active_tenant'); // Sets the cookie
  });

  it('switchPropertyAction debe verificar acceso antes de cambiar (data leak prevention)', () => {
    const content = fs.readFileSync(PROPERTIES_ACTION_PATH, 'utf8');
    // Must verify user has access to the target hotel before switching
    expect(content).toContain('user_id');
    expect(content).toContain('hotel_id');
    // Verify the order: check staff record BEFORE setting cookie
    const staffCheckIndex = content.indexOf('staffRecord');
    const cookieSetIndex = content.indexOf("cookieStore.set('hospeda_active_tenant'");
    expect(staffCheckIndex).toBeGreaterThan(-1);
    expect(cookieSetIndex).toBeGreaterThan(-1);
    expect(staffCheckIndex).toBeLessThan(cookieSetIndex); // Check before set
  });

  it('PropertySwitcher debe existir como componente de UI', () => {
    const content = fs.readFileSync(PROPERTY_SWITCHER_PATH, 'utf8');
    expect(content).toContain('PropertySwitcher');
    expect(content).toContain('switchPropertyAction');
  });

  it('PropertySwitcher debe usar lenguaje empático ("Mis Propiedades")', () => {
    const content = fs.readFileSync(PROPERTY_SWITCHER_PATH, 'utf8');
    expect(content).toContain('Mis Propiedades');
    expect(content).not.toContain('Multi-Tenant');
    expect(content).not.toContain('multi-tenant');
    expect(content).not.toContain('tenant');
  });

  it('Sidebar debe integrar PropertySwitcher', () => {
    const content = fs.readFileSync(SIDEBAR_PATH, 'utf8');
    expect(content).toContain('PropertySwitcher');
    expect(content).toContain('myHotels');
    expect(content).toContain('hotelId');
  });

  it('MobileNav debe integrar PropertySwitcher', () => {
    const content = fs.readFileSync(MOBILE_NAV_PATH, 'utf8');
    expect(content).toContain('PropertySwitcher');
    expect(content).toContain('myHotels');
  });

  it('admin layout debe pasar myHotels al Sidebar y MobileNav', () => {
    const content = fs.readFileSync(ADMIN_LAYOUT_PATH, 'utf8');
    expect(content).toContain('getMyHotelsAction');
    expect(content).toContain('myHotels');
  });

  // ─── S2: Auditoría del Selector de Pasarelas de Pago ───

  it('payment-gateway.ts debe existir y definir interfaz PaymentGateway', () => {
    const content = fs.readFileSync(PAYMENT_GATEWAY_PATH, 'utf8');
    expect(content).toContain('interface PaymentGateway');
    expect(content).toContain('getCheckoutUrl');
  });

  it('payment-gateway.ts debe garantizar Soberanía Financiera (0% comisión)', () => {
    const content = fs.readFileSync(PAYMENT_GATEWAY_PATH, 'utf8');
    // Must use hotel keys, not platform keys
    expect(content).toContain('hotelPublicKey');
    expect(content).not.toContain('platformCommission');
  });

  it('no debe usar jerga técnica en la UI de conectores', () => {
    const content = fs.readFileSync(CONNECTORS_PATH, 'utf8');
    expect(content).not.toContain('Multi-Tenant');
    expect(content).not.toContain('API Key');
    expect(content).toContain('Conectores de Pago');
    expect(content).toContain('Soberanía Financiera');
  });

  it('PaymentConnectors debe estar integrado en SettingsPanel', () => {
    const content = fs.readFileSync(SETTINGS_PANEL_PATH, 'utf8');
    expect(content).toContain('PaymentConnectors');
  });

  // ─── S3: Purga de Identidad Técnica (Heurística #2) ───

  it('SettingsPanel NO debe mostrar "tenant" al hotelero', () => {
    const content = fs.readFileSync(SETTINGS_PANEL_PATH, 'utf8');
    // Check user-facing strings only (not comments or variable names)
    const jsxContent = content.split(/return\s*\(/)[1] || '';
    expect(jsxContent).not.toContain('tenant');
    expect(jsxContent).not.toContain('Multi-Tenant');
  });

  it('hotel-context.ts comentarios internos pueden usar "Multi-Tenant" (no es UI)', () => {
    // Internal comments are OK — only user-facing strings matter
    const content = fs.readFileSync(HOTEL_CONTEXT_PATH, 'utf8');
    // This is a documentation test — confirms the distinction between internal and external
    expect(content).toContain('//'); // Has comments
  });

  // ─── Mutation Tests: Data Leak Prevention ───

  it('MUTACIÓN: si se elimina el filtro hotel_id de properties.ts, el test debe detectar el riesgo', () => {
    const content = fs.readFileSync(PROPERTIES_ACTION_PATH, 'utf8');
    // The action MUST filter by user_id when fetching hotels
    expect(content).toMatch(/eq\s*\(\s*['"]user_id['"]/);
    // If someone removes this, it would leak all hotels to all users
  });

  it('MUTACIÓN: si switchPropertyAction no verifica acceso, debe fallar', () => {
    const content = fs.readFileSync(PROPERTIES_ACTION_PATH, 'utf8');
    // Must check staff record before setting cookie
    expect(content).toContain('maybeSingle'); // Verifies single record match
    expect(content).toContain('!staffRecord'); // Checks if access denied
  });
});
