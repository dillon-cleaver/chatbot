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

import { ERROR_MESSAGES } from "../constants/errorMessages";

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12; // 96 bits recommended for AES-GCM
const DEVICE_ID_KEY = "chatbot-device-id";
const ENCRYPTION_PREFIX = "enc_v1:"; // Marker to identify encrypted values

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
 * @returns Prefixed base64-encoded encrypted data (format: enc_v1:base64data)
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

    let binaryString = "";
    for (let i = 0; i < combined.length; i++) {
      binaryString += String.fromCharCode(combined[i]);
    }
    const base64 = btoa(binaryString);
    return ENCRYPTION_PREFIX + base64;
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error(ERROR_MESSAGES.ENCRYPTION_FAILED);
  }
}

/**
 * Decrypt an encrypted API key
 * @param encrypted - Prefixed base64-encoded encrypted data (format: enc_v1:base64data)
 * @returns Plain text API key
 */
export async function decryptApiKey(encrypted: string): Promise<string> {
  try {
    const key = await deriveKey();

    // Remove encryption prefix if present
    const base64Data = encrypted.startsWith(ENCRYPTION_PREFIX)
      ? encrypted.slice(ENCRYPTION_PREFIX.length)
      : encrypted;

    // Decode from base64
    const combined = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

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
    throw new Error(ERROR_MESSAGES.DECRYPTION_FAILED);
  }
}

/**
 * Check if a string appears to be encrypted (has encryption prefix)
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTION_PREFIX);
}
