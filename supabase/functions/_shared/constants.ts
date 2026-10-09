/**
 * Shared domain enums and reference values.
 *
 * IMPORTANT PRIVACY RULE: none of these values may include, accept or imply a
 * government/national identifier (Aadhaar, RRN, MyNumber, PAN, etc).
 */

export const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS', 'Minority', 'Other'] as const;
export type Category = (typeof CATEGORIES)[number];

export const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'] as const;
export type Gender = (typeof GENDERS)[number];

export const DEGREES = [
  'Class 10',
  'Class 11',
  'Class 12',
  'Diploma',
  'Undergraduate',
  'Postgraduate',
  'Professional (MBBS/BTech/LLB)',
  'Doctorate',
  'Other',
] as const;
export type Degree = (typeof DEGREES)[number];

export const INCOME_BRACKETS = [
  'Below 100000',
  '100000-250000',
  '250000-500000',
  '500000-800000',
  '800000-1200000',
  'Above 1200000',
] as const;
export type IncomeBracket = (typeof INCOME_BRACKETS)[number];

/**
 * Upper bound (in INR) represented by each income bracket. Used by the matching
 * engine to compare a scholarship income ceiling against a profile bracket
 * without ever storing an exact figure.
 */
export const INCOME_BRACKET_UPPER: Record<IncomeBracket, number> = {
  'Below 100000': 100000,
  '100000-250000': 250000,
  '250000-500000': 500000,
  '500000-800000': 800000,
  '800000-1200000': 1200000,
  'Above 1200000': 5000000,
};

export const DOCUMENT_TYPES = [
  'Income Certificate',
  'Class 10 Marksheet',
  'Class 12 Marksheet',
  'Category Certificate',
  'Domicile Proof',
  'Disability Certificate',
  'Bonafide / Enrolment Certificate',
  'Bank Passbook',
  'Entrance Exam Scorecard',
  'Photograph',
  'Signature',
  'Other',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const APPLICATION_STATUSES = [
  'Not Started',
  'In Progress',
  'Submitted',
  'Verification Pending',
  'Awarded',
  'Rejected',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const SCHOLARSHIP_TYPES = [
  'Government',
  'State Government',
  'Corporate CSR',
  'Foundation',
  'Merit-Based',
  'Need-Based',
  'Minority',
] as const;
export type ScholarshipType = (typeof SCHOLARSHIP_TYPES)[number];

export const MATCH_TIERS = [
  'Highly Eligible',
  'Possibly Eligible',
  'Needs Additional Information',
] as const;
export type MatchTier = (typeof MATCH_TIERS)[number];

export const EXAM_SECTIONS = ['Quantitative', 'Verbal', 'Logical', 'General Knowledge'] as const;
export type ExamSection = (typeof EXAM_SECTIONS)[number];

export const STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Puducherry',
  'Chandigarh',
  'Andaman and Nicobar Islands',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Lakshadweep',
  'All India',
] as const;
export type StateName = (typeof STATES)[number];

export const RETENTION_GRACE_DAYS = 180;
