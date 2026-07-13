import * as cheerio from 'cheerio';
import { BaseScraper, ScrapedItem, ScraperResult } from './base-scraper';

/**
 * Scrapes Zawya news for project announcements that predict generator demand.
 * Uses RSS feed + project section pages.
 * Targets: construction, utilities, transport projects in UAE.
 */
export class ZawyaScraper extends BaseScraper {
  readonly name = 'Zawya News';
  readonly sourceId: string;

  private readonly rssUrl = 'https://www.zawya.com/sitemaps/en/rss';
  private readonly projectUrls = [
    'https://www.zawya.com/en/projects/construction',
    'https://www.zawya.com/en/projects/utilities',
    'https://www.zawya.com/en/projects/transport',
  ];

  constructor(sourceId: string) {
    super();
    this.sourceId = sourceId;
  }

  async scrape(keywords: string[]): Promise<ScraperResult> {
    const items: ScrapedItem[] = [];
    const errors: string[] = [];

    // 1. Try RSS feed first
    try {
      const rssItems = await this.scrapeRss(keywords);
      items.push(...rssItems);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`RSS feed failed: ${message}`);
      console.error('[ZawyaScraper] RSS error:', message);
    }

    // 2. Scrape project section pages
    for (const url of this.projectUrls) {
      try {
        const pageItems = await this.scrapeProjectPage(url, keywords);
        items.push(...pageItems);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Failed to scrape ${url}: ${message}`);
        console.error(`[ZawyaScraper] Error scraping ${url}:`, message);
      }

      // Rate limiting: 3-second delay between fetches
      await this.delay(3000);
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    const dedupedItems = items.filter((item) => {
      if (seen.has(item.sourceUrl)) return false;
      seen.add(item.sourceUrl);
      return true;
    });

    return {
      sourceName: this.name,
      items: dedupedItems,
      errors,
      scrapedAt: new Date(),
    };
  }

  private async scrapeRss(keywords: string[]): Promise<ScrapedItem[]> {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(this.rssUrl)}`;
    const response = await fetch(proxyUrl, {
      headers: {
        'User-Agent': this.getRandomUserAgent(),
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xml = await response.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    const items: ScrapedItem[] = [];

    $('item').each((_: number, el: any) => {
      const $el = $(el);
      const title = $el.find('title').text().trim();
      const description = $el.find('description').text().trim();
      const link = $el.find('link').text().trim();
      const pubDate = $el.find('pubDate').text().trim();

      const fullText = `${title} ${description}`;

      // Filter for UAE-related content and keyword matches
      const uaeRelevant = /UAE|Dubai|Abu Dhabi|Sharjah|Ajman|Ras Al Khaimah|Fujairah|Umm Al Quwain|United Arab Emirates/i.test(fullText);

      if (uaeRelevant && this.matchesKeywords(fullText, keywords)) {
        items.push({
          title,
          rawText: `${title}. ${description} (Published: ${pubDate})`,
          sourceUrl: link,
          scrapedAt: new Date(),
        });
      }
    });

    console.log(`[ZawyaScraper] Found ${items.length} matching RSS items`);
    return items;
  }

  private async scrapeProjectPage(url: string, keywords: string[]): Promise<ScrapedItem[]> {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl, {
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

    // Look for article/story cards on the projects page
    const articleSelectors = [
      'article',
      '[class*="story"]',
      '[class*="article"]',
      '[class*="card"]',
      '.story-card',
    ];

    let $articles: ReturnType<typeof $> = $([]);
    for (const selector of articleSelectors) {
      $articles = $(selector);
      if ($articles.length > 0) break;
    }

    $articles.each((_: number, el: any) => {
      try {
        const $el = $(el);
        const title = $el.find('h2, h3, h4, [class*="title"]').first().text().trim();
        const summary = $el.find('p, [class*="summary"], [class*="desc"]').first().text().trim();
        const link = $el.find('a').first().attr('href') || '';

        const fullText = `${title} ${summary}`;

        if (!title) return;

        // Check for UAE relevance and keyword match
        const uaeRelevant = /UAE|Dubai|Abu Dhabi|Sharjah|Ajman|Ras Al Khaimah|Fujairah|United Arab Emirates/i.test(fullText);

        if (this.matchesKeywords(fullText, keywords) || (uaeRelevant && this.matchesKeywords(fullText, ['project', 'construction', 'infrastructure', 'hospital', 'factory', 'data centre', 'data center', 'hotel', 'resort']))) {
          const absoluteUrl = link.startsWith('http')
            ? link
            : `https://www.zawya.com${link}`;

          items.push({
            title,
            rawText: `${title}. ${summary}`,
            sourceUrl: absoluteUrl,
            scrapedAt: new Date(),
          });
        }
      } catch {
        // Skip individual article errors
      }
    });

    console.log(`[ZawyaScraper] Found ${items.length} matching items on ${url}`);
    return items;
  }
}
