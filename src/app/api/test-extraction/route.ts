import { NextResponse } from 'next/server';
import { extractWithGroq } from '@/lib/extraction/groq-client';

export async function GET() {
  const text = `Sharjah has announced a major expansion of its wastewater treatment facilities to accommodate growing infrastructure demands and real estate development. The project will increase the daily treatment capacity by 30% to support new residential and industrial zones. The public works department stated this aligns with sustainability goals and future urban planning. Tenders will be issued in the coming quarter.`;
  
  try {
    const lead = await extractWithGroq(text, 'Zawya News');
    return NextResponse.json(lead);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
