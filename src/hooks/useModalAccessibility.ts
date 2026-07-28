import { useEffect, useRef, useCallback } from 'react';
import { useScrollLock } from './useScrollLock';

/**
 * useModalAccessibility
 * 
 * Hook completo para accesibilidad de modales según WCAG 2.1 AA:
 * - Focus trapping: El foco se mantiene dentro del modal
 * - ESC handler: Cierra el modal con la tecla Escape
 * - Scroll lock: Previene scroll del body cuando el modal está abierto
 * - ARIA attributes: role="dialog", aria-modal="true", aria-labelledby
 * 
 * @param isOpen - Boolean que indica si el modal está abierto
 * @param onClose - Callback para cerrar el modal
 * @param titleId - ID del elemento que contiene el título del modal (para aria-labelledby)
 */
export function useModalAccessibility(
  isOpen: boolean,
  onClose: () => void,
  titleId?: string
) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Scroll lock
  useScrollLock(isOpen);

  // Guardar elemento con foco anterior y restaurarlo al cerrar
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // Mover foco al modal cuando se abre
      setTimeout(() => {
        if (modalRef.current) {
          const focusableElements = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const firstFocusable = focusableElements[0] as HTMLElement;
          if (firstFocusable) {
            firstFocusable.focus();
          } else {
            // Si no hay elementos focusable, hacer focus en el modal mismo
            modalRef.current.setAttribute('tabindex', '-1');
            modalRef.current.focus();
          }
        }
      }, 0);
    } else {
      // Restaurar foco al elemento anterior
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
        previousActiveElement.current = null;
      }
    }
  }, [isOpen]);

  // ESC handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trapping
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return;

      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstFocusable = focusableElements[0] as HTMLElement;
      const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    const modal = modalRef.current;
    modal.addEventListener('keydown', handleTabKey);
    return () => modal.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  // ARIA attributes
  const ariaProps = {
    role: 'dialog' as const,
    'aria-modal': 'true' as const,
    'aria-labelledby': titleId,
  };

  return {
    modalRef,
    ariaProps,
  };
}
