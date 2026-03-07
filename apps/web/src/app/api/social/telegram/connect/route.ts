/**
 * Telegram Connection API — Connects a Telegram bot + channel.
 * No OAuth needed — user provides bot token and channel username.
 * We verify both via Telegram Bot API, then save encrypted.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { encrypt } from '@kaizen/shared';
import { TelegramPublisher } from '@kaizen/shared';

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

    const { botToken, channelId } = await req.json();

    if (!botToken || !channelId) {
      return NextResponse.json(
        { error: 'Se requiere el token del bot y el ID del canal' },
        { status: 400 },
      );
    }

    // Step 1: Verify the bot token
    let botInfo;
    try {
      botInfo = await TelegramPublisher.verifyBot(botToken);
    } catch (err: any) {
      return NextResponse.json(
        { error: `Token de bot inválido: ${err.message}` },
        { status: 400 },
      );
    }

    // Step 2: Verify the bot has access to the channel
    // Channel ID can be @username or numeric ID
    const formattedChannelId = channelId.startsWith('@') ? channelId : channelId;
    let channelInfo;
    try {
      channelInfo = await TelegramPublisher.verifyChannel(botToken, formattedChannelId);
    } catch (err: any) {
      return NextResponse.json(
        { error: `No se puede acceder al canal: ${err.message}. Asegúrate de agregar el bot como administrador del canal.` },
        { status: 400 },
      );
    }

    // Step 3: Encrypt the bot token
    const encKey = process.env.ENCRYPTION_KEY!;
    const encryptedToken = await encrypt(botToken, encKey);

    // Step 4: Upsert SocialAccount
    const socialAccount = await prisma.socialAccount.upsert({
      where: {
        userId_provider: {
          userId,
          provider: 'TELEGRAM',
        },
      },
      create: {
        userId,
        provider: 'TELEGRAM',
        providerAccountId: String(channelInfo.id),
        providerUsername: `@${botInfo.username} → ${channelInfo.title}`,
        accessTokenEncrypted: encryptedToken,
        scopes: ['bot:send_messages', 'bot:send_photos', 'bot:send_documents'],
        status: 'ACTIVE',
        metadata: {
          botId: botInfo.id,
          botUsername: botInfo.username,
          channelTitle: channelInfo.title,
          channelType: channelInfo.type,
          channelId: String(channelInfo.id),
        },
      },
      update: {
        providerAccountId: String(channelInfo.id),
        providerUsername: `@${botInfo.username} → ${channelInfo.title}`,
        accessTokenEncrypted: encryptedToken,
        status: 'ACTIVE',
        metadata: {
          botId: botInfo.id,
          botUsername: botInfo.username,
          channelTitle: channelInfo.title,
          channelType: channelInfo.type,
          channelId: String(channelInfo.id),
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: socialAccount.id,
        provider: 'TELEGRAM',
        botUsername: `@${botInfo.username}`,
        channelTitle: channelInfo.title,
        channelType: channelInfo.type,
      },
    });
  } catch (error: any) {
    console.error('Telegram connect error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al conectar Telegram' },
      { status: 500 },
    );
  }
}
