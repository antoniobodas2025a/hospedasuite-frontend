'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { springSnappy, springGentle } from '@/lib/mac2026/spring';
import { searchLocationsAction, LocationSuggestion } from '@/app/actions/ota';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * LocationAutocomplete — City search with hotel counts.
 *
 * Debounced server-side search → dropdown with city + hotel count.
 * Follows Mac 2026 aesthetics: squircles, glass, spring physics.
 */
export default function LocationAutocomplete({
  value,
  onChange,
  placeholder = '¿A dónde vas?',
}: LocationAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value changes
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    const result = await searchLocationsAction(query);
    setIsLoading(false);

    if (result.success && result.data.length > 0) {
      setSuggestions(result.data);
      setIsOpen(true);
      setSelectedIndex(-1);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 300);
  };

  const handleSelect = (city: string) => {
    setInputValue(city);
    onChange(city);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
    setSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        onChange(inputValue);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex].city);
        } else if (inputValue) {
          onChange(inputValue);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input wrapper */}
      <div className="relative flex items-center">
        <MapPin size={16} className="absolute left-3 text-muted-foreground/50 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-transparent border-none focus:ring-0 text-foreground placeholder:text-muted-foreground/50 pl-9 pr-8 h-9 sm:h-10 text-sm sm:text-base outline-none"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="location-suggestions"
        />
        {/* Loading spinner or clear button */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={springSnappy()}
              className="absolute right-3"
            >
              <Loader2 size={14} className="text-brand-500 animate-spin" />
            </motion.div>
          ) : inputValue ? (
            <motion.button
              key="clear"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={springSnappy()}
              onClick={handleClear}
              className="absolute right-3 size-5 rounded-full flex items-center justify-center hover:bg-muted/50 hover:text-foreground transition-colors text-muted-foreground/50"
              aria-label="Limpiar búsqueda"
            >
              <X size={12} strokeWidth={2.5} />
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={springGentle()}
            id="location-suggestions"
            role="listbox"
            className="absolute top-full left-0 right-0 mt-2 bg-card border border-border/50 rounded-[var(--radius-squircle-xl)] shadow-xl overflow-hidden z-50"
          >
            <div className="max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.city}
                  role="option"
                  aria-selected={index === selectedIndex}
                  onClick={() => handleSelect(suggestion.city)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm transition-colors ${
                    index === selectedIndex
                      ? 'bg-brand-500/10 text-brand-700'
                      : 'text-foreground hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MapPin size={14} className="text-muted-foreground/50 shrink-0" />
                    <span className="truncate font-medium">{suggestion.city}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {suggestion.hotelCount} {suggestion.hotelCount === 1 ? 'alojamiento' : 'alojamientos'}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
