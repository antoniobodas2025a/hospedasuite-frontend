'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { springLayout, springSnappy } from '@/lib/mac2026/spring';

// ============================================================================
// STICKY SUB-NAV — Mac 2026 Design System
//
// Pilares aplicados:
// - Glassmorphism 2.0: glass-pill con backdrop-blur-xl + border specular
// - Squircles: glass-pill usa var(--radius-squircle-xl)
// - Spring physics: layoutId indicator con springLayout()
// - Reduccionismo cognitivo: max 5 chunks (Miller's Law)
// - Affordance organico: whileTap spring feedback en cada boton
// - Performance: IntersectionObserver for section detection, rAF for scroll
// ============================================================================

interface Section {
  id: string;
  label: string;
}

interface StickySubNavProps {
  sections: Section[];
}

export default function StickySubNav({ sections }: StickySubNavProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const ioRef = useRef<IntersectionObserver | null>(null);

  // IntersectionObserver for active section detection (no getBoundingClientRect on scroll)
  useEffect(() => {
    const hasIO = typeof IntersectionObserver !== 'undefined';

    if (hasIO) {
      const observer = new IntersectionObserver(
        (entries) => {
          // Find the section that is most visible above the threshold
          for (let i = entries.length - 1; i >= 0; i--) {
            if (entries[i].isIntersecting) {
              setActiveId(entries[i].target.id);
              break;
            }
          }
        },
        { rootMargin: '-160px 0px -60% 0px', threshold: 0 }
      );

      // Observe each section element
      sections.forEach((section) => {
        const el = document.getElementById(section.id);
        if (el) observer.observe(el);
      });

      ioRef.current = observer;

      return () => {
        observer.disconnect();
        ioRef.current = null;
      };
    } else {
      // Fallback for browsers without IntersectionObserver: throttled scroll
      let lastTick = 0;
      const THROTTLE_MS = 100;

      const onScroll = () => {
        const now = Date.now();
        if (now - lastTick < THROTTLE_MS) return;
        lastTick = now;

        for (let i = sections.length - 1; i >= 0; i--) {
          const el = document.getElementById(sections[i].id);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= 160) {
              setActiveId(sections[i].id);
              break;
            }
          }
        }
      };

      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();

      return () => window.removeEventListener('scroll', onScroll);
    }
  }, [sections]);

  // rAF-throttled scroll for shadow/glass effect only
  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 400);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Re-observe sections when they change (e.g. after navigation)
  const reobserveSections = useCallback(() => {
    if (ioRef.current) {
      ioRef.current.disconnect();
      sections.forEach((section) => {
        const el = document.getElementById(section.id);
        if (el) ioRef.current!.observe(el);
      });
    }
  }, [sections]);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      // Use pre-calculated offset instead of getBoundingClientRect
      const y = el.offsetTop - 120;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, []);

  return (
    <nav
      ref={navRef}
      className="relative z-10"
    >
      <div className={`mx-auto max-w-6xl px-6 py-2 transition-all duration-300 ${
        scrolled ? 'glass-panel !rounded-none shadow-lg shadow-elev-1' : 'bg-transparent'
      }`}>
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide glass-pill px-1.5 py-1">
          {sections.map((section) => {
            const isActive = section.id === activeId;
            return (
              <motion.button
                key={section.id}
                onClick={() => scrollTo(section.id)}
                whileTap={{ scale: 0.95 }}
                transition={springSnappy()}
                className={`relative shrink-0 px-4 py-2 text-sm font-medium rounded-[var(--radius-squircle-lg)] transition-colors duration-200 ${
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-current={isActive ? 'true' : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="subnav-active-bg"
                    className="absolute inset-0 bg-foreground/8"
                    transition={springLayout()}
                    style={{ borderRadius: 12 }}
                  />
                )}
                <span className="relative z-10">{section.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
