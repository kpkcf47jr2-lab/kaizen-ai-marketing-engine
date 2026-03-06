/**
 * TikTok OAuth Callback
 *
 * Flow:
 * 1. User clicks "Connect TikTok" → redirected to TikTok OAuth
 * 2. User authorizes → redirected back here with ?code=xxx
 * 3. Exchange code for access_token
 * 4. Fetch user profile
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
      new URL('/dashboard/connections?error=tiktok_oauth_denied', req.url),
    );
  }

  try {
    // Exchange code for token
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY || '',
        client_secret: process.env.TIKTOK_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/social/tiktok/callback`,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error || !tokenData.data?.access_token) {
      console.error('[tiktok-oauth] Token exchange failed:', tokenData);
      throw new Error(
        tokenData.error?.message || tokenData.error_description || 'Token exchange failed',
      );
    }

    const { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn, open_id: openId } =
      tokenData.data;

    // Fetch user profile
    const profileRes = await fetch(
      'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url,username',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    const profileData = await profileRes.json();
    const tiktokUser = profileData.data?.user;
    const tiktokUsername = tiktokUser?.username || tiktokUser?.display_name || 'tiktok-user';

    // Save as SocialAccount
    const userId = (session.user as any).id;

    await prisma.socialAccount.upsert({
      where: { userId_provider: { userId, provider: 'TIKTOK' } },
      update: {
        providerAccountId: openId || 'unknown',
        providerUsername: tiktokUsername,
        accessTokenEncrypted: await encryptToken(accessToken),
        refreshTokenEncrypted: refreshToken ? await encryptToken(refreshToken) : undefined,
        tokenExpiresAt: new Date(Date.now() + (expiresIn || 86400) * 1000),
        scopes: ['user.info.basic', 'video.publish', 'video.upload'],
        status: 'ACTIVE',
      },
      create: {
        userId,
        provider: 'TIKTOK',
        providerAccountId: openId || 'unknown',
        providerUsername: tiktokUsername,
        accessTokenEncrypted: await encryptToken(accessToken),
        refreshTokenEncrypted: refreshToken ? await encryptToken(refreshToken) : undefined,
        tokenExpiresAt: new Date(Date.now() + (expiresIn || 86400) * 1000),
        scopes: ['user.info.basic', 'video.publish', 'video.upload'],
        status: 'ACTIVE',
      },
    });

    return NextResponse.redirect(
      new URL('/dashboard/connections?success=tiktok_connected', req.url),
    );
  } catch (err) {
    console.error('[tiktok-oauth] Error:', err);
    return NextResponse.redirect(
      new URL('/dashboard/connections?error=tiktok_oauth_failed', req.url),
    );
  }
}
