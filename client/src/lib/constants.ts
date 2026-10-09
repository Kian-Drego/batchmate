export * from '@shared/constants.ts';

export const CURRENT_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Any'] as const;

export const INCOME_LABELS: Record<string, string> = {
  'Below 100000': 'Below ₹1L',
  '100000-250000': '₹1L – ₹2.5L',
  '250000-500000': '₹2.5L – ₹5L',
  '500000-800000': '₹5L – ₹8L',
  '800000-1200000': '₹8L – ₹12L',
  'Above 1200000': 'Above ₹12L',
};
