/** Production must never substitute demonstration URLs for generated media. */
export function requireRealProviders(names: string[]): void {
  if (names.some(name => name.startsWith('mock'))) {
    throw new Error('KAME_GENERATOR_UNAVAILABLE: no real generation pipeline is configured');
  }
}

/** Legacy generation invokes external models. Native-only is the safe default. */
export function requireLegacyGenerationOptIn(env: Record<string, string | undefined> = process.env): void {
  if (env.KAME_ALLOW_EXTERNAL_MODELS !== '1') {
    throw new Error('KAME_NATIVE_PIPELINE_REQUIRED: legacy external-model generation is disabled');
  }
}

export function requireContentOwner(job: { userId: string; status: string }, userId: string): void {
  if (!userId || job.userId !== userId) throw new Error('KAME_OWNER_MISMATCH');
  if (job.status === 'CANCELLED' || job.status === 'SUCCESS') throw new Error('KAME_JOB_CLOSED');
}

export function requirePublishBinding(
  post: { userId: string; socialAccountId: string; assetId: string | null; provider: string },
  account: { id: string; userId: string; provider: string },
  asset: { id: string; userId: string; url: string },
): void {
  if (post.userId !== account.userId || post.userId !== asset.userId ||
      post.socialAccountId !== account.id || post.assetId !== asset.id || post.provider !== account.provider) {
    throw new Error('KAME_PUBLISH_BINDING_MISMATCH');
  }
  const url = new URL(asset.url);
  if (url.protocol !== 'https:' || url.hostname === 'placeholder.kaizen.ai') throw new Error('KAME_INVALID_MEDIA');
}
