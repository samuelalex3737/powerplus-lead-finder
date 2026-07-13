import { ZawyaScraper } from './src/lib/scrapers/zawya-scraper';

async function test() {
  const scraper = new ZawyaScraper('test-id');
  // Pass an empty array so it relies entirely on the internal coreKeywords and contextKeywords
  const result = await scraper.scrape([]);

  console.log(`\n=== SCRAPE COMPLETE ===`);
  console.log(`Total items found: ${result.items.length}`);
  if (result.items.length > 0) {
    console.log(`\nFirst 3 items:\n`);
    for (let i = 0; i < Math.min(3, result.items.length); i++) {
      console.log(`[${i + 1}] Title: ${result.items[i].title}`);
      console.log(`    URL: ${result.items[i].sourceUrl}`);
      console.log(`    Text preview: ${result.items[i].rawText.slice(0, 150)}...`);
    }
  }
}

test().catch(console.error);
