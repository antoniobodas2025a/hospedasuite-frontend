import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Post-Go-Live Monitoring — UI & Brand Core', () => {
  const DASHBOARD_PATH = path.resolve(process.cwd(), 'src/app/(admin)/dashboard/page.tsx');
  const METRICS_PATH = path.resolve(process.cwd(), 'src/components/dashboard/PostGoLiveMetrics.tsx');

  it('debe incluir el componente PostGoLiveMetrics cuando go_live es true', () => {
    const content = fs.readFileSync(DASHBOARD_PATH, 'utf8');
    expect(content).toContain('PostGoLiveMetrics');
    expect(content).toContain('hotel.go_live');
  });

  it('no debe usar jerga técnica en el panel de monitoreo', () => {
    const content = fs.readFileSync(METRICS_PATH, 'utf8');
    expect(content).not.toContain('Channel');
    expect(content).not.toContain('intermediario');
    expect(content).not.toContain('Sandbox');
  });

  it('debe usar lenguaje del Brand Core OS', () => {
    const content = fs.readFileSync(METRICS_PATH, 'utf8');
    expect(content).toContain('Cerebro Operativo');
    expect(content).toContain('Motor Propio');
    expect(content).toContain('Dark Funnel');
  });

  it('debe incluir sección de Revisión de Comunicaciones (Regla del 20%)', () => {
    const content = fs.readFileSync(METRICS_PATH, 'utf8');
    expect(content).toContain('Revisión de Comunicaciones');
    expect(content).toContain('Regla del 20%');
    expect(content).toContain('Socio de Crecimiento');
  });

  it('debe mostrar métricas atómicas sin tablas complejas (Ley de Hick)', () => {
    const content = fs.readFileSync(METRICS_PATH, 'utf8');
    expect(content).toContain('MetricCard');
    expect(content).not.toContain('<table');
    expect(content).not.toContain('DataGrid');
  });
});
