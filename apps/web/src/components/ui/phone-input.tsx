'use client';

import React, { useState, useEffect, useRef, useId } from 'react';
import {
  getSupportedCountries,
  normalizePhoneNumber,
  CountryCallingCodeOption,
  CountryCode,
} from '@kalpak/validation';
import { Search, ChevronDown, Check } from 'lucide-react';

export interface PhoneInputProps {
  id?: string;
  label?: string;
  value?: string;
  error?: string;
  helperText?: string;
  placeholder?: string;
  defaultCountry?: CountryCode;
  onChange: (e164Phone: string, rawInput?: string) => void;
  required?: boolean;
}

export function PhoneInput({
  id: customId,
  label = 'Phone Number (Optional)',
  value = '',
  error,
  helperText,
  placeholder = 'Enter phone number',
  defaultCountry = 'IN',
  onChange,
  required = false,
}: PhoneInputProps) {
  const generatedId = useId();
  const id = customId || generatedId;

  const [countries, setCountries] = useState<CountryCallingCodeOption[]>([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState<CountryCode>(defaultCountry);
  const [nationalNumber, setNationalNumber] = useState('');
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const countrySearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCountries(getSupportedCountries());
  }, []);

  // When value changes from parent (e.g. existing record with E.164 format), parse and update local state
  useEffect(() => {
    if (value) {
      const parsed = normalizePhoneNumber(value, selectedCountryCode);
      if (parsed.country && parsed.country !== selectedCountryCode) {
        setSelectedCountryCode(parsed.country);
      }
      if (parsed.nationalNumber) {
        setNationalNumber(parsed.nationalNumber);
      } else {
        setNationalNumber(value);
      }
    } else {
      setNationalNumber('');
    }
  }, [value]);

  // Current selected country metadata
  const selectedCountry =
    countries.find((c) => c.code === selectedCountryCode) ||
    countries.find((c) => c.code === 'IN') || {
      code: 'IN' as CountryCode,
      name: 'India',
      dialCode: '+91',
      flag: '🇮🇳',
    };

  // Filter countries for search
  const filteredCountries = countries.filter((c) => {
    if (!countrySearchQuery.trim()) return true;
    const q = countrySearchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.dialCode.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q)
    );
  });

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsCountryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when country dropdown opens
  useEffect(() => {
    if (isCountryOpen) {
      setCountrySearchQuery('');
      setTimeout(() => {
        countrySearchRef.current?.focus();
      }, 50);
    }
  }, [isCountryOpen]);

  // Handle phone number input changes
  const handlePhoneChange = (inputVal: string, country = selectedCountryCode) => {
    setNationalNumber(inputVal);

    if (!inputVal.trim()) {
      setValidationError(null);
      onChange('');
      return;
    }

    const parsed = normalizePhoneNumber(inputVal.trim(), country);
    if (parsed.isValid && parsed.e164) {
      setValidationError(null);
      onChange(parsed.e164, inputVal);
    } else {
      setValidationError(parsed.error || 'Please enter a valid phone number');
      // Pass the best-effort string or formatted partial so parent keeps current typing
      onChange(inputVal.trim().startsWith('+') ? inputVal.trim() : `${selectedCountry.dialCode}${inputVal.trim()}`, inputVal);
    }
  };

  const handleCountrySelect = (newCountry: CountryCallingCodeOption) => {
    setSelectedCountryCode(newCountry.code);
    setIsCountryOpen(false);
    if (nationalNumber) {
      handlePhoneChange(nationalNumber, newCountry.code);
    }
  };

  const displayError = error || validationError;

  return (
    <div className="w-full relative" ref={containerRef}>
      {label && (
        <label htmlFor={`${id}-phone`} className="block text-sm font-medium text-slate-700 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative flex rounded-xl shadow-xs">
        {/* Country Selector Dropdown Button */}
        <button
          type="button"
          id={`${id}-country-btn`}
          onClick={() => setIsCountryOpen(!isCountryOpen)}
          aria-haspopup="listbox"
          aria-expanded={isCountryOpen}
          aria-label={`Select country code. Current: ${selectedCountry.name} (${selectedCountry.dialCode})`}
          className={`shrink-0 z-10 inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium text-slate-800 bg-slate-50 border rounded-l-xl transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-100 ${
            displayError ? 'border-red-300' : 'border-slate-300 border-r-0'
          }`}
        >
          <span className="text-base leading-none" aria-hidden="true">
            {selectedCountry.flag}
          </span>
          <span className="font-semibold text-slate-900">{selectedCountry.dialCode}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isCountryOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Phone Input Box */}
        <div className="relative w-full">
          <input
            type="tel"
            id={`${id}-phone`}
            value={nationalNumber}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full px-3.5 py-2.5 bg-white border rounded-r-xl text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-50 ${
              displayError
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                : 'border-slate-300 focus:border-orange-500 focus:ring-orange-100'
            }`}
          />
        </div>

        {/* Country Selector Popover */}
        {isCountryOpen && (
          <div className="absolute top-full left-0 z-50 mt-1.5 w-72 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/50 overflow-hidden">
            {/* Search Country Input */}
            <div className="p-2 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={countrySearchRef}
                  type="text"
                  value={countrySearchQuery}
                  onChange={(e) => setCountrySearchQuery(e.target.value)}
                  placeholder="Search country or code (e.g. India, +1, Japan)"
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Country List */}
            <ul
              role="listbox"
              id={`${id}-country-listbox`}
              className="max-h-56 overflow-y-auto py-1 text-xs divide-y divide-slate-50"
            >
              {filteredCountries.length === 0 ? (
                <li className="px-4 py-5 text-center text-slate-400">
                  <p className="font-medium">No countries found</p>
                </li>
              ) : (
                filteredCountries.map((c) => {
                  const isSelected = c.code === selectedCountryCode;
                  return (
                    <li
                      key={c.code}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleCountrySelect(c)}
                      className={`px-3 py-2 cursor-pointer flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-orange-50 text-orange-950 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span className="text-base leading-none shrink-0" aria-hidden="true">
                          {c.flag}
                        </span>
                        <span className="truncate">{c.name}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-slate-400 text-[11px]">{c.dialCode}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-orange-600" />}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>

      {displayError ? (
        <p className="mt-1.5 text-xs text-red-600 font-medium">{displayError}</p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
}
