export interface ScraperSource {
  name: string;
  url: string;
  provider: string;
  /** Which fetcher to use for this source. */
  strategy: 'cheerio' | 'playwright';
  /** Optional CSS selectors that reliably identify record blocks. */
  selectors?: {
    record: string;
    title: string;
    link?: string;
    description?: string;
  };
}

/**
 * Registered sources for the daily crawl. Government portals are rendered
 * client-side, so Playwright is used there; static CSR/foundation pages are
 * scraped with Cheerio for speed.
 */
export const SOURCES: ScraperSource[] = [
  {
    name: 'National Scholarship Portal',
    url: 'https://scholarships.gov.in/',
    provider: 'National Scholarship Portal (NSP)',
    strategy: 'playwright',
  },
  {
    name: 'AICTE Student Development Schemes',
    url: 'https://www.aicte-india.org/schemes/students-development-schemes',
    provider: 'AICTE',
    strategy: 'playwright',
  },
  {
    name: 'UGC Scholarships',
    url: 'https://www.ugc.gov.in/',
    provider: 'University Grants Commission (UGC)',
    strategy: 'playwright',
  },
  {
    name: 'Maharashtra MahaDBT',
    url: 'https://mahadbt.maharashtra.gov.in/',
    provider: 'Government of Maharashtra',
    strategy: 'playwright',
  },
  {
    name: 'Karnataka State Scholarship Portal',
    url: 'https://ssp.postmatric.karnataka.gov.in/',
    provider: 'Government of Karnataka',
    strategy: 'playwright',
  },
  {
    name: 'Reliance Foundation Scholarships',
    url: 'https://www.scholarships.reliancefoundation.org/',
    provider: 'Reliance Foundation',
    strategy: 'cheerio',
  },
];
