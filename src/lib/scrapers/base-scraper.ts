// Base interface and abstract class for all scrapers

export interface ScrapedItem {
  title: string;
  rawText: string;
  sourceUrl: string;
  scrapedAt: Date;
}

export interface ScraperResult {
  sourceName: string;
  items: ScrapedItem[];
  errors: string[];
  scrapedAt: Date;
}

export abstract class BaseScraper {
  abstract readonly name: string;
  abstract readonly sourceId: string;

  /**
   * Scrape the source and return matching items.
   * Implementations should handle their own error recovery.
   */
  abstract scrape(keywords: string[]): Promise<ScraperResult>;

  /**
   * Check if text matches any of the provided keywords (case-insensitive).
   */
  protected matchesKeywords(text: string, keywords: string[]): boolean {
    const lowerText = text.toLowerCase();
    return keywords.some((kw) => lowerText.includes(kw.toLowerCase()));
  }

  /**
   * Delay execution to respect rate limits.
   */
  protected async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Rotate through common user agents to avoid detection.
   */
  protected getRandomUserAgent(): string {
    const agents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    ];
    return agents[Math.floor(Math.random() * agents.length)];
  }
}
