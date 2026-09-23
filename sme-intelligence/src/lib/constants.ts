export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT (Abuja)', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
  'Taraba', 'Yobe', 'Zamfara'
];

export const BUSINESS_TYPES: { value: string; label: string }[] = [
  { value: 'supermarket', label: 'Supermarket' },
  { value: 'retail', label: 'Retail Shop' },
  { value: 'wholesale', label: 'Wholesale / Distribution' },
  { value: 'restaurant', label: 'Restaurant / Food Service' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'manufacturing', label: 'Small Manufacturing' },
  { value: 'services', label: 'Services' },
  { value: 'other', label: 'Other' }
];

export const BUSINESS_SIZES: { value: string; label: string }[] = [
  { value: 'micro', label: 'Micro (1–9 employees)' },
  { value: 'small', label: 'Small (10–49 employees)' },
  { value: 'medium', label: 'Medium (50–199 employees)' }
];

export const CURRENCIES = [
  { code: 'NGN', label: 'NGN — Nigerian Naira (₦)' },
  { code: 'USD', label: 'USD — US Dollar ($)' },
  { code: 'GBP', label: 'GBP — British Pound (£)' },
  { code: 'GHS', label: 'GHS — Ghanaian Cedi (₵)' }
];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦', USD: '$', GBP: '£', GHS: '₵'
};
