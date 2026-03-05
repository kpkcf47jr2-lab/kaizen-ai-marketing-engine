/**
 * Social Publishers — Real implementations for each social platform.
 * Each publisher handles the platform-specific API for video publishing.
 */

import type { SocialPublisher } from './providers';

// ─── Meta Instagram Publisher (real) ─────────────────────

export class MetaInstagramPublisher implements SocialPublisher {
  readonly provider = 'META_INSTAGRAM';

  async publishVideo({ videoUrl, caption, hashtags, accessToken, accountId }: {
    videoUrl: string;
    caption: string;
    hashtags?: string[];
    accessToken: string;
    accountId?: string;
  }) {
    const fullCaption = hashtags?.length
      ? `${caption}\n\n${hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}`
      : caption;

    // Step 1: Create media container
    const containerRes = await fetch(
      `https://graph.facebook.com/v19.0/${accountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_url: videoUrl,
          caption: fullCaption,
          media_type: 'REELS',
          access_token: accessToken,
        }),
      },
    );
    const container = await containerRes.json();
    if (container.error) throw new Error(`Instagram container error: ${container.error.message}`);

    // Step 2: Wait for processing (poll up to 5 min)
    let status = 'IN_PROGRESS';
    let attempts = 0;
    while (status === 'IN_PROGRESS' && attempts < 30) {
      await new Promise((r) => setTimeout(r, 10000));
      const statusRes = await fetch(
        `https://graph.facebook.com/v19.0/${container.id}?fields=status_code&access_token=${accessToken}`,
      );
      const statusData = await statusRes.json();
      status = statusData.status_code;
      attempts++;
    }

    if (status !== 'FINISHED') {
      throw new Error(`Instagram video processing failed: ${status}`);
    }

    // Step 3: Publish
    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${accountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: container.id,
          access_token: accessToken,
        }),
      },
    );
    const published = await publishRes.json();
    if (published.error) throw new Error(`Instagram publish error: ${published.error.message}`);

    return {
      remotePostId: published.id,
      remoteUrl: `https://www.instagram.com/reel/${published.id}`,
    };
  }

  async getMetrics({ remotePostId, accessToken }: { remotePostId: string; accessToken: string }) {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${remotePostId}/insights?metric=plays,likes,comments,shares&access_token=${accessToken}`,
    );
    const data = await res.json();
    const metrics: Record<string, number> = {};
    for (const item of data.data || []) {
      metrics[item.name] = item.values?.[0]?.value ?? 0;
    }
    return { views: metrics.plays, likes: metrics.likes, comments: metrics.comments, shares: metrics.shares };
  }

  async refreshToken(refreshToken: string) {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${refreshToken}`,
    );
    const data = await res.json();
    return { accessToken: data.access_token, expiresAt: new Date(Date.now() + (data.expires_in || 5184000) * 1000) };
  }
}

// ─── TikTok Publisher (Content Posting API v2) ───────────

export class TikTokPublisher implements SocialPublisher {
  readonly provider = 'TIKTOK';

