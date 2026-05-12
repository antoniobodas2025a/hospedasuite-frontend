import React from 'react';

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
    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group ${
      active
        ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
        : 'text-muted-foreground hover:text-sidebar-foreground hover:bg-white/5'
    } ${className}`}
  >
    <span
      className={`transition-transform duration-300 ${
        active ? 'scale-110' : 'group-hover:scale-110'
      }`}
    >
      {icon}
    </span>
    {label && (
      <span className='font-sans font-medium tracking-wide text-sm'>
        {label}
      </span>
    )}
  </button>
);

export default NavButton;
