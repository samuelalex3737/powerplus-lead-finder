import * as cheerio from 'cheerio';
import { BaseScraper, ScrapedItem, ScraperResult } from './base-scraper';

/**
 * Scrapes Dubizzle UAE Business & Industrial category for generator-related listings.
 * Dubizzle uses Next.js SSR so initial HTML contains listing data.
 * We target the generators and electrical equipment categories.
 */
export class DubizzleScraper extends BaseScraper {
  readonly name = 'Dubizzle UAE';
  readonly sourceId: string;

  private readonly urls = [
    'https://dubai.dubizzle.com/classifieds/business-industrial/industrial-supplies/generators/',
    'https://dubai.dubizzle.com/classifieds/business-industrial/electrical-equipment/',
  ];

  constructor(sourceId: string) {
    super();
    this.sourceId = sourceId;
  }

  async scrape(keywords: string[]): Promise<ScraperResult> {
    const items: ScrapedItem[] = [];
    const errors: string[] = [];

    for (const url of this.urls) {
      try {
        // Scrape pages 1-3 to stay respectful
        for (let page = 1; page <= 3; page++) {
          const pageUrl = page === 1 ? url : `${url}?page=${page}`;
          const pageItems = await this.scrapePage(pageUrl, keywords);
          items.push(...pageItems);

          // Rate limit: 2-second delay between page fetches
          if (page < 3) {
            await this.delay(2000);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Failed to scrape ${url}: ${message}`);
        console.error(`[DubizzleScraper] Error scraping ${url}:`, message);
      }

      // Delay between different category URLs
      await this.delay(2000);
    }

    return {
      sourceName: this.name,
      items,
      errors,
      scrapedAt: new Date(),
    };
  }

  private async scrapePage(url: string, keywords: string[]): Promise<ScrapedItem[]> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': this.getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const items: ScrapedItem[] = [];

    // Dubizzle listings are rendered as cards/list items
    // Try multiple possible selectors for listing containers
    const listingSelectors = [
      '[data-testid="listing-card"]',
      'article[class*="listing"]',
      'a[href*="/classifieds/"]',
      'li[class*="listing"]',
      '.listing-item',
    ];

    let $listings: ReturnType<typeof $> = $([]);
    for (const selector of listingSelectors) {
      $listings = $(selector);
      if ($listings.length > 0) break;
    }

    $listings.each((_: number, el: any) => {
      try {
        const $el = $(el);
        const title = $el.find('h2, h3, [class*="title"]').first().text().trim() || $el.find('a').first().text().trim();
        const description = $el.find('p, [class*="desc"], [class*="detail"]').text().trim();
        const price = $el.find('[class*="price"]').text().trim();
        const location = $el.find('[class*="location"], [class*="area"]').text().trim();
        const link = $el.find('a').first().attr('href') || $el.attr('href') || '';

        const fullText = [title, description, price, location].filter(Boolean).join(' ');

        if (!title || !fullText) return;

        // Filter by keywords
        if (this.matchesKeywords(fullText, keywords)) {
          const absoluteUrl = link.startsWith('http')
            ? link
            : `https://dubai.dubizzle.com${link}`;

          items.push({
            title,
            rawText: fullText,
            sourceUrl: absoluteUrl,
            scrapedAt: new Date(),
          });
        }
      } catch {
        // Skip individual listing errors
      }
    });

    // Also try to extract data from Next.js __NEXT_DATA__ script tag
    const nextDataScript = $('script#__NEXT_DATA__').html();
    if (nextDataScript && items.length === 0) {
      try {
        const nextData = JSON.parse(nextDataScript);
        const listings = this.extractListingsFromNextData(nextData);
        for (const listing of listings) {
          if (this.matchesKeywords(listing.rawText, keywords)) {
            items.push(listing);
          }
        }
      } catch {
        // __NEXT_DATA__ parsing failed, continue with HTML results
      }
    }

    console.log(`[DubizzleScraper] Found ${items.length} matching items on ${url}`);
    return items;
  }

  private extractListingsFromNextData(data: Record<string, unknown>): ScrapedItem[] {
    const items: ScrapedItem[] = [];

    // Navigate the nested JSON structure to find listing data
    const traverse = (obj: unknown, depth = 0): void => {
      if (depth > 10 || !obj || typeof obj !== 'object') return;

      if (Array.isArray(obj)) {
        for (const item of obj) {
          traverse(item, depth + 1);
        }
        return;
      }

      const record = obj as Record<string, unknown>;

      // Look for objects that look like listings (have title + url)
      if (typeof record.title === 'string' && typeof record.url === 'string') {
        const title = record.title as string;
        const description = (record.description || record.details || '') as string;
        const price = (record.price || '') as string;

        items.push({
          title,
          rawText: [title, description, String(price)].filter(Boolean).join(' '),
          sourceUrl: (record.url as string).startsWith('http')
            ? record.url as string
            : `https://dubai.dubizzle.com${record.url}`,
          scrapedAt: new Date(),
        });
        return;
      }

      for (const val of Object.values(record)) {
        traverse(val, depth + 1);
      }
    };

    traverse(data);
    return items;
  }
}
