'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { springLayout, springSnappy } from '@/lib/mac2026/spring';

interface NavButtonProps {
  icon: React.ReactNode;
  label?: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

const NavButton = ({
  icon,
  label,
  active,
  onClick,
  className = '',
}: NavButtonProps) => (
  <button
    onClick={onClick}
    className={`relative w-full flex items-center gap-4 px-4 py-3.5 rounded-[var(--radius-squircle-lg)] transition-colors duration-200 group ${
      active
        ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
        : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-white/5'
    } ${className}`}
  >
    {/* Spring active indicator — animated left pill */}
    {active && (
      <motion.div
        layoutId="sidebar-active-indicator"
        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-brand-400"
        transition={springLayout()}
      />
    )}

    <span
      className={`transition-transform ${
        active ? 'scale-110' : 'group-hover:scale-110'
      }`}
      style={{ transition: active ? 'transform 0.2s ease' : 'transform 0.3s ease' }}
    >
      {icon}
    </span>
    {label && (
      <span className="font-sans font-medium tracking-wide text-sm">
        {label}
      </span>
    )}
  </button>
);

export default NavButton;
