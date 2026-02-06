/**
 * API Key Encryption Utilities
 *
 * Uses Web Crypto API (AES-GCM) to encrypt API keys before storing in localStorage.
 * Encryption key is derived from a stable device ID stored in localStorage.
 *
 * IMPORTANT: This provides limited security against sophisticated attacks.
 * Browser-based encryption cannot fully protect against XSS or compromised extensions.
 * For sensitive use cases, use server mode where keys never leave the server.
 */

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12; // 96 bits recommended for AES-GCM
const DEVICE_ID_KEY = "chatbot-device-id";

/**
 * Get or create a stable device ID for this browser
 * This ID persists across sessions and doesn't change with window size/zoom
 */
function getStableDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    // Generate a new stable ID using crypto.randomUUID()
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

/**
 * Generate a device fingerprint for key derivation
 * Uses stable device ID + browser fingerprint that doesn't change with window size
 */
function getDeviceFingerprint(): string {
  const stableId = getStableDeviceId();
  const browserFingerprint = navigator.userAgent;
  return `${stableId}|${browserFingerprint}`;
}

/**
 * Derive an encryption key from device fingerprint
 */
async function deriveKey(): Promise<CryptoKey> {
  const fingerprint = getDeviceFingerprint();

  // Hash the fingerprint to get consistent key material
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprint);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  // Import as AES key
  return crypto.subtle.importKey(
    "raw",
    hashBuffer,
    { name: ALGORITHM },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt an API key
 * @param apiKey - Plain text API key
 * @returns Base64-encoded encrypted data (format: iv:ciphertext)
 */
export async function encryptApiKey(apiKey: string): Promise<string> {
  try {
    const key = await deriveKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Encrypt
    const ciphertext = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );

    // Combine IV and ciphertext, encode as base64
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("Failed to encrypt API key");
  }
}

/**
 * Decrypt an encrypted API key
 * @param encrypted - Base64-encoded encrypted data
 * @returns Plain text API key
 */
export async function decryptApiKey(encrypted: string): Promise<string> {
  try {
    const key = await deriveKey();

    // Decode from base64
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));

    // Extract IV and ciphertext
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt API key");
  }
}

/**
 * Check if a string appears to be encrypted (base64 format)
 */
export function isEncrypted(value: string): boolean {
  // Encrypted values are base64 and should be longer than typical API keys
  // Also check if it's valid base64
  try {
    return value.length > 100 && /^[A-Za-z0-9+/]+=*$/.test(value);
  } catch {
    return false;
  }
}
