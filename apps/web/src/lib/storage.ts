/**
 * S3-compatible storage provider.
 * Works with AWS S3, MinIO, Cloudflare R2, etc.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageProvider } from '@kaizen/shared';

const s3 = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: !!process.env.S3_ENDPOINT, // needed for MinIO
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.S3_SECRET_KEY || '',
  },
});

const BUCKET = process.env.S3_BUCKET || 'kaizen-ai-assets';

export const storage: StorageProvider = {
  async upload({ key, body, contentType }) {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body as any,
        ContentType: contentType,
      }),
    );

    const baseUrl = process.env.S3_ENDPOINT
      ? `${process.env.S3_ENDPOINT}/${BUCKET}`
      : `https://${BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com`;

    return { url: `${baseUrl}/${key}`, key };
  },

  async getSignedUrl(key, expiresIn = 3600) {
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    return awsGetSignedUrl(s3, command, { expiresIn });
  },

  async delete(key) {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  },
};

export default storage;
