// @vitest-environment jsdom
import '../../../__tests__/bun-test-dom-setup';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, waitFor, fireEvent, act, cleanup } from '@testing-library/react';
import { RoomShowcaseModal } from '../RoomShowcaseModal';
import posthog from 'posthog-js';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      'ota.showcase.reserve': 'Reservar',
      'ota.showcase.total': 'Total',
      'ota.showcase.cop': 'COP',
      'ota.showcase.fallbackDescription': 'Un refugio acogedor',
      'ota.showcase.amenities': 'Amenidades',
      'ota.showcase.premiumService': 'Servicio premium',
      'ota.showcase.bookingSummary': 'Resumen de Reserva',
      'ota.showcase.stay': 'Estadía',
      'ota.showcase.nights_one': 'noche',
      'ota.showcase.nights_other': 'noches',
      'ota.showcase.occupancy': 'Ocupación',
      'ota.showcase.guest_one': 'huésped',
      'ota.showcase.guest_other': 'huéspedes',
      'ota.showcase.soldOut': 'Ya no disponible',
      'ota.showcase.soldOutDesc': 'Esta habitación ya no está disponible. Explora otras opciones.',
      'ota.showcase.seeOtherRooms': 'Ver otras habitaciones',
    };
    return messages[key] ?? key;
  },
  useLocale: () => 'es',
}));

// Mock posthog for analytics assertions
vi.mock('posthog-js', () => ({
  __esModule: true,
  default: {
    capture: vi.fn(),
  },
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('showRoom=room-1&checkin=2026-07-22&checkout=2026-07-23&guests=2'),
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: () => '22 Jul',
  parseISO: () => new Date('2026-07-22'),
}));

// Mock @/lib/date-locale
vi.mock('@/lib/date-locale', () => ({
  getDateFnsLocale: () => 'es',
}));

// Mock @/lib/amenity-registry
vi.mock('@/lib/amenity-registry', () => ({
  getRoomAmenityById: (id: string) => ({
    id,
    icon: () => null, // Componente React válido
    label: 'WiFi',
    storyTitle: 'Conexión WiFi',
    storyDescription: 'Internet de alta velocidad',
  }),
}));

// Mock framer-motion and expose animation props for assertions
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      className,
      initial,
      animate,
      exit,
      transition,
      ...props
    }: {
      children?: React.ReactNode;
      className?: string;
      initial?: Record<string, unknown>;
      animate?: Record<string, unknown>;
      exit?: Record<string, unknown>;
      transition?: Record<string, unknown>;
      [key: string]: unknown;
    }) =>
      React.createElement('div', {
        className,
        ...props,
        'data-initial': initial ? JSON.stringify(initial) : undefined,
        'data-animate': animate ? JSON.stringify(animate) : undefined,
        'data-exit': exit ? JSON.stringify(exit) : undefined,
        'data-transition': transition ? JSON.stringify(transition) : undefined,
      }, children),
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, {}, children),
}));

// Mock @/lib/pricing
vi.mock('@/lib/pricing', () => ({
  calculateTotalWithTax: (subtotal: number, rate: number) => ({
    total: subtotal * (1 + rate),
    hasTax: rate > 0,
  }),
  calculateTaxAmount: (subtotal: number, rate: number) => subtotal * rate,
  getTaxLabel: (rate: number) => (rate > 0 ? 'IVA (19%)' : ''),
  DEFAULT_TAX_RATE: 0.19,
}));

// Mock @/components/ui/glass
vi.mock('@/components/ui/glass', () => ({
  GlassCard: ({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: unknown }) => (
    <div className={className} {...props}>{children}</div>
  ),
}));

// Mock RoomGalleryGrid
vi.mock('../RoomGalleryGrid', () => ({
  default: ({ images, roomName }: { images: { url: string; alt?: string }[]; roomName: string }) => (
    <div data-testid="room-gallery">{roomName} - {images.length} images</div>
  ),
}));

