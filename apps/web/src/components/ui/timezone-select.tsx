'use client';

import React, { useState, useEffect, useRef, useId } from 'react';
import { getSupportedTimezones, TimezoneOption } from '@kalpak/validation';
import { Globe, Search, X, ChevronDown, Check } from 'lucide-react';

export interface TimezoneSelectProps {
  id?: string;
  label?: string;
  value?: string;
  error?: string;
  helperText?: string;
  placeholder?: string;
  onChange: (timezone: string) => void;
  required?: boolean;
}

export function TimezoneSelect({
  id: customId,
  label = 'Primary Timezone (Optional)',
  value = '',
  error,
  helperText,
  placeholder = 'Search timezone or city (e.g. Kolkata, New York, Tokyo)',
  onChange,
  required = false,
}: TimezoneSelectProps) {
  const generatedId = useId();
  const id = customId || generatedId;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [timezones, setTimezones] = useState<TimezoneOption[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    // Populate dynamic timezone list client-side
    setTimezones(getSupportedTimezones());
  }, []);

  // Filter timezones based on search query
  const filteredTimezones = timezones.filter((tz) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      tz.value.toLowerCase().includes(q) ||
      tz.label.toLowerCase().includes(q) ||
      tz.city.toLowerCase().includes(q) ||
      tz.offset.toLowerCase().includes(q)
    );
  });

  // Current selected option
  const selectedOption = timezones.find((tz) => tz.value === value);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle keyboard navigation inside the combobox
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredTimezones.length - 1 ? prev + 1 : prev));
      scrollHighlightedIntoView(highlightedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      scrollHighlightedIntoView(highlightedIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filteredTimezones[highlightedIndex];
      if (target) {
        onChange(target.value);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const scrollHighlightedIntoView = (index: number) => {
    if (listboxRef.current) {
      const items = listboxRef.current.querySelectorAll('li');
      const item = items[index];
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  };

  return (
    <div className="w-full relative" ref={containerRef}>
      {label && (
        <label htmlFor={`${id}-btn`} className="block text-sm font-medium text-slate-700 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Main Selector Button */}
      <div className="relative">
        <button
          type="button"
          id={`${id}-btn`}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm text-left flex items-center justify-between transition-colors shadow-xs ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
              : isOpen
              ? 'border-orange-500 ring-2 ring-orange-100'
              : 'border-slate-300 hover:border-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <Globe className="w-4 h-4 text-slate-400 shrink-0" />
            {selectedOption ? (
              <span className="text-slate-900 font-medium truncate">{selectedOption.label}</span>
            ) : value ? (
              <span className="text-slate-900 font-medium truncate">{value}</span>
            ) : (
              <span className="text-slate-400 truncate">{placeholder}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {value && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    onChange('');
                  }
                }}
                title="Clear selected timezone (Keep optional)"
                className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {/* Dropdown Panel */}
        {isOpen && (
          <div className="absolute z-50 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/50 overflow-hidden">
            {/* Search Input Box */}
            <div className="p-2 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Listbox */}
            <ul
              ref={listboxRef}
              role="listbox"
              id={`${id}-listbox`}
              className="max-h-60 overflow-y-auto py-1 text-xs divide-y divide-slate-50"
            >
              {filteredTimezones.length === 0 ? (
                <li className="px-4 py-6 text-center text-slate-400">
                  <p className="font-medium">No timezones match &ldquo;{searchQuery}&rdquo;</p>
                  <p className="text-[11px] mt-1 text-slate-400">Try searching for a country or major city name.</p>
                </li>
              ) : (
                filteredTimezones.map((tz, index) => {
                  const isSelected = tz.value === value;
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <li
                      key={tz.value}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(tz.value);
                        setIsOpen(false);
                      }}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`px-3.5 py-2.5 cursor-pointer flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-orange-50 text-orange-950 font-semibold'
                          : isHighlighted
                          ? 'bg-slate-50 text-slate-900'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="truncate font-medium">{tz.label}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                            {tz.offset}
                          </span>
                          <span className="truncate">{tz.value}</span>
                        </div>
                      </div>

                      {isSelected && <Check className="w-4 h-4 text-orange-600 shrink-0 ml-2" />}
                    </li>
                  );
                })
              )}
            </ul>

            {/* Optional helper footer */}
            <div className="p-2 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500 flex justify-between items-center">
              <span>Showing {filteredTimezones.length} valid IANA timezones</span>
              {value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setIsOpen(false);
                  }}
                  className="text-orange-600 hover:text-orange-700 font-semibold"
                >
                  Clear Selection
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {error ? (
        <p className="mt-1.5 text-xs text-red-600 font-medium">{error}</p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
}
