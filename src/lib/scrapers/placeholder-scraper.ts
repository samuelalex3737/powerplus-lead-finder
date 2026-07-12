import { BaseScraper, ScraperResult } from './base-scraper';

/**
 * Placeholder scraper for sources that require paid accounts or special access.
 * Returns empty results with a descriptive log.
 * 
 * To implement a real scraper for a gated source:
 * 1. Create a new file (e.g., esupply-scraper.ts) extending BaseScraper
 * 2. Implement the scrape() method with authentication logic
 * 3. Add the required credentials as env vars
 * 4. Register the scraper in registry.ts
 */
export class PlaceholderScraper extends BaseScraper {
  readonly name: string;
  readonly sourceId: string;
  private readonly reason: string;

  constructor(name: string, sourceId: string, reason: string) {
    super();
    this.name = name;
    this.sourceId = sourceId;
    this.reason = reason;
  }

  async scrape(): Promise<ScraperResult> {
    console.log(
      `[PlaceholderScraper] Skipping "${this.name}": ${this.reason}. ` +
      `To enable this source, implement a proper scraper connector.`
    );

    return {
      sourceName: this.name,
      items: [],
      errors: [],
      scrapedAt: new Date(),
    };
  }
}
