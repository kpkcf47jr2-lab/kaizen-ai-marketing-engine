/**
 * Elite OAuth Callback
 *
 * Flow:
 * 1. User clicks "Conectar Elite" → redirected to Elite OAuth page
 * 2. User logs in on Elite → redirected back here with ?code=xxx
 * 3. We exchange the code for an access_token at Elite's token endpoint
 * 4. We fetch the user's profile from /api/v1/me
 * 5. We save the encrypted token as a SocialAccount
 * 6. Redirect to /dashboard/connections with success
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
      new URL('/dashboard/connections?error=elite_oauth_denied', req.url),
    );
  }

  try {
    // ── Step 1: Exchange authorization code for access token ──
    const tokenRes = await fetch('https://api.elite-777.com/oauth/connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.ELITE_CLIENT_ID || '',
        client_secret: process.env.ELITE_CLIENT_SECRET || '',
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/social/elite/callback`,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error) {
      console.error('[elite-oauth] Token exchange failed:', tokenData);
      throw new Error(tokenData.error_description || tokenData.error || 'Token exchange failed');
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 86400; // default 24h

    // ── Step 2: Fetch user profile from Elite ──
    const profileRes = await fetch('https://api.elite-777.com/api/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const profileData = await profileRes.json();

    if (!profileRes.ok) {
      console.error('[elite-oauth] Profile fetch failed:', profileData);
      throw new Error('Failed to fetch Elite profile');
    }

    const eliteUserId = profileData.id || profileData.user_id || 'unknown';
    const eliteUsername = profileData.username || profileData.display_name || profileData.name || 'elite-user';

    // ── Step 3: Save as SocialAccount ──
    const userId = (session.user as any).id;

    await prisma.socialAccount.upsert({
      where: { userId_provider: { userId, provider: 'ELITE' } },
      update: {
        accessTokenEncrypted: await encryptToken(accessToken),
        refreshTokenEncrypted: refreshToken ? await encryptToken(refreshToken) : undefined,
        providerAccountId: String(eliteUserId),
        providerUsername: eliteUsername,
        status: 'ACTIVE',
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
        scopes: ['posts:write', 'media:upload', 'profile:read'],
      },
      create: {
        userId,
        provider: 'ELITE',
        accessTokenEncrypted: await encryptToken(accessToken),
        refreshTokenEncrypted: refreshToken ? await encryptToken(refreshToken) : undefined,
        providerAccountId: String(eliteUserId),
        providerUsername: eliteUsername,
        scopes: ['posts:write', 'media:upload', 'profile:read'],
        status: 'ACTIVE',
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      },
    });

    console.log(`[elite-oauth] ✅ Connected @${eliteUsername} for user ${userId}`);

    return NextResponse.redirect(
      new URL('/dashboard/connections?success=elite', req.url),
    );
  } catch (err) {
    console.error('[elite-oauth] ❌ Error:', err);
    return NextResponse.redirect(
      new URL('/dashboard/connections?error=elite_failed', req.url),
    );
  }
}
