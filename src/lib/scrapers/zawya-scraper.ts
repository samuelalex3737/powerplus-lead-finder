import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import { BaseScraper, ScrapedItem, ScraperResult } from './base-scraper';

/**
 * Scrapes Zawya news for project announcements that predict generator demand.
 * Uses RSS feed + project section pages.
 * Targets: construction, utilities, transport projects in UAE/GCC.
 *
 * This is the PRIMARY working source for PowerPlus Lead Finder.
 * Zawya's RSS feed is publicly accessible and reliably returns fresh content.
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

  // Broader keyword set that catches implicit generator demand signals
  private readonly implicitKeywords = [
    'power', 'energy', 'electricity', 'MW', 'megawatt', 'kVA',
    'substation', 'generator', 'genset', 'diesel', 'cummins', 'perkins',
    'data centre', 'data center', 'hospital', 'factory', 'industrial',
    'hotel', 'resort', 'mall', 'tower', 'warehouse', 'logistics',
    'desalination', 'water treatment', 'wastewater',
  ];

  constructor(sourceId: string) {
    super();
    this.sourceId = sourceId;
  }

  async scrape(keywords: string[]): Promise<ScraperResult> {
    const items: ScrapedItem[] = [];
    const errors: string[] = [];

    // Combine user keywords with implicit demand keywords
    const allKeywords = [...keywords, ...this.implicitKeywords];

    // 1. Try RSS feed first (most reliable, no proxy needed)
    try {
      const rssItems = await this.scrapeRss(allKeywords);
      items.push(...rssItems);
      console.log(`[ZawyaScraper] RSS: ${rssItems.length} matching items`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`RSS feed failed: ${message}`);
      console.error('[ZawyaScraper] RSS error:', message);
    }

    // 2. Scrape project section pages
    for (const url of this.projectUrls) {
      try {
        const pageItems = await this.scrapeProjectPage(url, allKeywords);
        items.push(...pageItems);
        console.log(`[ZawyaScraper] Projects page ${url}: ${pageItems.length} items`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Failed to scrape ${url}: ${message}`);
        console.error(`[ZawyaScraper] Error scraping ${url}:`, message);
      }

      // Rate limiting: 2-second delay between fetches
      await this.delay(2000);
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    const dedupedItems = items.filter((item) => {
      const key = item.sourceUrl.replace(/\/$/, ''); // normalize trailing slash
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`[ZawyaScraper] Total: ${dedupedItems.length} unique items (${items.length - dedupedItems.length} duplicates removed)`);

    return {
      sourceName: this.name,
      items: dedupedItems,
      errors,
      scrapedAt: new Date(),
    };
  }

  private async scrapeRss(keywords: string[]): Promise<ScrapedItem[]> {
    // Direct fetch — Zawya RSS is publicly accessible, no proxy needed
    const response = await fetch(this.rssUrl, {
      headers: {
        'User-Agent': this.getRandomUserAgent(),
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xml = await response.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    const items: ScrapedItem[] = [];

    $('item').each((_: number, el: unknown) => {
      const $el = $(el as Element);
      const title = $el.find('title').text().trim();
      const description = $el.find('description').text().trim();
      const pubDate = $el.find('pubDate').text().trim();

      // In RSS XML, <link> text can be empty; use <guid> as fallback for the URL
      let link = $el.find('link').text().trim();
      if (!link) {
        link = $el.find('guid').text().trim();
      }

      if (!title || !link) return;

      const fullText = `${title} ${description}`;

      // Check for UAE/GCC relevance AND keyword match
      // We allow broader GCC matches since big projects in the region can need generators
      const regionRelevant = /UAE|Dubai|Abu Dhabi|Sharjah|Ajman|Ras Al Khaimah|Fujairah|Umm Al Quwain|United Arab Emirates|Saudi|Oman|Bahrain|Kuwait|Qatar|GCC/i.test(fullText);

      if (regionRelevant && this.matchesKeywords(fullText, keywords)) {
        items.push({
          title,
          rawText: `${title}. ${description} (Published: ${pubDate})`,
          sourceUrl: link,
          scrapedAt: new Date(),
        });
      }
    });

    return items;
  }

  private async scrapeProjectPage(url: string, keywords: string[]): Promise<ScrapedItem[]> {
    // Direct fetch — Zawya project pages are publicly accessible
    const response = await fetch(url, {
      headers: {
        'User-Agent': this.getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const items: ScrapedItem[] = [];

    // Zawya uses Next.js SSR — article cards render as <article> tags in the HTML
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

    $articles.each((_: number, el: unknown) => {
      try {
        const $el = $(el as Element);
        const title = $el.find('h2, h3, h4, [class*="title"]').first().text().trim();
        const summary = $el.find('p, [class*="summary"], [class*="desc"]').first().text().trim();
        const link = $el.find('a').first().attr('href') || '';

        if (!title) return;

        const fullText = `${title} ${summary}`;

        // Projects section is already region-relevant, so just check keywords
        if (this.matchesKeywords(fullText, keywords)) {
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

    return items;
  }
}
