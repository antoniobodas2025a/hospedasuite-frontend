'use client';

import { useState, useCallback } from 'react';

interface UseBookingFlowReturn {
  isProcessing: boolean;
  handleReserve: (action: () => void) => Promise<void>;
}

/**
 * Hook for booking flow processing state and button orchestration.
 * Provides a visual feedback delay before executing the reserve action.
 */
export function useBookingFlow(): UseBookingFlowReturn {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleReserve = useCallback(async (action: () => void) => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      // Small delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 300));
      action();
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  return { isProcessing, handleReserve };
}
