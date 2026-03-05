/**
 * Meta OAuth callback — handles Instagram & Facebook OAuth flow.
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
    return NextResponse.redirect(new URL('/dashboard/connections?error=oauth_denied', req.url));
  }

  try {
    // Exchange code for token
    const tokenRes = await fetch('https://graph.facebook.com/v19.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/social/meta/callback`,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error.message);

    // Get long-lived token
    const longRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`,
    );
    const longData = await longRes.json();
    const accessToken = longData.access_token || tokenData.access_token;

    // Get Instagram business account
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account,name&access_token=${accessToken}`,
    );
    const pagesData = await pagesRes.json();
    const page = pagesData.data?.[0];
    const igAccountId = page?.instagram_business_account?.id;

    const userId = (session.user as any).id;

    // Save Instagram account
    if (igAccountId) {
      const igRes = await fetch(
        `https://graph.facebook.com/v19.0/${igAccountId}?fields=username&access_token=${accessToken}`,
      );
      const igData = await igRes.json();

      await prisma.socialAccount.upsert({
        where: { userId_provider: { userId, provider: 'META_INSTAGRAM' } },
        update: {
          accessTokenEncrypted: await encryptToken(accessToken),
          providerAccountId: igAccountId,
          providerUsername: igData.username,
          status: 'ACTIVE',
          tokenExpiresAt: new Date(Date.now() + 5184000000), // ~60 days
        },
        create: {
          userId,
          provider: 'META_INSTAGRAM',
          accessTokenEncrypted: await encryptToken(accessToken),
          providerAccountId: igAccountId,
          providerUsername: igData.username,
          scopes: ['instagram_basic', 'instagram_content_publish'],
          status: 'ACTIVE',
          tokenExpiresAt: new Date(Date.now() + 5184000000),
        },
      });
    }

    // Save Facebook page account
    if (page) {
      await prisma.socialAccount.upsert({
        where: { userId_provider: { userId, provider: 'META_FACEBOOK' } },
        update: {
          accessTokenEncrypted: await encryptToken(accessToken),
          providerAccountId: page.id,
          providerUsername: page.name,
          status: 'ACTIVE',
          tokenExpiresAt: new Date(Date.now() + 5184000000),
        },
        create: {
          userId,
          provider: 'META_FACEBOOK',
          accessTokenEncrypted: await encryptToken(accessToken),
          providerAccountId: page.id,
          providerUsername: page.name,
          scopes: ['pages_manage_posts', 'pages_read_engagement'],
          status: 'ACTIVE',
          tokenExpiresAt: new Date(Date.now() + 5184000000),
        },
      });
    }

    return NextResponse.redirect(new URL('/dashboard/connections?success=meta', req.url));
  } catch (error: any) {
    console.error('Meta OAuth error:', error);
    return NextResponse.redirect(
      new URL(`/dashboard/connections?error=${encodeURIComponent(error.message)}`, req.url),
    );
  }
}
