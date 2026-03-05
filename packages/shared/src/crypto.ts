/**
 * AES-256-GCM encryption/decryption for OAuth tokens and secrets.
 * Works in both Node.js and Edge runtimes.
 */

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;
const TAG_LENGTH = 128;

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getKey(keyHex: string): Promise<CryptoKey> {
  const keyBytes = hexToBytes(keyHex);
  return crypto.subtle.importKey('raw', keyBytes.buffer as ArrayBuffer, { name: ALGORITHM }, false, [
    'encrypt',
    'decrypt',
  ]);
}

/**
 * Encrypt a plaintext string. Returns hex string: iv + ciphertext.
 */
export async function encrypt(plaintext: string, keyHex: string): Promise<string> {
  const key = await getKey(keyHex);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    encoded,
  );

  // Concatenate IV + ciphertext
  const result = new Uint8Array(iv.length + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), iv.length);

  return bytesToHex(result);
}

/**
 * Decrypt a hex string (iv + ciphertext) back to plaintext.
 */
export async function decrypt(ciphertextHex: string, keyHex: string): Promise<string> {
  const key = await getKey(keyHex);
  const data = hexToBytes(ciphertextHex);

  const iv = data.slice(0, IV_LENGTH);
  const ciphertext = data.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    ciphertext,
  );

  return new TextDecoder().decode(decrypted);
}
