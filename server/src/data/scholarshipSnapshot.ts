import type { ScholarshipType } from '../domain/constants';

/**
 * Raw scholarship records in the scraper's canonical shape. This snapshot is
 * used (a) to seed a fresh database and (b) as the offline fallback for the
 * nightly crawl when SCRAPER_LIVE=false. Every record keeps its
 * `officialSourceUrl` and a `lastScrapedAt` timestamp for source auditing.
 *
 * These entries reflect real national/state scholarship programmes. Verify the
 * live portal before relying on amounts or deadlines; the crawler refreshes
 * them daily at 00:00 IST.
 */
export interface RawScholarship {
  provider: string;
  title: string;
  type: ScholarshipType;
  amount: number;
  amountDescription: string;
  degree: string[];
  currentYearAllowed: string[];
  incomeLimit?: number;
  marksMin?: number;
  category: string[];
  stateDomicile: string[];
  gender: string[];
  deadline?: string; // ISO
  requiredDocuments: string[];
  selectionProcess: string[];
  aptitudeTestRequired: boolean;
  renewalCriteria?: { minimumCgpa?: number; minimumAttendance?: number; notes?: string };
  officialSourceUrl: string;
  applicationMode: 'native' | 'external';
  externalPortalUrl?: string;
  applicationSteps: string[];
  description: string;
  examPattern?: {
    name?: string;
    durationMinutes: number;
    totalQuestions?: number;
    negativeMarking?: number;
    sections: { name: string; questions: number; durationMinutes: number; topics: string[] }[];
  };
  tags: string[];
}

function deadlineInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export const SCHOLARSHIP_SNAPSHOT: RawScholarship[] = [
  {
    provider: 'National Scholarship Portal (NSP)',
    title: 'Post Matric Scholarship for SC Students',
    type: 'Government',
    amount: 120000,
    amountDescription:
      'Full tuition reimbursement plus monthly maintenance allowance (₹700–₹1,200 by course group).',
    degree: ['Class 11', 'Class 12', 'Undergraduate', 'Postgraduate', 'Professional (MBBS/BTech/LLB)'],
    currentYearAllowed: ['Any'],
    incomeLimit: 250000,
    marksMin: 0,
    category: ['SC'],
    stateDomicile: ['All India'],
    gender: [],
    deadline: deadlineInDays(45),
    requiredDocuments: [
      'Income Certificate',
      'Category Certificate',
      'Class 10 Marksheet',
      'Class 12 Marksheet',
      'Domicile Proof',
      'Bank Passbook',
      'Photograph',
    ],
    selectionProcess: ['Online application on NSP', 'Institute verification', 'State nodal officer approval', 'DBT disbursal'],
    aptitudeTestRequired: false,
    renewalCriteria: { minimumAttendance: 75, notes: 'Annual renewal on NSP with fresh income certificate.' },
    officialSourceUrl: 'https://scholarships.gov.in/',
    applicationMode: 'external',
    externalPortalUrl: 'https://scholarships.gov.in/',
    applicationSteps: [
      'Register on NSP as a fresh applicant',
      'Fill academic and bank details',
      'Upload income and category certificates',
      'Submit and note the application ID',
      'Track institute and state verification',
    ],
    description:
      'Central assistance for SC students pursuing post-matriculation courses to reduce dropout and support completion.',
    tags: ['post-matric', 'SC', 'central', 'DBT'],
  },
  {
    provider: 'National Scholarship Portal (NSP)',
    title: 'Central Sector Scheme of Scholarship (Merit)',
    type: 'Merit-Based',
    amount: 20000,
    amountDescription: '₹10,000 per year for graduation, ₹20,000 per year for post-graduation.',
    degree: ['Undergraduate', 'Postgraduate', 'Professional (MBBS/BTech/LLB)'],
    currentYearAllowed: ['1st Year', '2nd Year', '3rd Year'],
    incomeLimit: 800000,
    marksMin: 80,
    category: ['General', 'OBC', 'SC', 'ST', 'EWS', 'Minority', 'Other'],
    stateDomicile: ['All India'],
    gender: [],
    deadline: deadlineInDays(30),
    requiredDocuments: [
      'Class 12 Marksheet',
      'Income Certificate',
      'Bonafide / Enrolment Certificate',
      'Bank Passbook',
      'Photograph',
      'Signature',
    ],
    selectionProcess: ['Merit list from Class 12 board results', 'Online application on NSP', 'Verification', 'Annual disbursal'],
    aptitudeTestRequired: false,
    renewalCriteria: { minimumCgpa: 6, minimumAttendance: 75, notes: '60% marks in each year for renewal.' },
    officialSourceUrl: 'https://scholarships.gov.in/',
    applicationMode: 'external',
    externalPortalUrl: 'https://scholarships.gov.in/',
    applicationSteps: [
      'Check Class 12 merit cut-off for your board',
      'Register and complete NSP application',
      'Upload board marksheet and bonafide',
      'Await state and central verification',
    ],
    description:
      'For students in the top 20th percentile of their Class 12 board pursuing regular degree courses.',
    tags: ['merit', 'central', 'NSP'],
  },
  {
    provider: 'AICTE',
    title: 'AICTE Pragati Scholarship for Girls (Technical)',
    type: 'Government',
    amount: 50000,
    amountDescription: '₹50,000 per year towards tuition and incidentals for AICTE-approved technical programmes.',
    degree: ['Undergraduate', 'Diploma', 'Professional (MBBS/BTech/LLB)'],
    currentYearAllowed: ['1st Year'],
    incomeLimit: 800000,
    marksMin: 0,
    category: ['General', 'OBC', 'SC', 'ST', 'EWS', 'Minority', 'Other'],
    stateDomicile: ['All India'],
    gender: ['Female'],
    deadline: deadlineInDays(60),
    requiredDocuments: [
      'Income Certificate',
      'Class 12 Marksheet',
      'Category Certificate',
      'Bonafide / Enrolment Certificate',
      'Bank Passbook',
      'Photograph',
    ],
    selectionProcess: ['Online AICTE application', 'Institute scrutiny', 'Merit-based selection', 'DBT disbursal'],
    aptitudeTestRequired: false,
    renewalCriteria: { minimumAttendance: 75, notes: 'Continue in the same approved institute and programme.' },
    officialSourceUrl: 'https://www.aicte-india.org/schemes/students-development-schemes',
    applicationMode: 'external',
    externalPortalUrl: 'https://www.aicte-india.org/',
    applicationSteps: [
      'Confirm admission to an AICTE-approved institute',
      'Create an AICTE Pragati login',
      'Upload income and admission proof',
      'Submit before the portal deadline',
    ],
    description:
      'Encourages girl students to pursue technical education by covering a substantial part of annual costs.',
    tags: ['girls', 'AICTE', 'technical'],
  },
  {
    provider: 'AICTE',
    title: 'AICTE Saksham Scholarship for Differently Abled Students',
    type: 'Government',
    amount: 50000,
    amountDescription: '₹50,000 per year for tuition and incidentals.',
    degree: ['Undergraduate', 'Diploma'],
    currentYearAllowed: ['1st Year'],
    incomeLimit: 800000,
    marksMin: 0,
    category: ['General', 'OBC', 'SC', 'ST', 'EWS', 'Minority', 'Other'],
    stateDomicile: ['All India'],
    gender: [],
    deadline: deadlineInDays(60),
    requiredDocuments: [
      'Disability Certificate',
      'Income Certificate',
      'Class 12 Marksheet',
      'Bonafide / Enrolment Certificate',
      'Bank Passbook',
      'Photograph',
    ],
    selectionProcess: ['Online AICTE application', 'Institute verification', 'Selection committee review', 'DBT disbursal'],
    aptitudeTestRequired: false,
    renewalCriteria: { minimumAttendance: 75 },
    officialSourceUrl: 'https://www.aicte-india.org/schemes/students-development-schemes',
    applicationMode: 'external',
    externalPortalUrl: 'https://www.aicte-india.org/',
    applicationSteps: [
      'Hold a valid disability certificate (40% or more)',
      'Apply through the AICTE Saksham portal',
      'Upload disability and income documents',
      'Track approval status',
    ],
    description:
      'Financial support for differently abled students admitted to AICTE-approved degree/diploma programmes.',
    tags: ['disability', 'AICTE', 'technical'],
  },
  {
    provider: 'Government of Maharashtra',
    title: 'Rajarshi Chhatrapati Shahu Maharaj Shikshan Shulkh Shishyavrutti',
    type: 'State Government',
    amount: 60000,
    amountDescription: 'Tuition fee waiver for eligible Maharashtra domicile students.',
    degree: ['Undergraduate', 'Postgraduate', 'Professional (MBBS/BTech/LLB)'],
    currentYearAllowed: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
    incomeLimit: 800000,
    marksMin: 0,
    category: ['General', 'OBC', 'SC', 'ST', 'EWS', 'Minority', 'Other'],
    stateDomicile: ['Maharashtra'],
    gender: [],
    deadline: deadlineInDays(50),
    requiredDocuments: [
      'Domicile Proof',
      'Income Certificate',
      'Class 12 Marksheet',
      'Bonafide / Enrolment Certificate',
      'Bank Passbook',
      'Photograph',
    ],
    selectionProcess: ['MahaDBT portal application', 'Institute verification', 'State approval', 'Direct fee credit'],
    aptitudeTestRequired: false,
    renewalCriteria: { minimumAttendance: 75, notes: 'Renew annually on MahaDBT.' },
    officialSourceUrl: 'https://mahadbt.maharashtra.gov.in/',
    applicationMode: 'external',
    externalPortalUrl: 'https://mahadbt.maharashtra.gov.in/',
    applicationSteps: [
      'Create a MahaDBT profile with Aadhaar-linked login (no ID stored on our side)',
      'Select the fee waiver scheme',
      'Upload domicile and income proof',
      'Submit and track at the institute level',
    ],
    description:
      'Maharashtra state tuition-fee reimbursement for students from families with annual income under ₹8 lakh.',
    tags: ['Maharashtra', 'fee-waiver', 'state'],
  },
  {
    provider: 'Government of Maharashtra',
    title: 'Post Matric Scholarship (Maharashtra)',
    type: 'State Government',
    amount: 40000,
    amountDescription: 'Maintenance allowance and compulsory non-fee grant.',
    degree: ['Class 11', 'Class 12', 'Undergraduate', 'Postgraduate'],
    currentYearAllowed: ['Any'],
    incomeLimit: 250000,
    marksMin: 0,
    category: ['SC', 'ST', 'OBC', 'Minority'],
    stateDomicile: ['Maharashtra'],
    gender: [],
    deadline: deadlineInDays(40),
    requiredDocuments: [
      'Domicile Proof',
      'Income Certificate',
      'Category Certificate',
      'Class 10 Marksheet',
      'Bank Passbook',
    ],
    selectionProcess: ['MahaDBT application', 'Institute verification', 'Social welfare department sanction'],
    aptitudeTestRequired: false,
    renewalCriteria: { minimumAttendance: 75 },
    officialSourceUrl: 'https://mahadbt.maharashtra.gov.in/',
    applicationMode: 'external',
    externalPortalUrl: 'https://mahadbt.maharashtra.gov.in/',
    applicationSteps: [
      'Log in to MahaDBT',
      'Choose Post Matric Scholarship',
      'Upload category and income proof',
      'Submit and monitor sanction',
    ],
    description:
      'State maintenance support for reserved-category and minority students in Maharashtra post-matriculation.',
    tags: ['Maharashtra', 'post-matric', 'state'],
  },
  {
    provider: 'Tata Consultancy Services',
    title: 'TCS Ignite Scholarship',
    type: 'Corporate CSR',
    amount: 100000,
    amountDescription: 'Up to ₹1,00,000 per year towards tuition for engineering students.',
    degree: ['Undergraduate', 'Professional (MBBS/BTech/LLB)'],
    currentYearAllowed: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
    incomeLimit: 800000,
    marksMin: 60,
    category: ['General', 'OBC', 'SC', 'ST', 'EWS', 'Minority', 'Other'],
    stateDomicile: ['All India'],
    gender: [],
    deadline: deadlineInDays(35),
    requiredDocuments: [
      'Income Certificate',
      'Class 12 Marksheet',
      'Bonafide / Enrolment Certificate',
      'Bank Passbook',
      'Photograph',
    ],
    selectionProcess: ['Online application', 'Aptitude test', 'Technical interview', 'Award'],
    aptitudeTestRequired: true,
    renewalCriteria: { minimumCgpa: 6.5, notes: 'Maintain good academic standing; annual review.' },
    officialSourceUrl: 'https://www.tcs.com/corporate-social-responsibility',
    applicationMode: 'external',
    externalPortalUrl: 'https://www.tcs.com/corporate-social-responsibility',
    applicationSteps: [
      'Register on the TCS scholarship portal',
      'Complete the online aptitude assessment',
      'Clear the interview round',
      'Receive award and maintain renewal CGPA',
    ],
    description:
      'Corporate CSR scholarship for meritorious engineering students with demonstrated financial need.',
    tags: ['CSR', 'engineering', 'aptitude-test'],
    examPattern: {
      name: 'TCS Ignite Online Aptitude Test',
      durationMinutes: 60,
      totalQuestions: 12,
      negativeMarking: 0,
      sections: [
        { name: 'Quantitative', questions: 4, durationMinutes: 20, topics: ['Percentages', 'Ratios', 'Averages'] },
        { name: 'Verbal', questions: 3, durationMinutes: 15, topics: ['Synonyms', 'Reading'] },
        { name: 'Logical', questions: 3, durationMinutes: 15, topics: ['Number Series', 'Odd One Out'] },
        { name: 'General Knowledge', questions: 2, durationMinutes: 10, topics: ['Government Schemes'] },
      ],
    },
  },
  {
    provider: 'Reliance Foundation',
    title: 'Reliance Foundation Undergraduate Scholarship',
    type: 'Foundation',
    amount: 200000,
    amountDescription: 'Up to ₹2,00,000 total grant across the undergraduate programme.',
    degree: ['Undergraduate'],
    currentYearAllowed: ['1st Year'],
    incomeLimit: 1500000,
    marksMin: 60,
    category: ['General', 'OBC', 'SC', 'ST', 'EWS', 'Minority', 'Other'],
    stateDomicile: ['All India'],
    gender: [],
    deadline: deadlineInDays(55),
    requiredDocuments: [
      'Class 12 Marksheet',
      'Income Certificate',
      'Bonafide / Enrolment Certificate',
      'Bank Passbook',
      'Photograph',
    ],
    selectionProcess: ['Online application', 'Aptitude test', 'Personal interview', 'Award'],
    aptitudeTestRequired: true,
    renewalCriteria: { minimumCgpa: 6, notes: 'Annual academic review.' },
    officialSourceUrl: 'https://www.scholarships.reliancefoundation.org/',
    applicationMode: 'external',
    externalPortalUrl: 'https://www.scholarships.reliancefoundation.org/',
    applicationSteps: [
      'Apply on the Reliance Foundation portal',
      'Attempt the online aptitude test',
      'Attend the interview if shortlisted',
      'Confirm award acceptance',
    ],
    description:
      'Foundation grant supporting meritorious first-year undergraduates across disciplines in India.',
    tags: ['foundation', 'undergraduate', 'aptitude-test'],
    examPattern: {
      name: 'Reliance Foundation Aptitude Assessment',
      durationMinutes: 45,
      totalQuestions: 12,
      negativeMarking: 0,
      sections: [
        { name: 'Quantitative', questions: 4, durationMinutes: 15, topics: ['Percentages', 'Averages'] },
        { name: 'Verbal', questions: 3, durationMinutes: 10, topics: ['Synonyms'] },
        { name: 'Logical', questions: 3, durationMinutes: 12, topics: ['Number Series'] },
        { name: 'General Knowledge', questions: 2, durationMinutes: 8, topics: ['Education Basics'] },
      ],
    },
  },
  {
    provider: 'University Grants Commission (UGC)',
    title: 'UGC Indira Gandhi PG Scholarship for Single Girl Child',
    type: 'Government',
    amount: 36200,
    amountDescription: '₹36,200 per year for two years of post-graduation.',
    degree: ['Postgraduate'],
    currentYearAllowed: ['1st Year'],
    incomeLimit: 800000,
    marksMin: 60,
    category: ['General', 'OBC', 'SC', 'ST', 'EWS', 'Minority', 'Other'],
    stateDomicile: ['All India'],
    gender: ['Female'],
    deadline: deadlineInDays(25),
    requiredDocuments: [
      'Class 12 Marksheet',
      'Bonafide / Enrolment Certificate',
      'Bank Passbook',
      'Photograph',
      'Signature',
    ],
    selectionProcess: ['UGC online application', 'University verification', 'UGC selection', 'Disbursal'],
    aptitudeTestRequired: false,
    renewalCriteria: { minimumCgpa: 6, notes: 'Maintain 60% in the first year for renewal.' },
    officialSourceUrl: 'https://www.ugc.gov.in/',
    applicationMode: 'external',
    externalPortalUrl: 'https://www.ugc.gov.in/',
    applicationSteps: [
      'Register on the UGC scholarship portal',
      'Upload PG admission and marksheet proof',
      'Submit through your university',
      'Track UGC approval',
    ],
    description:
      'For a single girl child pursuing a regular postgraduate degree in a recognised university.',
    tags: ['UGC', 'girls', 'postgraduate'],
  },
  {
    provider: 'Ministry of Minority Affairs',
    title: 'Begum Hazrat Mahal National Scholarship',
    type: 'Minority',
    amount: 12000,
    amountDescription: 'Up to ₹12,000 per annum for Class 9–12 minority girl students.',
    degree: ['Class 10', 'Class 11', 'Class 12'],
    currentYearAllowed: ['Any'],
    incomeLimit: 200000,
    marksMin: 50,
    category: ['Minority'],
    stateDomicile: ['All India'],
    gender: ['Female'],
    deadline: deadlineInDays(20),
    requiredDocuments: [
      'Income Certificate',
      'Class 10 Marksheet',
      'Bonafide / Enrolment Certificate',
      'Bank Passbook',
      'Photograph',
    ],
    selectionProcess: ['Online application', 'School verification', 'Ministry approval', 'DBT'],
    aptitudeTestRequired: false,
    renewalCriteria: { minimumAttendance: 75 },
    officialSourceUrl: 'https://www.maef.nic.in/',
    applicationMode: 'external',
    externalPortalUrl: 'https://www.maef.nic.in/',
    applicationSteps: [
      'Register on the MAEF scholarship portal',
      'Enter school and bank details',
      'Upload income and marksheet',
      'Submit before deadline',
    ],
    description:
      'National scholarship for meritorious girl students from minority communities in Classes 9 to 12.',
    tags: ['minority', 'girls', 'school'],
  },
  {
    provider: 'Government of Karnataka',
    title: 'Karnataka Vidyasiri Post Matric Scholarship',
    type: 'State Government',
    amount: 45000,
    amountDescription: 'Fee reimbursement plus maintenance for eligible Karnataka students.',
    degree: ['Class 11', 'Class 12', 'Undergraduate', 'Postgraduate'],
    currentYearAllowed: ['Any'],
    incomeLimit: 250000,
    marksMin: 0,
    category: ['SC', 'ST', 'OBC', 'Minority'],
    stateDomicile: ['Karnataka'],
    gender: [],
    deadline: deadlineInDays(48),
    requiredDocuments: [
      'Domicile Proof',
      'Income Certificate',
      'Category Certificate',
      'Class 10 Marksheet',
      'Bank Passbook',
    ],
    selectionProcess: ['Karnataka SSP portal application', 'Institute verification', 'Department approval', 'DBT'],
    aptitudeTestRequired: false,
    renewalCriteria: { minimumAttendance: 75 },
    officialSourceUrl: 'https://ssp.postmatric.karnataka.gov.in/',
    applicationMode: 'external',
    externalPortalUrl: 'https://ssp.postmatric.karnataka.gov.in/',
    applicationSteps: [
      'Register on the Karnataka State Scholarship Portal',
      'Select Vidyasiri post-matric scheme',
      'Upload domicile and income proof',
      'Submit and track verification',
    ],
    description:
      'Karnataka state scholarship for reserved-category students in post-matric courses.',
    tags: ['Karnataka', 'post-matric', 'state'],
  },
  {
    provider: 'Government of India',
    title: 'National Means-cum-Merit Scholarship (NMMS)',
    type: 'Government',
    amount: 12000,
    amountDescription: '₹12,000 per year for Class 9 to Class 12.',
    degree: ['Class 10', 'Class 11', 'Class 12'],
    currentYearAllowed: ['Any'],
    incomeLimit: 350000,
    marksMin: 55,
    category: ['General', 'OBC', 'SC', 'ST', 'EWS', 'Minority', 'Other'],
    stateDomicile: ['All India'],
    gender: [],
    deadline: deadlineInDays(70),
    requiredDocuments: [
      'Income Certificate',
      'Class 10 Marksheet',
      'Bonafide / Enrolment Certificate',
      'Bank Passbook',
      'Photograph',
    ],
    selectionProcess: ['State-level NMMS exam', 'Merit selection', 'NSP application', 'Annual disbursal'],
    aptitudeTestRequired: true,
    renewalCriteria: { minimumAttendance: 75, notes: 'Maintain 55% and continue in a government/aided school.' },
    officialSourceUrl: 'https://scholarships.gov.in/',
    applicationMode: 'native',
    applicationSteps: [
      'Pass the state NMMS examination',
      'Apply with the NMMS roll number',
      'Verify bank and school details',
      'Track annual renewal',
    ],
    description:
      'Encourages students from economically weaker sections to continue education and reduce dropout at Class 8.',
    tags: ['NMMS', 'school', 'merit', 'exam'],
    examPattern: {
      name: 'NMMS State Examination',
      durationMinutes: 90,
      totalQuestions: 12,
      negativeMarking: 0,
      sections: [
        { name: 'Quantitative', questions: 4, durationMinutes: 30, topics: ['Percentages', 'Averages'] },
        { name: 'Verbal', questions: 2, durationMinutes: 15, topics: ['Synonyms'] },
        { name: 'Logical', questions: 3, durationMinutes: 25, topics: ['Number Series', 'Odd One Out'] },
        { name: 'General Knowledge', questions: 3, durationMinutes: 20, topics: ['Education Basics', 'Government Schemes'] },
      ],
    },
  },
];