  async publishVideo({ videoUrl, caption, hashtags, accessToken }: {
    videoUrl: string;
    caption: string;
    hashtags?: string[];
    accessToken: string;
    accountId?: string;
  }) {
    const fullCaption = hashtags?.length
      ? `${caption} ${hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}`
      : caption;

    // Step 1: Initialize video upload via URL pull
    const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        post_info: {
          title: fullCaption.slice(0, 150), // TikTok title limit
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_duet: false,
          disable_stitch: false,
          disable_comment: false,
          brand_content_toggle: false,
          brand_organic_toggle: false,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: videoUrl,
        },
      }),
    });

    if (!initRes.ok) {
      const errorText = await initRes.text();
      throw new Error(`TikTok init error (${initRes.status}): ${errorText}`);
    }

    const initData = await initRes.json();
    if (initData.error?.code !== 'ok' && initData.error?.code) {
      throw new Error(`TikTok init error: ${initData.error.message || initData.error.code}`);
    }

    const publishId = initData.data?.publish_id;
    if (!publishId) throw new Error('TikTok did not return a publish_id');

    // Step 2: Poll for publish status (up to 5 min)
    let status = 'PROCESSING_UPLOAD';
    let attempts = 0;
    let publishData: any = {};

    while (['PROCESSING_UPLOAD', 'PROCESSING_DOWNLOAD', 'SENDING_TO_USER_INBOX'].includes(status) && attempts < 30) {
      await new Promise((r) => setTimeout(r, 10000));

      const statusRes = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({ publish_id: publishId }),
      });

      publishData = await statusRes.json();
      status = publishData.data?.status || 'FAILED';
      attempts++;
    }

    if (status === 'PUBLISH_COMPLETE') {
      return {
        remotePostId: publishId,
        remoteUrl: `https://www.tiktok.com/@user/video/${publishId}`,
      };
    }

    throw new Error(`TikTok publishing failed with status: ${status}`);
  }

  async getMetrics({ remotePostId, accessToken }: { remotePostId: string; accessToken: string }) {
    const res = await fetch(
      `https://open.tiktokapis.com/v2/video/query/?fields=like_count,comment_count,share_count,view_count`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filters: { video_ids: [remotePostId] } }),
      },
    );

    const data = await res.json();
    const video = data.data?.videos?.[0];
    return {
      views: video?.view_count,
      likes: video?.like_count,
      comments: video?.comment_count,
      shares: video?.share_count,
    };
  }

  async refreshToken(refreshToken: string) {
    const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY || '',
        client_secret: process.env.TIKTOK_CLIENT_SECRET || '',
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });
    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + (data.expires_in || 86400) * 1000),
    };
  }
}

// ─── YouTube Publisher (Data API v3) ─────────────────────

export class YouTubePublisher implements SocialPublisher {
  readonly provider = 'YOUTUBE';

  async publishVideo({ videoUrl, caption, hashtags, accessToken }: {
    videoUrl: string;
    caption: string;
    hashtags?: string[];
    accessToken: string;
    accountId?: string;
  }) {
    const hashtagStr = hashtags?.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ') || '';
    const description = `${caption}\n\n${hashtagStr}`.trim();
    const tags = hashtags?.map((h) => h.replace('#', '')) || [];
    // Extract title from first line or use caption
    const title = caption.split('\n')[0].slice(0, 100);

    // Step 1: Download the video from our storage
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error('Failed to download video for YouTube upload');
    const videoBuffer = await videoRes.arrayBuffer();

    // Step 2: Initiate resumable upload
    const initRes = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Length': String(videoBuffer.byteLength),
          'X-Upload-Content-Type': 'video/mp4',
        },
        body: JSON.stringify({
          snippet: {
            title,
            description,
            tags,
            categoryId: '22', // People & Blogs
          },
          status: {
            privacyStatus: 'public',
            selfDeclaredMadeForKids: false,
            publishAt: undefined, // Publish immediately
          },
        }),
      },
    );

    if (!initRes.ok) {
      const errorText = await initRes.text();
      throw new Error(`YouTube init upload error (${initRes.status}): ${errorText}`);
    }

    const uploadUrl = initRes.headers.get('Location');
    if (!uploadUrl) throw new Error('YouTube did not return upload URL');

    // Step 3: Upload video data
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': String(videoBuffer.byteLength),
        'Content-Type': 'video/mp4',
      },
      body: videoBuffer,
    });

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      throw new Error(`YouTube upload error (${uploadRes.status}): ${errorText}`);
    }

    const videoData = await uploadRes.json();
    const videoId = videoData.id;

    return {
      remotePostId: videoId,
      remoteUrl: `https://youtube.com/shorts/${videoId}`,
    };
  }

  async getMetrics({ remotePostId, accessToken }: { remotePostId: string; accessToken: string }) {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${remotePostId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const data = await res.json();
    const stats = data.items?.[0]?.statistics;
    return {
      views: stats?.viewCount ? Number(stats.viewCount) : undefined,
      likes: stats?.likeCount ? Number(stats.likeCount) : undefined,
      comments: stats?.commentCount ? Number(stats.commentCount) : undefined,
      shares: undefined, // YouTube API doesn't expose share count
    };
  }

  async refreshToken(refreshToken: string) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const data = await res.json();
    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
    };
  }
}

