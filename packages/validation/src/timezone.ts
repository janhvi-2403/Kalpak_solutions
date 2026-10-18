/**
 * Timezone utilities and validation for Kalpak Solutions Multi-Tenant SaaS
 * Dynamically resolves valid IANA timezone identifiers and offsets.
 */

export interface TimezoneOption {
  value: string; // IANA identifier, e.g. "Asia/Kolkata"
  label: string; // Formatted label, e.g. "Asia/Kolkata (UTC+05:30) - Mumbai, New Delhi"
  offset: string; // e.g. "UTC+05:30"
  city: string; // e.g. "Kolkata"
  region: string; // e.g. "Asia"
}

// Major hub annotations for user search convenience
const TIMEZONE_HUB_ANNOTATIONS: Record<string, string> = {
  'Asia/Kolkata': 'India, Mumbai, New Delhi, Bengaluru',
  'Asia/Calcutta': 'India, Mumbai, New Delhi, Kolkata',
  'Asia/Tokyo': 'Japan, Tokyo, Osaka',
  'Europe/London': 'United Kingdom, London, Edinburgh',
  'America/New_York': 'United States, Eastern Time, NYC, Florida',
  'America/Chicago': 'United States, Central Time, Dallas, Chicago',
  'America/Denver': 'United States, Mountain Time, Denver, Salt Lake',
  'America/Los_Angeles': 'United States, Pacific Time, California, Seattle',
  'America/Toronto': 'Canada, Toronto, Ontario',
  'America/Vancouver': 'Canada, Vancouver, British Columbia',
  'Asia/Dubai': 'United Arab Emirates, Dubai, Abu Dhabi',
  'Asia/Singapore': 'Singapore',
  'Australia/Sydney': 'Australia, Sydney, Melbourne, NSW',
  'Australia/Perth': 'Australia, Perth, Western Australia',
  'Europe/Berlin': 'Germany, Berlin, Frankfurt',
  'Europe/Paris': 'France, Paris',
  'Asia/Hong_Kong': 'Hong Kong',
  'Asia/Shanghai': 'China, Beijing, Shanghai',
  'Asia/Seoul': 'South Korea, Seoul',
  'Asia/Riyadh': 'Saudi Arabia, Riyadh',
  'Africa/Johannesburg': 'South Africa, Johannesburg, Cape Town',
  'America/Sao_Paulo': 'Brazil, Sao Paulo, Rio de Janeiro',
  'UTC': 'Coordinated Universal Time',
};

/**
 * Validates whether a candidate string is a valid IANA timezone identifier.
 */
export function isValidIanaTimezone(tz?: string | null): boolean {
  if (!tz || typeof tz !== 'string') return false;
  const cleanTz = tz.trim();
  if (cleanTz.length < 2 || cleanTz.length > 50) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: cleanTz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Calculates current UTC offset string for a given timezone identifier (e.g. "UTC+05:30", "UTC-04:00").
 */
export function getTimezoneOffsetString(timeZone: string, date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset',
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    if (tzPart && tzPart.value) {
      return tzPart.value.replace('GMT', 'UTC');
    }
  } catch {
    // Fallback if longOffset unsupported
  }

  try {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone }));
    const diffMinutes = Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);
    const sign = diffMinutes >= 0 ? '+' : '-';
    const absMinutes = Math.abs(diffMinutes);
    const hours = String(Math.floor(absMinutes / 60)).padStart(2, '0');
    const mins = String(absMinutes % 60).padStart(2, '0');
    return `UTC${sign}${hours}:${mins}`;
  } catch {
    return 'UTC';
  }
}

let cachedTimezones: TimezoneOption[] | null = null;

/**
 * Dynamically retrieves all supported IANA timezones supported by the runtime engine (400+),
 * populated with readable labels and current UTC offsets.
 */
export function getSupportedTimezones(): TimezoneOption[] {
  if (cachedTimezones) {
    return cachedTimezones;
  }

  let rawList: string[] = [];
  if (typeof Intl !== 'undefined' && typeof (Intl as any).supportedValuesOf === 'function') {
    try {
      rawList = (Intl as any).supportedValuesOf('timeZone');
    } catch {
      rawList = [];
    }
  }

  // Ensure UTC and major aliases are always present
  if (!rawList.includes('Asia/Kolkata')) rawList.push('Asia/Kolkata');
  if (!rawList.includes('UTC')) rawList.push('UTC');
  if (!rawList.includes('America/New_York')) rawList.push('America/New_York');
  if (!rawList.includes('Europe/London')) rawList.push('Europe/London');
  if (!rawList.includes('Asia/Tokyo')) rawList.push('Asia/Tokyo');
  if (!rawList.includes('Asia/Singapore')) rawList.push('Asia/Singapore');

  const now = new Date();
  const list: TimezoneOption[] = [];

  for (const tz of rawList) {
    try {
      // Validate that Intl can format with this timezone
      const offset = getTimezoneOffsetString(tz, now);
      const parts = tz.split('/');
      const region = parts[0] || 'Global';
      const city = (parts[parts.length - 1] || tz).replace(/_/g, ' ');
      const annotation = TIMEZONE_HUB_ANNOTATIONS[tz];

      const label = annotation
        ? `${tz} (${offset}) - ${annotation}`
        : `${tz} (${offset})`;

      list.push({
        value: tz,
        label,
        offset,
        city,
        region,
      });
    } catch {
      // Skip invalid timezone identifiers
    }
  }

  // Sort: Priority common business hubs first, then alphabetically
  const priorityTimezones = [
    'Asia/Kolkata',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Asia/Tokyo',
    'Asia/Singapore',
    'Asia/Dubai',
    'UTC',
  ];

  list.sort((a, b) => {
    const aPriority = priorityTimezones.indexOf(a.value);
    const bPriority = priorityTimezones.indexOf(b.value);
    if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
    if (aPriority !== -1) return -1;
    if (bPriority !== -1) return 1;
    return a.value.localeCompare(b.value);
  });

  cachedTimezones = list;
  return list;
}
