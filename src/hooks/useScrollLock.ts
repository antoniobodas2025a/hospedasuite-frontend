import { useEffect } from 'react';

/**
 * useScrollLock
 * 
 * Locks the body scroll when a modal is open to prevent background scrolling.
 * Implements "Emergency Exit" heuristic by ensuring the user regains control
 * of the viewport context when the modal is dismissed.
 * 
 * @param isLocked - Boolean flag to toggle scroll lock.
 */
export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (isLocked) {
      // Save current scroll position and style
      const scrollY = window.scrollY;
      const originalOverflow = document.documentElement.style.overflow;
      
      // Apply lock
      document.documentElement.style.overflow = 'hidden';
      
      // Cleanup function
      return () => {
        document.documentElement.style.overflow = originalOverflow;
        // Restore scroll position if needed, though usually not required for modals
        // window.scrollTo(0, scrollY); 
      };
    }
  }, [isLocked]);
}
