/**
 * WhatsApp Connection API — Connects a WhatsApp Business account.
 * Uses Meta Cloud API — user provides permanent token + phone number ID.
 * We verify via Meta Graph API, then save encrypted.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { encrypt } from '@kaizen/shared';
import { WhatsAppPublisher } from '@kaizen/shared';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    const userId = (session.user as any).id as string;
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { accessToken, phoneNumberId, channelId } = await req.json();

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json(
        { error: 'Se requiere el token de acceso y el ID del número de teléfono' },
        { status: 400 },
      );
    }

    // Step 1: Verify the token and phone number
    let phoneInfo;
    try {
      phoneInfo = await WhatsAppPublisher.verifyToken(accessToken, phoneNumberId);
    } catch (err: any) {
      return NextResponse.json(
        { error: `Verificación fallida: ${err.message}` },
        { status: 400 },
      );
    }

    // Step 2: Encrypt the access token
    const encKey = process.env.ENCRYPTION_KEY!;
    const encryptedToken = await encrypt(accessToken, encKey);

    // Step 3: Upsert SocialAccount
    const socialAccount = await prisma.socialAccount.upsert({
      where: {
        userId_provider: {
          userId,
          provider: 'WHATSAPP',
        },
      },
      create: {
        userId,
        provider: 'WHATSAPP',
        providerAccountId: phoneNumberId,
        providerUsername: phoneInfo.displayName || phoneInfo.phoneNumber,
        accessTokenEncrypted: encryptedToken,
        scopes: ['whatsapp_business_messaging'],
        status: 'ACTIVE',
        metadata: {
          phoneNumber: phoneInfo.phoneNumber,
          displayName: phoneInfo.displayName,
          channelId: channelId || null,
        },
      },
      update: {
        providerAccountId: phoneNumberId,
        providerUsername: phoneInfo.displayName || phoneInfo.phoneNumber,
        accessTokenEncrypted: encryptedToken,
        status: 'ACTIVE',
        metadata: {
          phoneNumber: phoneInfo.phoneNumber,
          displayName: phoneInfo.displayName,
          channelId: channelId || null,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: socialAccount.id,
        provider: 'WHATSAPP',
        phoneNumber: phoneInfo.phoneNumber,
        displayName: phoneInfo.displayName,
      },
    });
  } catch (error: any) {
    console.error('WhatsApp connect error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al conectar WhatsApp' },
      { status: 500 },
    );
  }
}
