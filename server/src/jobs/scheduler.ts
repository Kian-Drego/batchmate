import cron from 'node-cron';
import { runScraper } from '../services/scraper';
import { runRetentionSweep } from '../services/retention';

/**
 * Scheduled background work.
 *
 * - Scraper: 18:30 UTC == 00:00 IST (Asia/Kolkata, UTC+5:30).
 * - Retention sweep: 19:15 UTC == 00:45 IST, after the scraper completes.
 */
export function startScheduler(): void {
  if (process.env.DISABLE_CRON === 'true') {
    // eslint-disable-next-line no-console
    console.log('[cron] scheduler disabled via DISABLE_CRON');
    return;
  }

  cron.schedule(
    '30 18 * * *',
    async () => {
      // eslint-disable-next-line no-console
      console.log('[cron] starting nightly scholarship scrape (00:00 IST)');
      try {
        const report = await runScraper();
        // eslint-disable-next-line no-console
        console.log(`[cron] scrape ${report.mode}: ${report.totalUpserted} records upserted`);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[cron] scrape failed:', (error as Error).message);
      }
    },
    { timezone: 'UTC' }
  );

  cron.schedule(
    '15 19 * * *',
    async () => {
      // eslint-disable-next-line no-console
      console.log('[cron] running document retention sweep');
      try {
        const result = await runRetentionSweep();
        // eslint-disable-next-line no-console
        console.log(`[cron] retention sweep removed ${result.deleted} documents`);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[cron] retention sweep failed:', (error as Error).message);
      }
    },
    { timezone: 'UTC' }
  );

  // eslint-disable-next-line no-console
  console.log('[cron] scheduler active (scrape 18:30 UTC / retention 19:15 UTC)');
}
