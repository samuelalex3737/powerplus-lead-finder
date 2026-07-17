async function checkUrls() {
  const urls = [
    'https://www.zawya.com/en/projects',
    'https://www.zawya.com/en/projects/construction',
    'https://www.zawya.com/en/projects/utilities',
    'https://www.zawya.com/en/projects/transport',
    'https://www.zawya.com/en/projects/infrastructure'
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      console.log(`[${res.status}] ${url}`);
    } catch (err: any) {
      console.error(`[Error] ${url}: ${err.message}`);
    }
  }
}
checkUrls();