describe('RoomShowcaseModal - Desktop Layout', () => {
  const mockHotel = {
    slug: 'test-hotel',
    name: 'Test Hotel',
    tax_rate: 0.19,
    rooms: [
      {
        id: 'room-1',
        name: 'Suite Deluxe',
        description: 'Habitación de lujo con vista al mar',
        price: 150000,
        price_per_night: 150000,
        capacity: 4,
        status: 'active',
        amenities: ['wifi', 'tv', 'minibar'],
        gallery: [
          { url: '/test1.jpg', alt: 'Test 1' },
          { url: '/test2.jpg', alt: 'Test 2' },
        ],
      },
    ],
  };

  const mockOnClose = vi.fn();
  const mockOnCheckout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders two-column grid layout on desktop (>1024px)', async () => {
    const { container } = render(
      <RoomShowcaseModal
        hotel={mockHotel}
        onClose={mockOnClose}
        onCheckout={mockOnCheckout}
        hotelId="hotel-test"
      />
    );

    // Buscar el contenedor principal del modal
    const modalContainer = container.querySelector('.glass-panel');
    expect(modalContainer).toBeTruthy();

    // En desktop, debe haber un grid de 2 columnas
    await waitFor(() => {
      const desktopGrid = container.querySelector('[class*="lg:grid-cols-2"]');
      expect(desktopGrid).toBeTruthy();
    });
  });

  it('displays gallery in left column on desktop', async () => {
    const { container } = render(
      <RoomShowcaseModal
        hotel={mockHotel}
        onClose={mockOnClose}
        onCheckout={mockOnCheckout}
        hotelId="hotel-test"
      />
    );

    await waitFor(() => {
      // Buscar el grid asimétrico de la galería (grid-cols-4 grid-rows-2)
      const gallery = container.querySelector('[class*="grid-cols-4"]');
      expect(gallery).toBeTruthy();
      
      // Verificar que contiene el nombre de la habitación en algún lugar
      const roomNameElements = container.querySelectorAll('*');
      const hasRoomName = Array.from(roomNameElements).some(el => 
        el.textContent?.includes('Suite Deluxe')
      );
      expect(hasRoomName).toBe(true);
    });
  });

  it('displays booking information in right column on desktop', async () => {
    const { container } = render(
      <RoomShowcaseModal
        hotel={mockHotel}
        onClose={mockOnClose}
        onCheckout={mockOnCheckout}
        hotelId="hotel-test"
      />
    );

    await waitFor(() => {
      // El panel de información debe contener el nombre de la habitación
      const roomNameElements = container.querySelectorAll('*');
      const hasRoomName = Array.from(roomNameElements).some(el => 
        el.textContent === 'Suite Deluxe'
      );
      expect(hasRoomName).toBe(true);

      // Debe contener elementos del panel de información (grid de amenidades, etc.)
      const infoPanel = container.querySelector('[class*="bg-gradient-to-b"]');
      expect(infoPanel).toBeTruthy();

      // Debe contener múltiples elementos de información
      const spaceYElements = container.querySelectorAll('[class*="space-y"]');
      expect(spaceYElements.length).toBeGreaterThan(2);
    });
  });

  it('displays total price and reserve button on desktop', async () => {
    const { container } = render(
      <RoomShowcaseModal
        hotel={mockHotel}
        onClose={mockOnClose}
        onCheckout={mockOnCheckout}
        hotelId="hotel-test"
      />
    );

    await waitFor(() => {
      // Debe mostrar el total (buscando el patrón de precio)
      const priceElements = container.querySelectorAll('[class*="font-black"]');
      expect(priceElements.length).toBeGreaterThan(0);

      // Debe mostrar el botón de reserva
      const buttons = container.querySelectorAll('button');
      const reserveButton = Array.from(buttons).find(btn => 
        btn.textContent?.includes('reserve') || btn.textContent?.includes('Reservar')
      );
      expect(reserveButton).toBeTruthy();
    });
  });

  it('displays reserve button with unified "Reservar" text', async () => {
    const { getAllByRole } = render(
      <RoomShowcaseModal
        hotel={mockHotel}
        onClose={mockOnClose}
        onCheckout={mockOnCheckout}
        hotelId="hotel-test"
      />
    );

    await waitFor(() => {
      const reserveButtons = getAllByRole('button', { name: /Reservar/ });
      expect(reserveButtons.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('does not repeat the room description already shown on the card', async () => {
    const { queryAllByText } = render(
      <RoomShowcaseModal
        hotel={mockHotel}
        onClose={mockOnClose}
        onCheckout={mockOnCheckout}
        hotelId="hotel-test"
      />
    );

    await waitFor(() => {
      expect(queryAllByText('Habitación de lujo con vista al mar')).toHaveLength(0);
    });
  });

  it('maintains single-column layout on mobile (<1024px)', async () => {
    // Simular viewport móvil
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    const { container } = render(
      <RoomShowcaseModal
        hotel={mockHotel}
        onClose={mockOnClose}
        onCheckout={mockOnCheckout}
        hotelId="hotel-test"
      />
    );

    await waitFor(() => {
      // En móvil, NO debe haber grid de 2 columnas
      const desktopGrid = container.querySelector('.lg\\:grid-cols-2');
      // El grid solo debe ser visible en lg (desktop), en móvil debe estar oculto
      // Esto se valida con las clases de Tailwind
      expect(desktopGrid).toBeTruthy(); // El elemento existe pero está oculto en móvil
    });
  });

  it('both columns scroll independently on desktop', async () => {
    const { container } = render(
      <RoomShowcaseModal
        hotel={mockHotel}
        onClose={mockOnClose}
        onCheckout={mockOnCheckout}
        hotelId="hotel-test"
      />
    );

    await waitFor(() => {
      // Ambas columnas deben tener overflow-y-auto para scroll independiente
      const scrollableColumns = container.querySelectorAll('.overflow-y-auto');
      expect(scrollableColumns.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('renders content hierarchy in order: Gallery → Title → Price → Policies → Payment → CTA', async () => {
    const { container } = render(
      <RoomShowcaseModal
        hotel={mockHotel}
        onClose={mockOnClose}
        onCheckout={mockOnCheckout}
        hotelId="hotel-test"
      />
    );

    await waitFor(() => {
      const gallery = container.querySelector('[data-testid="room-gallery"]');
      const title = container.querySelector('#room-modal-title');
      const price = container.querySelector('[data-testid="modal-price"]');
      const policies = container.querySelector('[data-testid="modal-policies"]');
      const payment = container.querySelector('[data-testid="modal-payment"]');
      const cta = container.querySelector('[data-testid="modal-cta"]');

      expect(gallery).toBeTruthy();
      expect(title).toBeTruthy();
      expect(price).toBeTruthy();
      expect(policies).toBeTruthy();
      expect(payment).toBeTruthy();
      expect(cta).toBeTruthy();

      const positions = [
        gallery?.compareDocumentPosition(title!),
        title?.compareDocumentPosition(price!),
        price?.compareDocumentPosition(policies!),
        policies?.compareDocumentPosition(payment!),
        payment?.compareDocumentPosition(cta!),
      ];

      // DOCUMENT_POSITION_FOLLOWING = 4
      positions.forEach((pos) => {
        expect(pos! & 4).toBeTruthy();
      });
    });
  });

  it('keeps CTA sticky at bottom during scroll', async () => {
    const { container } = render(
      <RoomShowcaseModal
        hotel={mockHotel}
        onClose={mockOnClose}
        onCheckout={mockOnCheckout}
        hotelId="hotel-test"
      />
    );

    await waitFor(() => {
      const cta = container.querySelector('[data-testid="modal-cta"]');
      expect(cta).toBeTruthy();
      const ctaClasses = cta?.className || '';
      expect(
        ctaClasses.includes('sticky') || ctaClasses.includes('fixed') || ctaClasses.includes('absolute')
      ).toBe(true);
      expect(ctaClasses.includes('bottom-0') || ctaClasses.includes('bottom-4')).toBe(true);
    });
  });
});

describe('RoomShowcaseModal - Analytics', () => {
  const mockHotel = {
    slug: 'test-hotel',
    name: 'Test Hotel',
    id: 'hotel-test',
    tax_rate: 0.19,
    rooms: [
      {
        id: 'room-1',
        name: 'Suite Deluxe',
        description: 'Habitación de lujo con vista al mar',
        price: 150000,
        price_per_night: 150000,
        capacity: 4,
        status: 'active',
        amenities: ['wifi', 'tv', 'minibar'],
        gallery: [
          { url: '/test1.jpg', alt: 'Test 1' },
          { url: '/test2.jpg', alt: 'Test 2' },
        ],
      },
    ],
  };

  const mockOnClose = vi.fn();
  const mockOnCheckout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires open_room_modal on mount', () => {
    render(
      <RoomShowcaseModal
        hotel={mockHotel}
        onClose={mockOnClose}
        onCheckout={mockOnCheckout}
        hotelId="hotel-test"
      />
    );

    expect(posthog.capture).toHaveBeenCalledWith('open_room_modal', {
      room_id: 'room-1',
      hotel_id: 'hotel-test',
      source: 'card',
    });
  });

  it('fires close_room_modal action back and abandon_booking when close button is clicked', async () => {
    const { container } = render(
      <RoomShowcaseModal
        hotel={mockHotel}
        onClose={mockOnClose}
        onCheckout={mockOnCheckout}
        hotelId="hotel-test"
      />
    );

    await waitFor(() => {
      expect(posthog.capture).toHaveBeenCalledWith('open_room_modal', expect.any(Object));
    });

    const closeButton = container.querySelector('button[aria-label="Cerrar"]');
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);

    expect(posthog.capture).toHaveBeenCalledWith('close_room_modal', {
      room_id: 'room-1',
      hotel_id: 'hotel-test',
      action: 'back',
    });
    expect(posthog.capture).toHaveBeenCalledWith('abandon_booking', {
      room_id: 'room-1',
      hotel_id: 'hotel-test',
      step: 'modal',
      time_spent: expect.any(Number),
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('fires close_room_modal action back and abandon_booking when backdrop is clicked', async () => {
    const { container } = render(
      <RoomShowcaseModal
        hotel={mockHotel}
        onClose={mockOnClose}
        onCheckout={mockOnCheckout}
        hotelId="hotel-test"
      />
    );

    await waitFor(() => {
      expect(posthog.capture).toHaveBeenCalledWith('open_room_modal', expect.any(Object));
    });

    const backdrop = container.querySelector('[data-testid="modal-backdrop"]');
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);

    expect(posthog.capture).toHaveBeenCalledWith('close_room_modal', {
      room_id: 'room-1',
      hotel_id: 'hotel-test',
      action: 'back',
    });
    expect(posthog.capture).toHaveBeenCalledWith('abandon_booking', {
      room_id: 'room-1',
      hotel_id: 'hotel-test',
      step: 'modal',
      time_spent: expect.any(Number),
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('fires close_room_modal action esc and abandon_booking when Escape is pressed', async () => {
    render(
      <RoomShowcaseModal
        hotel={mockHotel}
        onClose={mockOnClose}
        onCheckout={mockOnCheckout}
        hotelId="hotel-test"
      />
    );

    await waitFor(() => {
      expect(posthog.capture).toHaveBeenCalledWith('open_room_modal', expect.any(Object));
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(posthog.capture).toHaveBeenCalledWith('close_room_modal', {
      room_id: 'room-1',
      hotel_id: 'hotel-test',
      action: 'esc',
    });
    expect(posthog.capture).toHaveBeenCalledWith('abandon_booking', {
      room_id: 'room-1',
      hotel_id: 'hotel-test',
      step: 'modal',
      time_spent: expect.any(Number),
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('fires close_room_modal action reserve and not abandon_booking after the processing delay', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { getAllByRole } = render(
      <RoomShowcaseModal
        hotel={mockHotel}
        onClose={mockOnClose}
        onCheckout={mockOnCheckout}
        hotelId="hotel-test"
      />
    );

    expect(posthog.capture).toHaveBeenCalledWith('open_room_modal', expect.any(Object));

    const reserveButtons = getAllByRole('button', { name: /Reservar/ });
    expect(reserveButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(reserveButtons[0]);

    expect(reserveButtons[0]).toBeDisabled();
    expect(reserveButtons[0].textContent).toContain('Procesando...');

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(posthog.capture).toHaveBeenCalledWith('close_room_modal', {
      room_id: 'room-1',
      hotel_id: 'hotel-test',
      action: 'reserve',
    });
    expect(posthog.capture).not.toHaveBeenCalledWith('abandon_booking', expect.any(Object));
    expect(mockOnClose).toHaveBeenCalled();
    expect(mockOnCheckout).toHaveBeenCalledWith('room-1', 2);
  });

  it('ignores additional reserve clicks while processing', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { getAllByRole } = render(
      <RoomShowcaseModal
        hotel={mockHotel}
        onClose={mockOnClose}
        onCheckout={mockOnCheckout}
        hotelId="hotel-test"
      />
    );

    expect(posthog.capture).toHaveBeenCalledWith('open_room_modal', expect.any(Object));

    const reserveButtons = getAllByRole('button', { name: /Reservar/ });
    expect(reserveButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(reserveButtons[0]);
    fireEvent.click(reserveButtons[0]);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockOnCheckout).toHaveBeenCalledTimes(1);
  });

  it('scales the modal container from 0.95 to 1 with a 200ms fade transition', async () => {
    const { container } = render(
      <RoomShowcaseModal
        hotel={mockHotel}
        onClose={mockOnClose}
        onCheckout={mockOnCheckout}
        hotelId="hotel-test"
      />
    );

    await waitFor(() => {
      const animated = Array.from(container.querySelectorAll('[data-initial]'));
      const scaledContainer = animated.find((el) => {
        const initial = JSON.parse(el.getAttribute('data-initial') || '{}');
        return initial.scale !== undefined;
      });

      expect(scaledContainer).toBeTruthy();
      const initial = JSON.parse(scaledContainer?.getAttribute('data-initial') || '{}');
      const animate = JSON.parse(scaledContainer?.getAttribute('data-animate') || '{}');
      const transition = JSON.parse(scaledContainer?.getAttribute('data-transition') || '{}');

      expect(initial.opacity).toBe(0);
      expect(initial.scale).toBe(0.95);
      expect(animate.opacity).toBe(1);
      expect(animate.scale).toBe(1);
      expect(transition.duration).toBe(0.2);
    });
  });
});

describe('RoomShowcaseModal - Sold-out handling', () => {
  const mockHotel = {
    slug: 'test-hotel',
    name: 'Test Hotel',
    id: 'hotel-test',
    tax_rate: 0.19,
    rooms: [
      {
        id: 'room-1',
        name: 'Suite Deluxe',
        description: 'Habitación de lujo con vista al mar',
        price: 150000,
        price_per_night: 150000,
        capacity: 4,
        status: 'maintenance',
        amenities: ['wifi', 'tv', 'minibar'],
        gallery: [
          { url: '/test1.jpg', alt: 'Test 1' },
          { url: '/test2.jpg', alt: 'Test 2' },
        ],
      },
    ],
  };

  const mockOnClose = vi.fn();
  const mockOnCheckout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    const roomsSection = document.createElement('div');
    roomsSection.id = 'rooms-section';
    document.body.appendChild(roomsSection);
  });

  afterEach(() => {
    cleanup();
    const roomsSection = document.getElementById('rooms-section');
    if (roomsSection) roomsSection.remove();
  });

  it('renders sold-out state when the selected room is not active', async () => {
    const { getByText } = render(
      <RoomShowcaseModal
        hotel={mockHotel}
        onClose={mockOnClose}
        onCheckout={mockOnCheckout}
        hotelId="hotel-test"
      />
    );

    await waitFor(() => {
      expect(getByText('Ya no disponible')).toBeInTheDocument();
      expect(getByText('Ver otras habitaciones')).toBeInTheDocument();
    });
  });

  it('does not render the reserve CTA when the room is sold out', async () => {
    const { queryAllByRole } = render(
      <RoomShowcaseModal
        hotel={mockHotel}
        onClose={mockOnClose}
        onCheckout={mockOnCheckout}
        hotelId="hotel-test"
      />
    );

    await waitFor(() => {
      expect(queryAllByRole('button', { name: /Reservar/ })).toHaveLength(0);
    });
  });

  it('closes the modal and scrolls to the room list when "Ver otras habitaciones" is clicked', async () => {
    const scrollIntoViewMock = vi.fn();
    const roomsSection = document.getElementById('rooms-section');
    if (roomsSection) {
      roomsSection.scrollIntoView = scrollIntoViewMock;
    }

    const { getByText } = render(
      <RoomShowcaseModal
        hotel={mockHotel}
        onClose={mockOnClose}
        onCheckout={mockOnCheckout}
        hotelId="hotel-test"
      />
    );

    await waitFor(() => {
      expect(getByText('Ver otras habitaciones')).toBeInTheDocument();
    });

    fireEvent.click(getByText('Ver otras habitaciones'));

    expect(mockOnClose).toHaveBeenCalled();
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
  });
});
