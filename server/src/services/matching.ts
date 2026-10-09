import { Types } from 'mongoose';
import {
  INCOME_BRACKET_UPPER,
  IncomeBracket,
  MATCH_TIERS,
  MatchTier,
} from '../domain/constants';
import type { IScholarship } from '../models/Scholarship';
import type { IScholarshipPassport } from '../models/ScholarshipPassport';

/** A single transparent, human-readable reason behind a match decision. */
export interface MatchReason {
  kind: 'pass' | 'warn' | 'fail';
  label: string;
  detail?: string;
}

export interface MatchResult {
  scholarship: Types.ObjectId;
  tier: MatchTier;
  fitScore: number;
  hardMatch: boolean;
  excluded: boolean;
  missingFields: string[];
  reasons: MatchReason[];
}

/**
 * Convert a CGPA (10-point scale) to an approximate percentage so the same
 * threshold logic can compare against a scholarship marks requirement.
 */
export function profilePercentage(passport: IScholarshipPassport): number | null {
  const { class12Percentage, cgpa } = passport.academic ?? {};
  if (typeof class12Percentage === 'number') return class12Percentage;
  if (typeof cgpa === 'number') return Math.round(cgpa * 9.5 * 10) / 10;
  return null;
}

function money(value?: number | null): string {
  if (value === undefined || value === null) return '—';
  return `₹${value.toLocaleString('en-IN')}`;
}

/** Weighted score components. Total budget is 100 points. */
const WEIGHTS = { income: 35, academic: 35, documents: 30 };

function incomeComponent(scholarship: IScholarship, passport: IScholarshipPassport): number {
  const limit = scholarship.incomeLimit;
  if (!limit || limit <= 0) return WEIGHTS.income;
  const bracket = passport.demographic?.incomeBracket as IncomeBracket | undefined;
  if (!bracket) return 0;
  const upper = INCOME_BRACKET_UPPER[bracket];
  if (upper > limit) return 0;
  // Reward clearly lower-income profiles while still giving partial credit near
  // the ceiling. Maps the eligible range onto 50%..100% of the component.
  const ratio = upper / limit; // 0..1
  const factor = Math.min(1, Math.max(0.5, 1 - ratio * 0.5));
  return WEIGHTS.income * factor;
}

function academicComponent(scholarship: IScholarship, passport: IScholarshipPassport): number {
  const pct = profilePercentage(passport);
  if (pct === null) return 0;
  const min = scholarship.marksMin;
  if (min && min > 0) {
    if (pct < min) return 0;
    const headroom = Math.max(1, 100 - min);
    const surplus = Math.min(1, (pct - min) / headroom);
    return WEIGHTS.academic * (0.6 + 0.4 * surplus);
  }
  return WEIGHTS.academic * Math.min(1, pct / 100);
}

function documentComponent(scholarship: IScholarship, passport: IScholarshipPassport): number {
  const required = scholarship.requiredDocuments ?? [];
  if (required.length === 0) return WEIGHTS.documents;
  const owned = new Set((passport.documents ?? []).map((d) => d.type));
  const have = required.filter((r) => owned.has(r)).length;
  return WEIGHTS.documents * (have / required.length);
}

/**
 * Two-tier hybrid matching: hard boolean eligibility filters followed by a
 * weighted 0-100 fit score. Missing data never silently passes a hard filter —
 * it is surfaced as "Needs Additional Information".
 */
