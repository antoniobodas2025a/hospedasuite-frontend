'use client';

import { useEffect, useState, useRef } from 'react';
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

  // Track scroll for sticky shadow + active section detection
  useEffect(() => {
    const onScroll = () => {
      // Add shadow when page is scrolled past hero
      setScrolled(window.scrollY > 400);

      // Find which section is currently in view (threshold: 160px from top)
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
    onScroll(); // Initial check
    return () => window.removeEventListener('scroll', onScroll);
  }, [sections]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      // Offset for sticky nav height
      const y = el.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <nav
      ref={navRef}
      className={`sticky top-0 z-[var(--z-sticky)] transition-all duration-300 ${
        scrolled
          ? 'shadow-lg shadow-black/5 glass-panel !rounded-none'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto max-w-6xl px-6 py-2">
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
