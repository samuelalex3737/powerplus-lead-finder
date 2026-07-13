import { extractWithGroq } from './src/lib/extraction/groq-client';

async function run() {
  const text = `Sharjah has announced a major expansion of its wastewater treatment facilities to accommodate growing infrastructure demands and real estate development. The project will increase the daily treatment capacity by 30% to support new residential and industrial zones. The public works department stated this aligns with sustainability goals and future urban planning. Tenders will be issued in the coming quarter.`;
  
  console.log('Sending text to Groq...');
  try {
    const lead = await extractWithGroq(text, 'Zawya News');
    console.log(JSON.stringify(lead, null, 2));
  } catch (err) {
    console.error(err);
  }
}

run();
