import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete('session_token');
  return NextResponse.redirect(new URL('/login', process.env.APP_URL || 'http://localhost:3000'));
}
