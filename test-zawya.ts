import fs from 'fs';

async function getRobots() {
  const robotsUrl = 'https://www.zawya.com/robots.txt';
  try {
    const res = await fetch(robotsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      }
    });
    if (res.ok) {
      const text = await res.text();
      fs.writeFileSync('zawya-robots.txt', text);
      console.log('Saved robots.txt to zawya-robots.txt');
    } else {
      console.log(`Failed: ${res.status}`);
    }
  } catch (e: any) {
    console.log(`Error: ${e.message}`);
  }
}
getRobots();
