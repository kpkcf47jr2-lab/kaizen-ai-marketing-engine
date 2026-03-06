/**
 * YouTube/Google OAuth Callback
 *
 * Flow:
 * 1. User clicks "Connect YouTube" → redirected to Google OAuth
 * 2. User authorizes → redirected back here with ?code=xxx
 * 3. Exchange code for access_token
 * 4. Fetch YouTube channel info
 * 5. Save encrypted token as SocialAccount
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { encryptToken } from '@/lib/token-vault';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(
      new URL('/dashboard/connections?error=youtube_oauth_denied', req.url),
    );
  }

  try {
    // Exchange code for token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/social/youtube/callback`,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error('[youtube-oauth] Token exchange failed:', tokenData);
      throw new Error(tokenData.error_description || tokenData.error || 'Token exchange failed');
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 3600;

    // Fetch YouTube channel info
    const channelRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    const channelData = await channelRes.json();
    const channel = channelData.items?.[0];
    const channelId = channel?.id || 'unknown';
    const channelTitle = channel?.snippet?.title || 'YouTube Channel';

    // Save as SocialAccount
    const userId = (session.user as any).id;

    await prisma.socialAccount.upsert({
      where: { userId_provider: { userId, provider: 'YOUTUBE' } },
      update: {
        providerAccountId: channelId,
        providerUsername: channelTitle,
        accessTokenEncrypted: await encryptToken(accessToken),
        refreshTokenEncrypted: refreshToken ? await encryptToken(refreshToken) : undefined,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
        scopes: ['youtube.upload', 'youtube'],
        status: 'ACTIVE',
      },
      create: {
        userId,
        provider: 'YOUTUBE',
        providerAccountId: channelId,
        providerUsername: channelTitle,
        accessTokenEncrypted: await encryptToken(accessToken),
        refreshTokenEncrypted: refreshToken ? await encryptToken(refreshToken) : undefined,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
        scopes: ['youtube.upload', 'youtube'],
        status: 'ACTIVE',
      },
    });

    return NextResponse.redirect(
      new URL('/dashboard/connections?success=youtube_connected', req.url),
    );
  } catch (err) {
    console.error('[youtube-oauth] Error:', err);
    return NextResponse.redirect(
      new URL('/dashboard/connections?error=youtube_oauth_failed', req.url),
    );
  }
}
