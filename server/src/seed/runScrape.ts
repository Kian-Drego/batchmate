import { connectDatabase, disconnectDatabase } from '../config/db';
import { runScraper } from '../services/scraper';

/** Manual trigger for the nightly crawl: `npm run scrape`. */
async function main(): Promise<void> {
  await connectDatabase();
  const report = await runScraper();
  // eslint-disable-next-line no-console
  console.log('[scrape] report:', JSON.stringify(report, null, 2));
  await disconnectDatabase();
  process.exit(0);
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error('[scrape] failed:', err);
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
