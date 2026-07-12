import { createAdminClient } from '@/lib/supabase/admin';
import type { Source, Keyword } from '@/types/database';
import { BaseScraper, ScraperResult } from './base-scraper';
import { DubizzleScraper } from './dubizzle-scraper';
import { ZawyaScraper } from './zawya-scraper';
import { PlaceholderScraper } from './placeholder-scraper';

// Map source names to their scraper factory functions
const SCRAPER_MAP: Record<string, (sourceId: string) => BaseScraper> = {
  'Dubizzle UAE - Business & Industrial': (id) => new DubizzleScraper(id),
  'Zawya News': (id) => new ZawyaScraper(id),

  // Placeholder scrapers for sources requiring accounts
  'Dubai eSupply': (id) =>
    new PlaceholderScraper('Dubai eSupply', id, 'Requires JAGGAER portal registration and paid subscription'),
  'Abu Dhabi Government Procurement Gate': (id) =>
    new PlaceholderScraper('Abu Dhabi Government Procurement Gate', id, 'Requires SAP Ariba portal account; ToU prohibits scraping'),
  'UAE Federal e-Procurement Platform': (id) =>
    new PlaceholderScraper('UAE Federal e-Procurement Platform', id, 'Fully gated behind supplier registration and approval'),
  'TenderUAE (free listings)': (id) =>
    new PlaceholderScraper('TenderUAE', id, 'Subscription paywall, limited free data'),
  'UAETenders (free listings)': (id) =>
    new PlaceholderScraper('UAETenders', id, 'Subscription paywall, no public listings'),
};

export interface RegistryRunResult {
  results: ScraperResult[];
  totalItems: number;
  enabledSources: number;
  skippedSources: number;
}

/**
 * Load enabled sources and keywords from DB, run all registered scrapers.
 */
export async function runAllScrapers(): Promise<RegistryRunResult> {
  const supabase = createAdminClient();

  // Load enabled sources
  const { data: sources, error: sourcesError } = await supabase
    .from('sources')
    .select('*')
    .eq('enabled', true);

  if (sourcesError) {
    throw new Error(`Failed to load sources: ${sourcesError.message}`);
  }

  // Load enabled keywords
  const { data: keywords, error: keywordsError } = await supabase
    .from('keywords')
    .select('*')
    .eq('enabled', true);

  if (keywordsError) {
    throw new Error(`Failed to load keywords: ${keywordsError.message}`);
  }

  const keywordList = (keywords as Keyword[]).map((k) => k.keyword);
  const results: ScraperResult[] = [];
  let skippedSources = 0;

  for (const source of sources as Source[]) {
    const scraperFactory = SCRAPER_MAP[source.name];

    if (!scraperFactory) {
      console.warn(`[Registry] No scraper registered for source: ${source.name}`);
      skippedSources++;
      continue;
    }

    const scraper = scraperFactory(source.id);
    console.log(`[Registry] Running scraper: ${scraper.name}`);

    try {
      const result = await scraper.scrape(keywordList);
      results.push(result);

      // Update last_checked_at
      await supabase
        .from('sources')
        .update({ last_checked_at: new Date().toISOString() })
        .eq('id', source.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Registry] Scraper ${scraper.name} crashed:`, message);
      results.push({
        sourceName: scraper.name,
        items: [],
        errors: [`Scraper crashed: ${message}`],
        scrapedAt: new Date(),
      });
    }
  }

  const totalItems = results.reduce((sum, r) => sum + r.items.length, 0);

  return {
    results,
    totalItems,
    enabledSources: (sources as Source[]).length,
    skippedSources,
  };
}
