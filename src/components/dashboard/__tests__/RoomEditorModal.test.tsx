// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RoomEditorModal from '../RoomEditorModal';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children }: { children?: React.ReactNode }) => React.createElement('div', {}, children),
  },
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ alt, src, fill, ...props }: any) => {
    return React.createElement('img', { alt, src, ...props });
  },
}));

// Mock lucide-react icons to avoid full bundle
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  return {
    ...actual,
    // All icons become simple spans
    Wifi: () => React.createElement('span', {}, 'Wifi'),
    Car: () => React.createElement('span', {}, 'Car'),
    Waves: () => React.createElement('span', {}, 'Waves'),
    Dumbbell: () => React.createElement('span', {}, 'Dumbbell'),
    UtensilsCrossed: () => React.createElement('span', {}, 'Utensils'),
    Coffee: () => React.createElement('span', {}, 'Coffee'),
    Wind: () => React.createElement('span', {}, 'Wind'),
    Bath: () => React.createElement('span', {}, 'Bath'),
    Tv: () => React.createElement('span', {}, 'Tv'),
    Snowflake: () => React.createElement('span', {}, 'Snowflake'),
    X: () => React.createElement('span', {}, 'X'),
    Trash2: () => React.createElement('span', {}, 'Trash'),
    Copy: () => React.createElement('span', {}, 'Copy'),
    RefreshCw: () => React.createElement('span', {}, 'Refresh'),
    Image: ({ className }: any) => React.createElement('span', { className }, 'Image'),
    Building2: () => React.createElement('span', {}, 'Building'),
    Plus: () => React.createElement('span', {}, 'Plus'),
    UploadCloud: () => React.createElement('span', {}, 'Upload'),
    Loader2: () => React.createElement('span', {}, 'Loader'),
    GripVertical: () => React.createElement('span', {}, 'Grip'),
  };
});

// Mock DND kit
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => React.createElement('div', {}, children),
  closestCenter: () => ({}),
  PointerSensor: class {},
  useSensor: () => ({}),
  useSensors: () => ({}),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => React.createElement('div', {}, children),
  useSortable: () => ({ attributes: {}, listeners: {}, setNodeRef: () => {}, transform: null, transition: null, isDragging: false }),
  horizontalListSortingStrategy: () => ({}),
  arrayMove: (arr: any[]) => arr,
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => '' } },
}));

// Mock server actions
vi.mock('@/app/actions/inventory', () => ({
  saveRoomAction: vi.fn(),
}));

vi.mock('@/app/actions/settings', () => ({
  getPresignedUploadUrlAction: vi.fn(),
}));

vi.mock('@/lib/upload-utils', () => ({
  compressImage: vi.fn(),
  generateBlurDataURL: vi.fn(),
  uploadToR2: vi.fn(),
}));

vi.mock('@/components/dashboard/PriceCalculator', () => ({
  default: () => React.createElement('div', {}, 'PriceCalculator'),
}));

const { saveRoomAction } = await import('@/app/actions/inventory');

const mockRoom = {
  id: 'room-123',
  name: 'Habitación Estándar',
  capacity: 2,
  price: 80000,
  description: '',
  status: 'available',
  amenities: [],
  gallery: [],
  ical_import_url: '',
  bed_type: undefined,
  beds: undefined,
};

const setup = (props = {}) => {
  const onClose = vi.fn();
  const utils = render(
    <RoomEditorModal
      hotelId="hotel-123"
      initialData={mockRoom}
      onClose={onClose}
      {...props}
    />
  );
  return { onClose, ...utils };
};

describe('RoomEditorModal', () => {
  it('guarda cambios cuando el status es available', async () => {
    vi.mocked(saveRoomAction).mockResolvedValueOnce({ success: true });
    const { onClose } = setup();

    const priceInput = screen.getByLabelText(/Precio por Noche/i);
    const saveButton = screen.getByRole('button', { name: /Guardar Cambios/i });

    fireEvent.change(priceInput, { target: { value: '200000' } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(saveRoomAction).toHaveBeenCalledWith(
        'hotel-123',
        expect.objectContaining({ price: 200000, status: 'available' }),
        'room-123'
      );
    });
    expect(onClose).toHaveBeenCalledWith(true);
  });

  it('muestra error específico cuando el nombre está vacío', async () => {
    const { onClose } = setup();

    const nameInput = screen.getByPlaceholderText(/Nombre de la Habitación/i);
    const saveButton = screen.getByRole('button', { name: /Guardar Cambios/i });

    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/El nombre de la habitación es obligatorio/i)).toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('muestra error específico cuando la capacidad es menor a 1', async () => {
    const { onClose } = setup();

    const capacityInput = screen.getByLabelText(/Capacidad/i);
    const saveButton = screen.getByRole('button', { name: /Guardar Cambios/i });

    fireEvent.change(capacityInput, { target: { value: '0' } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/La capacidad debe ser al menos 1 persona/i)).toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('muestra error específico cuando el precio es negativo', async () => {
    const { onClose } = setup();

    const priceInput = screen.getByLabelText(/Precio por Noche/i);
    const saveButton = screen.getByRole('button', { name: /Guardar Cambios/i });

    fireEvent.change(priceInput, { target: { value: '-100' } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/El precio no puede ser negativo/i)).toBeInTheDocument();
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
