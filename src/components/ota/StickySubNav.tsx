'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

// ============================================================================
// STICKY SUB-NAV — Mac 2026 Design System
//
// Pilares aplicados:
// - Glassmorphism 2.0: backdrop-blur-xl + border white/40 specular
// - Squircles: rounded-2xl (curvatura continua)
// - Spring physics: layoutId indicator con stiffness/damping
// - Reduccionismo cognitivo: max 5 chunks (Miller's Law)
// - Affordance organico: hover scale + active tap feedback
// ============================================================================

interface Section {
  id: string;
  label: string;
}

interface StickySubNavProps {
  sections: Section[];
}

const springTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 24,
  mass: 0.8,
};

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
      className={`sticky top-0 z-30 transition-all duration-300 ${
        scrolled
          ? 'shadow-lg shadow-black/5 bg-background/80 backdrop-blur-xl'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto max-w-6xl px-6 py-2">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide rounded-2xl bg-white/70 backdrop-blur-xl border border-white/40 px-1.5 py-1 shadow-sm">
          {sections.map((section) => {
            const isActive = section.id === activeId;
            return (
              <button
                key={section.id}
                onClick={() => scrollTo(section.id)}
                className={`relative shrink-0 px-4 py-2 text-sm font-medium rounded-xl transition-colors duration-200 ${
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
                    transition={springTransition}
                    style={{ borderRadius: 12 }}
                  />
                )}
                <span className="relative z-10">{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
