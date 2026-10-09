export * from '@shared/constants.ts';

/** Full year list including the catalogue wildcard 'Any' (admin catalogue editor). */
export const CURRENT_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Any'] as const;

/** Concrete study years offered in the passport form (no wildcard). */
export const STUDY_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'] as const;

/**
 * Passport year options adapt to the selected level. Keys mirror DEGREES; a
 * level with no entry (or none selected yet) falls back to every year.
 */
export const DEGREE_YEARS: Record<string, readonly string[]> = {
  Undergraduate: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
  Postgraduate: ['1st Year', '2nd Year'],
  'Professional (MBBS/BTech/LLB)': ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'],
  Doctorate: ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'],
  Other: STUDY_YEARS,
};

export const INCOME_LABELS: Record<string, string> = {
  'Below 100000': 'Below ₹1L',
  '100000-250000': '₹1L – ₹2.5L',
  '250000-500000': '₹2.5L – ₹5L',
  '500000-800000': '₹5L – ₹8L',
  '800000-1200000': '₹8L – ₹12L',
  'Above 1200000': 'Above ₹12L',
};
