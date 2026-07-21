// @vitest-environment jsdom
import '../../../__tests__/bun-test-dom-setup';
import { describe, it, expect, mock, beforeEach } from 'bun:test';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GalleryPicker from '../GalleryPicker';
import { useHotelImagesStore } from '@/store/useHotelImagesStore';

// Mock framer-motion
mock.module('framer-motion', () => ({
  motion: {
    div: ({ children }: any) => React.createElement('div', {}, children),
    button: ({ children }: any) => React.createElement('button', {}, children),
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock lucide-react icons
mock.module('lucide-react', () => ({
  X: () => React.createElement('span', null, 'X'),
  Check: () => React.createElement('span', null, '✓'),
  Image: () => React.createElement('span', null, '🖼️'),
  Copy: () => React.createElement('span', null, '📋'),
}));

// Mock next-intl
mock.module('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('GalleryPicker', () => {
  const mockOnClose = mock();
  const mockOnCopy = mock();

  beforeEach(() => {
    mockOnClose.mockReset();
    mockOnCopy.mockReset();
    useHotelImagesStore.getState().clearAll();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <GalleryPicker
        isOpen={false}
        onClose={mockOnClose}
        onCopy={mockOnCopy}
        existingFiles={[]}
        maxImages={5}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal when isOpen is true', () => {
    render(
      <GalleryPicker
        isOpen={true}
        onClose={mockOnClose}
        onCopy={mockOnCopy}
        existingFiles={[]}
        maxImages={5}
      />
    );
    expect(screen.getByText('Copiar de la galería')).toBeDefined();
  });

  it('displays message when no images in gallery', () => {
    render(
      <GalleryPicker
        isOpen={true}
        onClose={mockOnClose}
        onCopy={mockOnCopy}
        existingFiles={[]}
        maxImages={5}
      />
    );
    expect(screen.getByText(/No hay fotos en la galería/)).toBeDefined();
  });

  it('displays message when all images already in room', () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    useHotelImagesStore.getState().addImage('exterior', file, 'blob:test');

    render(
      <GalleryPicker
        isOpen={true}
        onClose={mockOnClose}
        onCopy={mockOnCopy}
        existingFiles={[file]}
        maxImages={5}
      />
    );
    expect(screen.getByText(/Todas las fotos de la galería ya están/)).toBeDefined();
  });

  it('displays gallery images grouped by category', () => {
    const exteriorFile = new File(['test'], 'exterior.jpg', { type: 'image/jpeg' });
    const lobbyFile = new File(['test'], 'lobby.jpg', { type: 'image/jpeg' });
    
    useHotelImagesStore.getState().addImage('exterior', exteriorFile, 'blob:exterior');
    useHotelImagesStore.getState().addImage('lobby', lobbyFile, 'blob:lobby');

    render(
      <GalleryPicker
        isOpen={true}
        onClose={mockOnClose}
        onCopy={mockOnCopy}
        existingFiles={[]}
        maxImages={5}
      />
    );

    expect(screen.getByText('Exteriores')).toBeDefined();
    expect(screen.getByText('Lobby / Recepción')).toBeDefined();
  });

  it('allows selecting images', () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    useHotelImagesStore.getState().addImage('exterior', file, 'blob:test');

    render(
      <GalleryPicker
        isOpen={true}
        onClose={mockOnClose}
        onCopy={mockOnCopy}
        existingFiles={[]}
        maxImages={5}
      />
    );

    const imageButton = screen.getByRole('button', { name: /test\.jpg/i });
    fireEvent.click(imageButton);

    expect(screen.getByText('Copiar 1 foto')).toBeDefined();
  });

  it('respects maxImages limit', () => {
    const file1 = new File(['test1'], 'test1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['test2'], 'test2.jpg', { type: 'image/jpeg' });
    const file3 = new File(['test3'], 'test3.jpg', { type: 'image/jpeg' });
    
    useHotelImagesStore.getState().addImage('exterior', file1, 'blob:test1');
    useHotelImagesStore.getState().addImage('exterior', file2, 'blob:test2');
    useHotelImagesStore.getState().addImage('exterior', file3, 'blob:test3');

    render(
      <GalleryPicker
        isOpen={true}
        onClose={mockOnClose}
        onCopy={mockOnCopy}
        existingFiles={[]}
        maxImages={2}
      />
    );

    // Select first two images
    const buttons = screen.getAllByRole('button', { name: /test\d\.jpg/i });
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);

    expect(screen.getByText('Copiar 2 fotos')).toBeDefined();

    // Try to select third image - should not increase count
    fireEvent.click(buttons[2]);
    expect(screen.getByText('Copiar 2 fotos')).toBeDefined();
  });

  it('calls onCopy with selected files and previews', () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    useHotelImagesStore.getState().addImage('exterior', file, 'blob:test');

    render(
      <GalleryPicker
        isOpen={true}
        onClose={mockOnClose}
        onCopy={mockOnCopy}
        existingFiles={[]}
        maxImages={5}
      />
    );

    const imageButton = screen.getByRole('button', { name: /test\.jpg/i });
    fireEvent.click(imageButton);

    const copyButton = screen.getByText('Copiar 1 foto');
    fireEvent.click(copyButton);

    expect(mockOnCopy).toHaveBeenCalledWith([file], ['blob:test']);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when cancel button is clicked', () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    useHotelImagesStore.getState().addImage('exterior', file, 'blob:test');

    render(
      <GalleryPicker
        isOpen={true}
        onClose={mockOnClose}
        onCopy={mockOnCopy}
        existingFiles={[]}
        maxImages={5}
      />
    );

    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('clears selection when "Limpiar selección" is clicked', () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    useHotelImagesStore.getState().addImage('exterior', file, 'blob:test');

    render(
      <GalleryPicker
        isOpen={true}
        onClose={mockOnClose}
        onCopy={mockOnCopy}
        existingFiles={[]}
        maxImages={5}
      />
    );

    const imageButton = screen.getByRole('button', { name: /test\.jpg/i });
    fireEvent.click(imageButton);
    expect(screen.getByText('Copiar 1 foto')).toBeDefined();

    const clearButton = screen.getByText('Limpiar selección');
    fireEvent.click(clearButton);

    expect(screen.getByText('Copiar 0 fotos')).toBeDefined();
  });
});
