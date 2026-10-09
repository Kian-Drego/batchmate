/**
 * Two-tier hybrid matching engine (pure; runs in the browser and in Edge
 * Functions).
 *
 * 1. Hard boolean filters: degree, domicile, category, gender, income ceiling,
 *    minimum marks, current year. Missing data never silently passes — it is
 *    surfaced as "Needs Additional Information".
 * 2. Weighted 0–100 fit score: income 35, academics 35, documents 30.
 */
import { INCOME_BRACKET_UPPER, MatchTier } from './constants.ts';
import type {
  MatchReason,
  MatchResult,
  PassportDocumentRow,
  PassportRow,
  ScholarshipRow,
} from './types.ts';

type Passport = Pick<
  PassportRow,
  | 'degree'
  | 'current_year'
  | 'class12_percentage'
  | 'cgpa'
  | 'state'
  | 'category'
  | 'income_bracket'
  | 'gender'
>;

type Scholarship = Pick<
  ScholarshipRow,
  | 'id'
  | 'degree'
  | 'state_domicile'
  | 'category'
  | 'gender'
  | 'income_limit'
  | 'marks_min'
  | 'current_year_allowed'
  | 'required_documents'
>;

type Documents = Pick<PassportDocumentRow, 'type'>[];

/** Class 12 % if present, else CGPA (10-pt) converted to an approximate %. */
export function profilePercentage(p: Pick<Passport, 'class12_percentage' | 'cgpa'>): number | null {
  if (p.class12_percentage != null) return Number(p.class12_percentage);
  if (p.cgpa != null) return Math.round(Number(p.cgpa) * 9.5 * 10) / 10;
  return null;
}

function money(value?: number | null): string {
  if (value == null) return '—';
  return `₹${Number(value).toLocaleString('en-IN')}`;
}

const WEIGHTS = { income: 35, academic: 35, documents: 30 };

function incomeComponent(s: Scholarship, p: Passport): number {
  const limit = s.income_limit;
  if (!limit || limit <= 0) return WEIGHTS.income;
  if (!p.income_bracket) return 0;
  const upper = INCOME_BRACKET_UPPER[p.income_bracket];
  if (upper > limit) return 0;
  // Reward clearly lower-income profiles; map eligible range onto 50–100%.
  const factor = Math.min(1, Math.max(0.5, 1 - (upper / limit) * 0.5));
  return WEIGHTS.income * factor;
}

function academicComponent(s: Scholarship, p: Passport): number {
  const pct = profilePercentage(p);
  if (pct === null) return 0;
  const min = s.marks_min;
  if (min && min > 0) {
    if (pct < min) return 0;
    const headroom = Math.max(1, 100 - min);
    const surplus = Math.min(1, (pct - min) / headroom);
    return WEIGHTS.academic * (0.6 + 0.4 * surplus);
  }
  return WEIGHTS.academic * Math.min(1, pct / 100);
}

function documentComponent(s: Scholarship, owned: Set<string>): number {
  const required = s.required_documents ?? [];
  if (required.length === 0) return WEIGHTS.documents;
  const have = required.filter((r) => owned.has(r)).length;
  return WEIGHTS.documents * (have / required.length);
}

