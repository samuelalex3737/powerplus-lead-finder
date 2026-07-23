async function testZawyaRSS() {
  console.log("--- Testing Zawya RSS ---");
  const rssUrl = 'https://www.zawya.com/sitemaps/en/rss';
  const robotsUrl = 'https://www.zawya.com/robots.txt';

  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36', // Browser
    'Feedly/1.0 (+http://www.feedly.com/fetcher.html; like FeedFetcher-Google)', // Feedly
    'Feedbin feed-id:123456 - 21 subscribers', // Feedbin
    'Next.js Pipeline Scraper' // Custom
  ];

  for (const ua of userAgents) {
    try {
      const res = await fetch(rssUrl, {
        headers: {
          'User-Agent': ua,
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        }
      });
      console.log(`[RSS] UA: ${ua.substring(0, 30)}... | Status: ${res.status} ${res.statusText}`);
    } catch (e: any) {
      console.log(`[RSS] UA: ${ua.substring(0, 30)}... | Error: ${e.message}`);
    }
  }

  try {
    const res = await fetch(robotsUrl, {
      headers: {
        'User-Agent': 'Feedly/1.0 (+http://www.feedly.com/fetcher.html; like FeedFetcher-Google)',
      }
    });
    console.log(`\n[Robots.txt] Status: ${res.status} ${res.statusText}`);
    if (res.ok) {
      const text = await res.text();
      console.log(text.substring(0, 500) + '...\n');
      console.log('Includes /sitemaps/en/rss?', text.includes('/sitemaps/en/rss'));
    }
  } catch (e: any) {
    console.log(`[Robots.txt] Error: ${e.message}`);
  }
}

testZawyaRSS();