// ─── X (Twitter) Publisher (API v2 + Media Upload v1.1) ──

export class XTwitterPublisher implements SocialPublisher {
  readonly provider = 'X_TWITTER';

  async publishVideo({ videoUrl, caption, hashtags, accessToken }: {
    videoUrl: string;
    caption: string;
    hashtags?: string[];
    accessToken: string;
    accountId?: string;
  }) {
    const hashtagStr = hashtags?.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ') || '';
    const tweetText = `${caption}\n\n${hashtagStr}`.trim().slice(0, 280); // Twitter character limit

    // Step 1: Download video for upload
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error('Failed to download video for X upload');
    const videoBuffer = await videoRes.arrayBuffer();
    const videoBytes = new Uint8Array(videoBuffer);

    // Step 2: INIT media upload
    const initRes = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        command: 'INIT',
        total_bytes: String(videoBytes.byteLength),
        media_type: 'video/mp4',
        media_category: 'tweet_video',
      }),
    });

    if (!initRes.ok) {
      const errorText = await initRes.text();
      throw new Error(`X media INIT error (${initRes.status}): ${errorText}`);
    }
    const initData = await initRes.json();
    const mediaId = initData.media_id_string;

    // Step 3: APPEND media data in chunks (5MB each)
    const CHUNK_SIZE = 5 * 1024 * 1024;
    let segmentIndex = 0;

    for (let offset = 0; offset < videoBytes.byteLength; offset += CHUNK_SIZE) {
      const chunk = videoBytes.slice(offset, offset + CHUNK_SIZE);
      const base64Chunk = Buffer.from(chunk).toString('base64');

      const appendRes = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          command: 'APPEND',
          media_id: mediaId,
          segment_index: String(segmentIndex),
          media_data: base64Chunk,
        }),
      });

      if (!appendRes.ok) {
        throw new Error(`X media APPEND error (${appendRes.status})`);
      }
      segmentIndex++;
    }

    // Step 4: FINALIZE
    const finalizeRes = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        command: 'FINALIZE',
        media_id: mediaId,
      }),
    });

    if (!finalizeRes.ok) {
      const errorText = await finalizeRes.text();
      throw new Error(`X media FINALIZE error (${finalizeRes.status}): ${errorText}`);
    }
    const finalizeData = await finalizeRes.json();

    // Step 5: Check processing status (poll if needed)
    if (finalizeData.processing_info) {
      let processing = finalizeData.processing_info;
      while (processing?.state === 'pending' || processing?.state === 'in_progress') {
        const waitMs = (processing.check_after_secs || 5) * 1000;
        await new Promise((r) => setTimeout(r, waitMs));

        const statusRes = await fetch(
          `https://upload.twitter.com/1.1/media/upload.json?command=STATUS&media_id=${mediaId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const statusData = await statusRes.json();
        processing = statusData.processing_info;
      }

      if (processing?.state === 'failed') {
        throw new Error(`X video processing failed: ${processing?.error?.message || 'unknown'}`);
      }
    }

    // Step 6: Create tweet with media
    const tweetRes = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: tweetText,
        media: { media_ids: [mediaId] },
      }),
    });

    if (!tweetRes.ok) {
      const errorText = await tweetRes.text();
      throw new Error(`X tweet create error (${tweetRes.status}): ${errorText}`);
    }

    const tweetData = await tweetRes.json();
    const tweetId = tweetData.data?.id;

    return {
      remotePostId: tweetId,
      remoteUrl: `https://x.com/i/status/${tweetId}`,
    };
  }

  async getMetrics({ remotePostId, accessToken }: { remotePostId: string; accessToken: string }) {
    const res = await fetch(
      `https://api.twitter.com/2/tweets/${remotePostId}?tweet.fields=public_metrics`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const data = await res.json();
    const metrics = data.data?.public_metrics;
    return {
      views: metrics?.impression_count,
      likes: metrics?.like_count,
      comments: metrics?.reply_count,
      shares: metrics?.retweet_count,
    };
  }

  async refreshToken(refreshToken: string) {
    const res = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`,
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        client_id: process.env.X_CLIENT_ID || '',
      }),
    });
    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + (data.expires_in || 7200) * 1000),
    };
  }
}

// ─── Publisher Registry ──────────────────────────────────

// ─── Elite Social Publisher ──────────────────────────────

export class ElitePublisher implements SocialPublisher {
  readonly provider = 'ELITE';

  private get baseUrl() {
    return process.env.ELITE_API_URL || 'https://api.elite-777.com/api/v1';
  }

  /**
   * Publish a video to Elite.
   * Flow: 1) Upload media via /api/v1/media/upload
   *       2) Create reel via /api/v1/reels with the media URL
   * Auth: X-API-Key header with elk_live_xxx key
   */
  async publishVideo(params: {
    videoUrl: string;
    caption?: string;
    hashtags?: string[];
    accessToken: string; // This is the elk_live_xxx API key
    accountId?: string;
  }): Promise<{ remotePostId: string; remoteUrl?: string }> {
    const apiKey = params.accessToken; // In Elite, we store the API key as accessToken

    // Step 1: Upload the video via media/upload
    const uploadRes = await fetch(`${this.baseUrl}/media/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: params.videoUrl,
        type: 'video',
      }),
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(`Elite media upload failed (${uploadRes.status}): ${err}`);
    }

    const uploadData = await uploadRes.json();
    const mediaId = uploadData.id || uploadData.media_id;

    // Step 2: Create a reel with the uploaded media
    const reelRes = await fetch(`${this.baseUrl}/reels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        media_id: mediaId,
        caption: params.caption || '',
        hashtags: params.hashtags || [],
      }),
    });

    if (!reelRes.ok) {
      const err = await reelRes.text();
      throw new Error(`Elite reel creation failed (${reelRes.status}): ${err}`);
    }

    const reelData = await reelRes.json();
    const postId = reelData.id || reelData.post_id || reelData.reel_id;
    return {
      remotePostId: postId,
      remoteUrl: reelData.url || `https://elite-777.com/reel/${postId}`,
    };
  }

  /**
   * Refresh Elite OAuth token via their token endpoint.
   */
  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }> {
    // Refresh via Elite OAuth token endpoint
    const res = await fetch('https://api.elite-777.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.ELITE_CLIENT_ID || '',
        client_secret: process.env.ELITE_CLIENT_SECRET || '',
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || 'Elite token refresh failed');
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + (data.expires_in || 86400) * 1000),
    };
  }

  async getMetrics(params: {
    remotePostId: string;
    accessToken: string;
  }): Promise<{ views?: number; likes?: number; comments?: number; shares?: number }> {
    const res = await fetch(`${this.baseUrl}/posts/${params.remotePostId}`, {
      headers: { Authorization: `Bearer ${params.accessToken}` },
    });
    if (!res.ok) return {};
    const data = await res.json();
    return {
      views: data.views ?? data.view_count,
      likes: data.likes ?? data.like_count,
      comments: data.comments ?? data.comment_count,
      shares: data.shares ?? data.share_count,
    };
  }
}

// ─── Publisher Registry ──────────────────────────────────

export function getPublisher(provider: string): SocialPublisher {
  switch (provider) {
    case 'ELITE':
      return new ElitePublisher();
    case 'META_INSTAGRAM':
      return new MetaInstagramPublisher();
    case 'META_FACEBOOK':
      return new MetaInstagramPublisher(); // Facebook Reels uses same API
    case 'TIKTOK':
      return new TikTokPublisher();
    case 'YOUTUBE':
      return new YouTubePublisher();
    case 'X_TWITTER':
      return new XTwitterPublisher();
    default:
      throw new Error(`No publisher available for provider: ${provider}`);
  }
}