export function evaluateScholarship(s: Scholarship, p: Passport, docs: Documents): MatchResult {
  const reasons: MatchReason[] = [];
  const missingFields: string[] = [];
  let hardMatch = true;
  const owned = new Set<string>(docs.map((d) => d.type));

  // Degree
  const degrees = s.degree ?? [];
  if (degrees.length) {
    if (!p.degree) missingFields.push('Degree');
    else if (degrees.includes(p.degree)) reasons.push({ kind: 'pass', label: `${p.degree} student verified` });
    else {
      hardMatch = false;
      reasons.push({ kind: 'fail', label: `Open to ${degrees.join(', ')}`, detail: `Your degree is ${p.degree}` });
    }
  }

  // Domicile
  const states = s.state_domicile ?? [];
  if (states.length && !states.includes('All India')) {
    if (!p.state) missingFields.push('State / Domicile');
    else if (states.includes(p.state)) reasons.push({ kind: 'pass', label: `${p.state} domicile satisfied` });
    else {
      hardMatch = false;
      reasons.push({ kind: 'fail', label: `Restricted to ${states.join(', ')}`, detail: `Your domicile is ${p.state}` });
    }
  } else if (states.includes('All India')) {
    reasons.push({ kind: 'pass', label: 'Open to all states' });
  }

  // Category
  const categories = s.category ?? [];
  if (categories.length) {
    if (!p.category) missingFields.push('Category');
    else if (categories.includes(p.category)) reasons.push({ kind: 'pass', label: `Category (${p.category}) eligible` });
    else {
      hardMatch = false;
      reasons.push({ kind: 'fail', label: `Reserved for ${categories.join(', ')}`, detail: `Your category is ${p.category}` });
    }
  }

  // Gender
  const genders = s.gender ?? [];
  if (genders.length) {
    if (!p.gender) missingFields.push('Gender');
    else if (genders.includes(p.gender) || p.gender === 'Prefer not to say')
      reasons.push({ kind: 'pass', label: 'Gender criterion satisfied' });
    else {
      hardMatch = false;
      reasons.push({ kind: 'fail', label: `Open to ${genders.join(', ')} applicants`, detail: `Your gender is ${p.gender}` });
    }
  }

  // Income ceiling
  if (s.income_limit && s.income_limit > 0) {
    if (!p.income_bracket) missingFields.push('Family income bracket');
    else if (INCOME_BRACKET_UPPER[p.income_bracket] <= s.income_limit) {
      reasons.push({
        kind: 'pass',
        label: `Family income below ${money(s.income_limit)}`,
        detail: `Declared bracket: ${p.income_bracket}`,
      });
    } else {
      hardMatch = false;
      reasons.push({ kind: 'fail', label: `Income limit ${money(s.income_limit)}`, detail: `Declared bracket: ${p.income_bracket}` });
    }
  }

  // Minimum marks
  if (s.marks_min && s.marks_min > 0) {
    const pct = profilePercentage(p);
    if (pct === null) missingFields.push('Academic score (Class 12 % or CGPA)');
    else if (pct + 0.001 >= s.marks_min)
      reasons.push({ kind: 'pass', label: `Academic score meets ${s.marks_min}% minimum`, detail: `Your score: ${pct}%` });
    else {
      hardMatch = false;
      reasons.push({ kind: 'fail', label: `Requires minimum ${s.marks_min}%`, detail: `Your score: ${pct}%` });
    }
  }

  // Current year
  const years = s.current_year_allowed ?? [];
  if (years.length && !years.includes('Any')) {
    if (!p.current_year) missingFields.push('Current year of study');
    else if (!years.includes(p.current_year)) {
      hardMatch = false;
      reasons.push({ kind: 'fail', label: `Open to year(s): ${years.join(', ')}`, detail: `You are in ${p.current_year}` });
    } else reasons.push({ kind: 'pass', label: `${p.current_year} eligibility confirmed` });
  }

  // Document readiness (soft signal)
  const required = s.required_documents ?? [];
  if (required.length) {
    const missingDocs = required.filter((r) => !owned.has(r));
    if (missingDocs.length === 0) reasons.push({ kind: 'pass', label: 'All required documents uploaded' });
    else reasons.push({ kind: 'warn', label: `${missingDocs.join(', ')} upload required` });
  }

  const fitScore = Math.max(
    0,
    Math.min(100, Math.round(incomeComponent(s, p) + academicComponent(s, p) + documentComponent(s, owned)))
  );

  let tier: MatchTier;
  if (!hardMatch || fitScore < 80) tier = 'Possibly Eligible';
  else tier = 'Highly Eligible';
  if (hardMatch && missingFields.length > 0) tier = 'Needs Additional Information';

  return { scholarshipId: s.id, tier, fitScore, hardMatch, missingFields, reasons };
}

/** Score every scholarship and return only non-excluded matches, best first. */
export function matchAll<S extends Scholarship>(
  scholarships: S[],
  passport: Passport,
  docs: Documents
): (MatchResult & { scholarship: S })[] {
  return scholarships
    .map((s) => ({ ...evaluateScholarship(s, passport, docs), scholarship: s }))
    .filter((r) => r.hardMatch)
    .sort((a, b) => b.fitScore - a.fitScore);
}

const REQUIRED_FIELDS: { label: string; get: (p: Passport) => unknown }[] = [
  { label: 'Degree', get: (p) => p.degree },
  { label: 'State / Domicile', get: (p) => p.state },
  { label: 'Category', get: (p) => p.category },
  { label: 'Family income bracket', get: (p) => p.income_bracket },
  { label: 'Gender', get: (p) => p.gender },
  { label: 'Academic score', get: (p) => p.class12_percentage ?? p.cgpa },
  { label: 'Current year of study', get: (p) => p.current_year },
];

/** Profile completeness (mirrors the `passport_derive` trigger). */
export function completeness(p: Passport): { percent: number; missing: string[] } {
  const missing = REQUIRED_FIELDS.filter((f) => {
    const v = f.get(p);
    return v === undefined || v === null || v === '';
  }).map((f) => f.label);
  return {
    percent: Math.round(((REQUIRED_FIELDS.length - missing.length) / REQUIRED_FIELDS.length) * 100),
    missing,
  };
}
