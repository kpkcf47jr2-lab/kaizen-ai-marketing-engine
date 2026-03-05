/**
 * Token Vault — Encrypts/decrypts OAuth tokens using AES-256-GCM.
 * Uses the shared crypto module with ENCRYPTION_KEY from env.
 */

import { encrypt, decrypt } from '@kaizen/shared';

function getKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-char hex string (32 bytes)');
  }
  return key;
}

export async function encryptToken(plaintext: string): Promise<string> {
  return encrypt(plaintext, getKey());
}

export async function decryptToken(ciphertext: string): Promise<string> {
  return decrypt(ciphertext, getKey());
}
