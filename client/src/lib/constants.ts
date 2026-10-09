export const CATEGORIES = [
  'General',
  'OBC',
  'SC',
  'ST',
  'EWS',
  'Minority',
  'Other',
] as const;

export const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'] as const;

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

export const INCOME_BRACKETS = [
  'Below 100000',
  '100000-250000',
  '250000-500000',
  '500000-800000',
  '800000-1200000',
  'Above 1200000',
] as const;

export const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh', 'Andaman and Nicobar Islands',
  'Dadra and Nagar Haveli and Daman and Diu', 'Lakshadweep', 'All India',
] as const;

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

export const APPLICATION_STATUSES = [
  'Not Started',
  'In Progress',
  'Submitted',
  'Verification Pending',
  'Awarded',
  'Rejected',
] as const;

export const CURRENT_YEARS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  '5th Year',
  'Any',
] as const;

export const EXAM_SECTIONS = ['Quantitative', 'Verbal', 'Logical', 'General Knowledge'] as const;

export type Category = (typeof CATEGORIES)[number];
export type Gender = (typeof GENDERS)[number];
export type Degree = (typeof DEGREES)[number];
export type IncomeBracket = (typeof INCOME_BRACKETS)[number];
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export type MatchTier = 'Highly Eligible' | 'Possibly Eligible' | 'Needs Additional Information';
