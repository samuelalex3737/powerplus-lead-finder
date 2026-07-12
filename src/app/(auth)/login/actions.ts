'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import crypto from 'crypto';

export async function login(prevState: { error: string } | null, formData: FormData) {
  const password = formData.get('password') as string;

  if (!password) {
    return { error: 'Password is required' };
  }

  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) {
    console.error('APP_PASSWORD environment variable is not set');
    return { error: 'Server configuration error' };
  }

  // Timing-safe comparison to prevent timing attacks
  const passwordBuffer = Buffer.from(password);
  const appPasswordBuffer = Buffer.from(appPassword);

  const isValid =
    passwordBuffer.length === appPasswordBuffer.length &&
    crypto.timingSafeEqual(passwordBuffer, appPasswordBuffer);

  if (!isValid) {
    return { error: 'Invalid password' };
  }

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    console.error('SESSION_SECRET environment variable is not set');
    return { error: 'Server configuration error' };
  }

  const cookieStore = await cookies();
  cookieStore.set('session_token', sessionSecret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });

  redirect('/');
}
