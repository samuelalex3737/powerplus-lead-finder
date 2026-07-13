import { createAdminClient } from '@/lib/supabase/admin';
import type { Source, Keyword } from '@/types/database';
import { BaseScraper, ScraperResult } from './base-scraper';
import { ZawyaScraper } from './zawya-scraper';
import { PlaceholderScraper } from './placeholder-scraper';

// NOTE: DubizzleScraper is intentionally NOT imported.
// Dubizzle uses Cloudflare Enterprise anti-bot protection that blocks all
// server-side requests. This cannot be bypassed without a paid proxy service
// (e.g., BrightData, ScrapingBee). The scraper code is kept in the repo
// for future use if a proxy service is added.

// Map source names to their scraper factory functions
const SCRAPER_MAP: Record<string, (sourceId: string) => BaseScraper> = {
  // === WORKING SCRAPERS ===
  'Zawya News': (id) => new ZawyaScraper(id),

  // === DISABLED: Cloudflare-blocked ===
  'Dubizzle UAE - Business & Industrial': (id) =>
    new PlaceholderScraper(
      'Dubizzle UAE',
      id,
      'Blocked by Cloudflare Enterprise anti-bot protection. Requires a paid proxy service (BrightData/ScrapingBee) to access.'
    ),

  // === DISABLED: Requires paid accounts / gated portals ===
  'Dubai eSupply': (id) =>
    new PlaceholderScraper(
      'Dubai eSupply',
      id,
      'Requires JAGGAER portal registration and paid subscription to access tender listings.'
    ),
  'Abu Dhabi Government Procurement Gate': (id) =>
    new PlaceholderScraper(
      'Abu Dhabi Government Procurement Gate',
      id,
      'Requires SAP Ariba portal account. Terms of Use explicitly prohibit scraping.'
    ),
  'UAE Federal e-Procurement Platform': (id) =>
    new PlaceholderScraper(
      'UAE Federal e-Procurement Platform',
      id,
      'Fully gated behind supplier registration and government approval process.'
    ),
  'TenderUAE (free listings)': (id) =>
    new PlaceholderScraper(
      'TenderUAE',
      id,
      'Subscription paywall. Free listings are severely limited and not scrapable.'
    ),
  'UAETenders (free listings)': (id) =>
    new PlaceholderScraper(
      'UAETenders',
      id,
      'Subscription paywall with no publicly accessible listing pages.'
    ),
};

export interface SourceRunResult {
  sourceName: string;
  itemCount: number;
  errors: string[];
  isPlaceholder: boolean;
}

export interface RegistryRunResult {
  results: ScraperResult[];
  sourceResults: SourceRunResult[];
  totalItems: number;
  enabledSources: number;
  skippedSources: number;
  sourcesRan: string[];
}

/**
 * Load enabled sources and keywords from DB, run all registered scrapers.
 * Each source runs independently — one failure does not stop others.
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
  const sourceResults: SourceRunResult[] = [];
  const sourcesRan: string[] = [];
  let skippedSources = 0;

  for (const source of sources as Source[]) {
    const scraperFactory = SCRAPER_MAP[source.name];

    if (!scraperFactory) {
      console.warn(`[Registry] No scraper registered for source: ${source.name}`);
      skippedSources++;
      continue;
    }

    const scraper = scraperFactory(source.id);
    const isPlaceholder = scraper instanceof PlaceholderScraper;
    sourcesRan.push(source.name);
    console.log(`[Registry] Running scraper: ${scraper.name}${isPlaceholder ? ' (placeholder)' : ''}`);

    try {
      const result = await scraper.scrape(keywordList);
      results.push(result);
      sourceResults.push({
        sourceName: source.name,
        itemCount: result.items.length,
        errors: result.errors,
        isPlaceholder,
      });

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
      sourceResults.push({
        sourceName: source.name,
        itemCount: 0,
        errors: [`Scraper crashed: ${message}`],
        isPlaceholder,
      });
    }
  }

  const totalItems = results.reduce((sum, r) => sum + r.items.length, 0);

  return {
    results,
    sourceResults,
    totalItems,
    enabledSources: (sources as Source[]).length,
    skippedSources,
    sourcesRan,
  };
}
