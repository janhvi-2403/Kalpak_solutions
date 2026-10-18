/**
 * International Phone Number utilities and validation for Kalpak Solutions
 * Uses libphonenumber-js for authoritative E.164 parsing, validation, and country code resolution.
 */

import {
  parsePhoneNumber,
  CountryCode,
  getCountries,
  getCountryCallingCode,
} from 'libphonenumber-js';

export { isValidPhoneNumber, parsePhoneNumber, type CountryCode } from 'libphonenumber-js';

export interface CountryCallingCodeOption {
  code: CountryCode; // 2-letter ISO, e.g. "IN", "US", "GB", "JP"
  name: string; // e.g. "India", "United States", "Japan"
  dialCode: string; // e.g. "+91", "+1", "+44", "+81"
  flag: string; // e.g. "🇮🇳", "🇺🇸", "🇬🇧", "🇯🇵"
}

/**
 * Returns the flag emoji corresponding to a 2-letter ISO country code.
 */
export function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  try {
    return countryCode
      .toUpperCase()
      .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
  } catch {
    return '🌐';
  }
}

let cachedCountries: CountryCallingCodeOption[] | null = null;

/**
 * Returns dynamic list of all international countries with dial codes and flag emojis.
 */
export function getSupportedCountries(): CountryCallingCodeOption[] {
  if (cachedCountries) {
    return cachedCountries;
  }

  const rawCodes = getCountries();
  let regionNames: Intl.DisplayNames | null = null;
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function') {
      regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    }
  } catch {
    regionNames = null;
  }

  const list: CountryCallingCodeOption[] = [];

  for (const code of rawCodes) {
    try {
      const dialCode = `+${getCountryCallingCode(code)}`;
      const name = regionNames?.of(code) || code;
      const flag = getFlagEmoji(code);

      list.push({
        code,
        name,
        dialCode,
        flag,
      });
    } catch {
      // Ignore unsupported codes
    }
  }

  // Priority common business countries first
  const priorityCodes: CountryCode[] = ['IN', 'US', 'GB', 'JP', 'SG', 'AU', 'CA', 'AE', 'DE'];

  list.sort((a, b) => {
    const aPriority = priorityCodes.indexOf(a.code);
    const bPriority = priorityCodes.indexOf(b.code);
    if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
    if (aPriority !== -1) return -1;
    if (bPriority !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

  cachedCountries = list;
  return list;
}

export interface PhoneNormalizationResult {
  isValid: boolean;
  e164: string | null;
  nationalNumber: string | null;
  country: CountryCode | null;
  dialCode: string | null;
  error?: string;
}

/**
 * Parses and normalizes an input phone number into E.164 format.
 * Supports national input with a defaultCountry or full international format (+...).
 */
export function normalizePhoneNumber(
  input?: string | null,
  defaultCountry?: CountryCode
): PhoneNormalizationResult {
  if (!input || !input.trim()) {
    return {
      isValid: true,
      e164: null,
      nationalNumber: null,
      country: null,
      dialCode: null,
    };
  }

  const raw = input.trim();

  try {
    // Attempt parsing with libphonenumber-js
    const parsed = parsePhoneNumber(raw, defaultCountry);

    if (parsed && parsed.isValid()) {
      return {
        isValid: true,
        e164: parsed.format('E.164'),
        nationalNumber: parsed.nationalNumber,
        country: parsed.country || defaultCountry || null,
        dialCode: parsed.countryCallingCode ? `+${parsed.countryCallingCode}` : null,
      };
    }

    return {
      isValid: false,
      e164: null,
      nationalNumber: null,
      country: defaultCountry || null,
      dialCode: null,
      error: `Please enter a valid phone number for ${defaultCountry || 'the selected country'}.`,
    };
  } catch (err: any) {
    return {
      isValid: false,
      e164: null,
      nationalNumber: null,
      country: defaultCountry || null,
      dialCode: null,
      error: err?.message || 'Invalid international phone number format.',
    };
  }
}
