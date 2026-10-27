/** Static catalogs used by lead search: supported countries and business categories. */

export const COUNTRIES: { code: string; label: string }[] = [
  { code: 'KE', label: 'Kenya' },
  { code: 'UG', label: 'Uganda' },
  { code: 'TZ', label: 'Tanzania' },
  { code: 'RW', label: 'Rwanda' },
  { code: 'ET', label: 'Ethiopia' },
  { code: 'NG', label: 'Nigeria' },
  { code: 'GH', label: 'Ghana' },
  { code: 'ZA', label: 'South Africa' },
];

export const COUNTRY_LABEL: Record<string, string> = Object.fromEntries(COUNTRIES.map((c) => [c.code, c.label]));

export interface CategoryDef {
  id: string;
  label: string;
  /** OpenStreetMap tag filters, in Overpass QL syntax. Combined with OR. */
  osmFilters: string[];
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'retail', label: 'Retail and shops', osmFilters: ['["shop"]'] },
  { id: 'food', label: 'Restaurants and cafes', osmFilters: ['["amenity"~"^(restaurant|cafe|fast_food|bar|pub)$"]'] },
  {
    id: 'health',
    label: 'Health and clinics',
    osmFilters: ['["amenity"~"^(clinic|doctors|dentist|pharmacy|hospital|veterinary)$"]', '["healthcare"]'],
  },
  {
    id: 'hospitality',
    label: 'Hotels and lodging',
    osmFilters: ['["tourism"~"^(hotel|guest_house|hostel|motel|apartment)$"]'],
  },
  { id: 'professional', label: 'Offices and professional services', osmFilters: ['["office"]'] },
  {
    id: 'education',
    label: 'Schools and training',
    osmFilters: ['["amenity"~"^(school|college|university|kindergarten|language_school|driving_school)$"]'],
  },
  {
    id: 'beauty',
    label: 'Beauty and wellness',
    osmFilters: ['["shop"~"^(hairdresser|beauty|cosmetics)$"]', '["amenity"="spa"]'],
  },
  { id: 'trades', label: 'Trades and crafts', osmFilters: ['["craft"]'] },
  {
    id: 'automotive',
    label: 'Automotive',
    osmFilters: ['["shop"~"^(car|car_repair|car_parts|tyres|motorcycle)$"]', '["amenity"~"^(car_wash|fuel)$"]'],
  },
  {
    id: 'finance',
    label: 'Finance and insurance',
    osmFilters: ['["amenity"~"^(bank|bureau_de_change)$"]', '["office"~"^(insurance|financial)$"]'],
  },
];

export const CATEGORY_BY_ID: Record<string, CategoryDef> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