export function evaluateScholarship(
  scholarship: IScholarship,
  passport: IScholarshipPassport
): MatchResult {
  const reasons: MatchReason[] = [];
  const missingFields: string[] = [];
  let hardMatch = true;

  const { academic = {}, demographic = {} } = passport;

  // --- Degree -------------------------------------------------------------
  const degrees = scholarship.degree ?? [];
  if (degrees.length) {
    if (!academic.degree) {
      missingFields.push('Degree');
    } else if (degrees.includes(academic.degree as never)) {
      reasons.push({ kind: 'pass', label: `${academic.degree} student verified` });
    } else {
      hardMatch = false;
      reasons.push({
        kind: 'fail',
        label: `Open to ${degrees.join(', ')}`,
        detail: `Your degree is ${academic.degree}`,
      });
    }
  }

  // --- Domicile / State ---------------------------------------------------
  const states = scholarship.stateDomicile ?? [];
  if (states.length && !states.includes('All India')) {
    if (!demographic.state) {
      missingFields.push('State / Domicile');
    } else if (states.includes(demographic.state as never)) {
      reasons.push({ kind: 'pass', label: `${demographic.state} domicile satisfied` });
    } else {
      hardMatch = false;
      reasons.push({
        kind: 'fail',
        label: `Restricted to ${states.join(', ')}`,
        detail: `Your domicile is ${demographic.state}`,
      });
    }
  } else if (states.includes('All India')) {
    reasons.push({ kind: 'pass', label: 'Open to all states' });
  }

  // --- Category -----------------------------------------------------------
  const categories = scholarship.category ?? [];
  if (categories.length) {
    if (!demographic.category) {
      missingFields.push('Category');
    } else if (categories.includes(demographic.category as never)) {
      reasons.push({ kind: 'pass', label: `Category (${demographic.category}) eligible` });
    } else {
      hardMatch = false;
      reasons.push({
        kind: 'fail',
        label: `Reserved for ${categories.join(', ')}`,
        detail: `Your category is ${demographic.category}`,
      });
    }
  }

  // --- Gender -------------------------------------------------------------
  const genders = scholarship.gender ?? [];
  if (genders.length) {
    if (!demographic.gender) {
      missingFields.push('Gender');
    } else if (
      genders.includes(demographic.gender as never) ||
      demographic.gender === 'Prefer not to say'
    ) {
      reasons.push({ kind: 'pass', label: `Gender criterion satisfied` });
    } else {
      hardMatch = false;
      reasons.push({
        kind: 'fail',
        label: `Open to ${genders.join(', ')} applicants`,
        detail: `Your gender is ${demographic.gender}`,
      });
    }
  }

  // --- Income ceiling -----------------------------------------------------
  if (scholarship.incomeLimit && scholarship.incomeLimit > 0) {
    if (!demographic.incomeBracket) {
      missingFields.push('Family income bracket');
    } else {
      const upper = INCOME_BRACKET_UPPER[demographic.incomeBracket as IncomeBracket];
      if (upper <= scholarship.incomeLimit) {
        reasons.push({
          kind: 'pass',
          label: `Family income below ${money(scholarship.incomeLimit)}`,
          detail: `Declared bracket: ${demographic.incomeBracket}`,
        });
      } else {
        hardMatch = false;
        reasons.push({
          kind: 'fail',
          label: `Income limit ${money(scholarship.incomeLimit)}`,
          detail: `Declared bracket: ${demographic.incomeBracket}`,
        });
      }
    }
  }

  // --- Minimum marks ------------------------------------------------------
  if (scholarship.marksMin && scholarship.marksMin > 0) {
    const pct = profilePercentage(passport);
    if (pct === null) {
      missingFields.push('Academic score (Class 12 % or CGPA)');
    } else if (pct + 0.001 >= scholarship.marksMin) {
      reasons.push({
        kind: 'pass',
        label: `Academic score meets ${scholarship.marksMin}% minimum`,
        detail: `Your score: ${pct}%`,
      });
    } else {
      hardMatch = false;
      reasons.push({
        kind: 'fail',
        label: `Requires minimum ${scholarship.marksMin}%`,
        detail: `Your score: ${pct}%`,
      });
    }
  }

  // --- Current year -------------------------------------------------------
  const years = scholarship.currentYearAllowed ?? [];
  if (years.length && !years.includes('Any')) {
    if (!academic.currentYear) {
      missingFields.push('Current year of study');
    } else if (!years.includes(academic.currentYear)) {
      hardMatch = false;
      reasons.push({
        kind: 'fail',
        label: `Open to year(s): ${years.join(', ')}`,
        detail: `You are in ${academic.currentYear}`,
      });
    } else {
      reasons.push({ kind: 'pass', label: `${academic.currentYear} eligibility confirmed` });
    }
  }

  // --- Document readiness (soft signal) -----------------------------------
  const required = scholarship.requiredDocuments ?? [];
  if (required.length) {
    const owned = new Set((passport.documents ?? []).map((d) => d.type));
    const missingDocs = required.filter((r) => !owned.has(r));
    if (missingDocs.length === 0) {
      reasons.push({ kind: 'pass', label: 'All required documents uploaded' });
    } else {
      reasons.push({
        kind: 'warn',
        label: `${missingDocs.join(', ')} upload required`,
      });
    }
  }

  let fitScore = Math.round(
    incomeComponent(scholarship, passport) +
      academicComponent(scholarship, passport) +
      documentComponent(scholarship, passport)
  );
  fitScore = Math.max(0, Math.min(100, fitScore));

  let tier: MatchTier;
  if (!hardMatch) {
    tier = MATCH_TIERS[1]; // excluded downstream; tier value unused
  } else if (missingFields.length > 0) {
    tier = 'Needs Additional Information';
  } else if (fitScore >= 80) {
    tier = 'Highly Eligible';
  } else {
    tier = 'Possibly Eligible';
  }

  return {
    scholarship: scholarship._id as Types.ObjectId,
    tier,
    fitScore,
    hardMatch,
    excluded: !hardMatch,
    missingFields,
    reasons,
  };
}

/** Score every active scholarship and return only the non-excluded matches. */
export function matchAll(
  scholarships: IScholarship[],
  passport: IScholarshipPassport
): MatchResult[] {
  return scholarships
    .map((s) => evaluateScholarship(s, passport))
    .filter((r) => !r.excluded)
    .sort((a, b) => b.fitScore - a.fitScore);
}

/**
 * Profile completeness drives the "Needs Additional Information" experience.
 * Only the fields the matching engine relies upon are counted.
 */
const REQUIRED_FIELDS: { key: string; label: string; get: (p: IScholarshipPassport) => unknown }[] =
  [
    { key: 'degree', label: 'Degree', get: (p) => p.academic?.degree },
    { key: 'state', label: 'State / Domicile', get: (p) => p.demographic?.state },
    { key: 'category', label: 'Category', get: (p) => p.demographic?.category },
    { key: 'income', label: 'Family income bracket', get: (p) => p.demographic?.incomeBracket },
    { key: 'gender', label: 'Gender', get: (p) => p.demographic?.gender },
    {
      key: 'score',
      label: 'Academic score',
      get: (p) => p.academic?.class12Percentage ?? p.academic?.cgpa,
    },
    { key: 'year', label: 'Current year of study', get: (p) => p.academic?.currentYear },
  ];

export function completeness(passport: IScholarshipPassport): {
  percent: number;
  missing: string[];
} {
  const missing = REQUIRED_FIELDS.filter((f) => {
    const v = f.get(passport);
    return v === undefined || v === null || v === '';
  }).map((f) => f.label);
  const percent = Math.round(((REQUIRED_FIELDS.length - missing.length) / REQUIRED_FIELDS.length) * 100);
  return { percent, missing };
}
