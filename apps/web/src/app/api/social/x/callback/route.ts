/**
 * X (Twitter) OAuth 2.0 Callback
 *
 * Flow:
 * 1. User clicks "Connect X" → redirected to X OAuth page
 * 2. User authorizes → redirected back here with ?code=xxx&state=xxx
 * 3. We exchange code for access_token using PKCE
 * 4. We fetch user profile
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
      new URL('/dashboard/connections?error=x_oauth_denied', req.url),
    );
  }

  try {
    // Exchange code for token using OAuth 2.0 with PKCE
    const clientId = process.env.X_CLIENT_ID || '';
    const clientSecret = process.env.X_CLIENT_SECRET || '';
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenRes = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/social/x/callback`,
        code_verifier: 'challenge', // In production, use stored PKCE verifier
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error) {
      console.error('[x-oauth] Token exchange failed:', tokenData);
      throw new Error(tokenData.error_description || tokenData.error || 'Token exchange failed');
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 7200;

    // Fetch user profile
    const profileRes = await fetch('https://api.x.com/2/users/me?user.fields=profile_image_url,username', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const profileData = await profileRes.json();

    if (!profileRes.ok) {
      console.error('[x-oauth] Profile fetch failed:', profileData);
      throw new Error('Failed to fetch X profile');
    }

    const xUser = profileData.data;
    const xUserId = xUser?.id || 'unknown';
    const xUsername = xUser?.username || 'x-user';

    // Save as SocialAccount
    const userId = (session.user as any).id;

    await prisma.socialAccount.upsert({
      where: { userId_provider: { userId, provider: 'X_TWITTER' } },
      update: {
        providerAccountId: xUserId,
        providerUsername: xUsername,
        accessTokenEncrypted: await encryptToken(accessToken),
        refreshTokenEncrypted: refreshToken ? await encryptToken(refreshToken) : undefined,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
        scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
        status: 'ACTIVE',
      },
      create: {
        userId,
        provider: 'X_TWITTER',
        providerAccountId: xUserId,
        providerUsername: xUsername,
        accessTokenEncrypted: await encryptToken(accessToken),
        refreshTokenEncrypted: refreshToken ? await encryptToken(refreshToken) : undefined,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
        scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
        status: 'ACTIVE',
      },
    });

    return NextResponse.redirect(
      new URL('/dashboard/connections?success=x_connected', req.url),
    );
  } catch (err) {
    console.error('[x-oauth] Error:', err);
    return NextResponse.redirect(
      new URL('/dashboard/connections?error=x_oauth_failed', req.url),
    );
  }
}
