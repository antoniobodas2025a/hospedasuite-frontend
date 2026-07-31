// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import SplitPaymentsKPIs from '../SplitPaymentsKPIs';
import SplitPaymentsTable from '../SplitPaymentsTable';

// Mock framer-motion (consistent with project convention)
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement('div', {}, children),
    tr: ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement('tr', {}, children),
  },
}));

// ==========================================
// SplitPaymentsKPIs
// ==========================================

describe('SplitPaymentsKPIs', () => {
  it('renders all three KPI labels', () => {
    render(<SplitPaymentsKPIs totalReceived={1000000} totalCommissions={80000} pendingCount={3} />);

    expect(screen.getByText('Total Recibido')).toBeInTheDocument();
    expect(screen.getByText('Comisiones Pagadas')).toBeInTheDocument();
    expect(screen.getByText('Pagos Pendientes')).toBeInTheDocument();
  });

  it('formats COP amounts correctly', () => {
    render(<SplitPaymentsKPIs totalReceived={1500000} totalCommissions={120000} pendingCount={0} />);

    // Intl.NumberFormat may insert a space between symbol and digits
    expect(screen.getByText(/\$?\s*1\.500\.000/)).toBeInTheDocument();
    expect(screen.getByText(/\$?\s*120\.000/)).toBeInTheDocument();
  });

  it('displays pending count as a number', () => {
    render(<SplitPaymentsKPIs totalReceived={0} totalCommissions={0} pendingCount={7} />);

    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders zero values gracefully', () => {
    render(<SplitPaymentsKPIs totalReceived={0} totalCommissions={0} pendingCount={0} />);

    // Two KPIs show "$ 0" (totalReceived + totalCommissions), one shows "0" (pendingCount)
    const allZeros = screen.getAllByText(/\$?\s*0$/);
    expect(allZeros.length).toBe(3);
  });
});

// ==========================================
// SplitPaymentsTable
// ==========================================

const mockPayment = {
  id: 'sp-001',
  booking_id: 'booking-abc12345-def',
  total_amount: 500000,
  hotel_amount: 460000,
  platform_amount: 40000,
  split_status: 'COMPLETED',
  hotel_payout_status: 'DISBURSED',
  created_at: '2025-06-15T10:00:00Z',
};

const mockPayments = [
  mockPayment,
  {
    ...mockPayment,
    id: 'sp-002',
    booking_id: 'booking-xyz98765-ghi',
    hotel_payout_status: 'PENDING',
    total_amount: 300000,
    hotel_amount: 276000,
    platform_amount: 24000,
    created_at: '2025-07-01T14:30:00Z',
  },
  {
    ...mockPayment,
    id: 'sp-003',
    booking_id: 'booking-fail00000-jkl',
    hotel_payout_status: 'FAILED',
    total_amount: 200000,
    hotel_amount: 184000,
    platform_amount: 16000,
    created_at: '2025-07-10T08:00:00Z',
  },
];

describe('SplitPaymentsTable', () => {
  it('renders empty state when no payments', () => {
    render(<SplitPaymentsTable payments={[]} />);

    expect(screen.getByText(/Aun no tienes pagos divididos/i)).toBeInTheDocument();
    expect(screen.getByText(/primera reserva/i)).toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(<SplitPaymentsTable payments={mockPayments} />);

    expect(screen.getByText('Fecha')).toBeInTheDocument();
    expect(screen.getByText('Booking')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Tu Parte (92%)')).toBeInTheDocument();
    expect(screen.getByText('Comision (8%)')).toBeInTheDocument();
    expect(screen.getByText('Estado')).toBeInTheDocument();
  });

  it('renders all payment rows', () => {
    render(<SplitPaymentsTable payments={mockPayments} />);

    // Each booking_id is truncated to first 8 chars + "..."
    // All 3 mock bookings start with "booking-" so they share the same truncated text
    expect(screen.getAllByText('booking-...').length).toBe(3);
  });

  it('displays correct status labels', () => {
    render(<SplitPaymentsTable payments={mockPayments} />);

    expect(screen.getByText('Depositado')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Fallido')).toBeInTheDocument();
  });

  it('formats amounts in COP', () => {
    render(<SplitPaymentsTable payments={[mockPayment]} />);

    expect(screen.getByText(/\$?\s*500\.000/)).toBeInTheDocument();
    expect(screen.getByText(/\$?\s*460\.000/)).toBeInTheDocument();
    expect(screen.getByText(/\$?\s*40\.000/)).toBeInTheDocument();
  });

  it('formats dates in Spanish locale', () => {
    render(<SplitPaymentsTable payments={[mockPayment]} />);

    // es-CO format: "15 de jun de 2025" (locale-dependent "de" separators)
    expect(screen.getByText(/15.*jun.*2025/)).toBeInTheDocument();
  });
});
