export interface Country {
  name: string;
  iso2: string;
  dial: string;
}

/** Convert an ISO-3166 alpha-2 code to its flag emoji. */
export function isoToFlag(iso2: string): string {
  return iso2
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

// A broad list of common countries (not exhaustive but covers most users).
export const COUNTRIES: Country[] = [
  { name: 'United States', iso2: 'US', dial: '+1' },
  { name: 'United Kingdom', iso2: 'GB', dial: '+44' },
  { name: 'India', iso2: 'IN', dial: '+91' },
  { name: 'Bangladesh', iso2: 'BD', dial: '+880' },
  { name: 'Pakistan', iso2: 'PK', dial: '+92' },
  { name: 'Canada', iso2: 'CA', dial: '+1' },
  { name: 'Australia', iso2: 'AU', dial: '+61' },
  { name: 'Germany', iso2: 'DE', dial: '+49' },
  { name: 'France', iso2: 'FR', dial: '+33' },
  { name: 'Italy', iso2: 'IT', dial: '+39' },
  { name: 'Spain', iso2: 'ES', dial: '+34' },
  { name: 'Netherlands', iso2: 'NL', dial: '+31' },
  { name: 'Russia', iso2: 'RU', dial: '+7' },
  { name: 'Ukraine', iso2: 'UA', dial: '+380' },
  { name: 'Turkey', iso2: 'TR', dial: '+90' },
  { name: 'Brazil', iso2: 'BR', dial: '+55' },
  { name: 'Mexico', iso2: 'MX', dial: '+52' },
  { name: 'Argentina', iso2: 'AR', dial: '+54' },
  { name: 'Nigeria', iso2: 'NG', dial: '+234' },
  { name: 'South Africa', iso2: 'ZA', dial: '+27' },
  { name: 'Egypt', iso2: 'EG', dial: '+20' },
  { name: 'Saudi Arabia', iso2: 'SA', dial: '+966' },
  { name: 'United Arab Emirates', iso2: 'AE', dial: '+971' },
  { name: 'Indonesia', iso2: 'ID', dial: '+62' },
  { name: 'Malaysia', iso2: 'MY', dial: '+60' },
  { name: 'Singapore', iso2: 'SG', dial: '+65' },
  { name: 'Philippines', iso2: 'PH', dial: '+63' },
  { name: 'Thailand', iso2: 'TH', dial: '+66' },
  { name: 'Vietnam', iso2: 'VN', dial: '+84' },
  { name: 'China', iso2: 'CN', dial: '+86' },
  { name: 'Japan', iso2: 'JP', dial: '+81' },
  { name: 'South Korea', iso2: 'KR', dial: '+82' },
  { name: 'Nepal', iso2: 'NP', dial: '+977' },
  { name: 'Sri Lanka', iso2: 'LK', dial: '+94' },
  { name: 'Poland', iso2: 'PL', dial: '+48' },
  { name: 'Sweden', iso2: 'SE', dial: '+46' },
  { name: 'Norway', iso2: 'NO', dial: '+47' },
  { name: 'Switzerland', iso2: 'CH', dial: '+41' },
  { name: 'Ireland', iso2: 'IE', dial: '+353' },
  { name: 'Portugal', iso2: 'PT', dial: '+351' },
  { name: 'Greece', iso2: 'GR', dial: '+30' },
  { name: 'Israel', iso2: 'IL', dial: '+972' },
  { name: 'Iran', iso2: 'IR', dial: '+98' },
  { name: 'Iraq', iso2: 'IQ', dial: '+964' },
  { name: 'Kenya', iso2: 'KE', dial: '+254' },
  { name: 'Ghana', iso2: 'GH', dial: '+233' },
  { name: 'New Zealand', iso2: 'NZ', dial: '+64' },
];
