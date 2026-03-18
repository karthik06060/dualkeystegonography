// AES-256-GCM encryption utilities using Web Crypto API

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const TAG_LENGTH = 128;

function getSubtle(): SubtleCrypto {
  if (!crypto?.subtle) {
    throw new Error('Web Crypto API is not available. Ensure you are using HTTPS.');
  }
  return crypto.subtle;
}

// Derive a 256-bit key from PIN using PBKDF2
async function deriveKeyFromPin(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = getSubtle();
  const encoder = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

// Generate a random 256-bit key and return as base64
export function generateRandomKey(): string {
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...keyBytes));
}

// Generate a random PRNG seed for latent positions
export function generatePRNGSeed(): string {
  const seedBytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...seedBytes));
}

// Encrypt message with AES-256-GCM
export async function encryptAES(message: string, keyBase64: string): Promise<string> {
  const subtle = getSubtle();
  const encoder = new TextEncoder();
  const keyBytes = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
  
  const cryptoKey = await subtle.importKey(
    'raw',
    keyBytes.buffer as ArrayBuffer,
    { name: ALGORITHM },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await subtle.encrypt(
    { name: ALGORITHM, iv: iv.buffer as ArrayBuffer, tagLength: TAG_LENGTH },
    cryptoKey,
    encoder.encode(message)
  );

  // Combine IV + ciphertext (includes auth tag)
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

// Decrypt message with AES-256-GCM
export async function decryptAES(encryptedBase64: string, keyBase64: string): Promise<string> {
  const subtle = getSubtle();
  const decoder = new TextDecoder();
  const keyBytes = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
  const encryptedBytes = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

  const cryptoKey = await subtle.importKey(
    'raw',
    keyBytes.buffer as ArrayBuffer,
    { name: ALGORITHM },
    false,
    ['decrypt']
  );

  const iv = encryptedBytes.slice(0, IV_LENGTH);
  const ciphertext = encryptedBytes.slice(IV_LENGTH);

  const plaintext = await subtle.decrypt(
    { name: ALGORITHM, iv: iv.buffer as ArrayBuffer, tagLength: TAG_LENGTH },
    cryptoKey,
    ciphertext.buffer as ArrayBuffer
  );

  return decoder.decode(plaintext);
}

// Encrypt key bundle with PIN
export async function encryptKeyBundleWithPin(
  key1: string,
  key2: string,
  pin: string
): Promise<string> {
  const subtle = getSubtle();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derivedKey = await deriveKeyFromPin(pin, salt);

  const encoder = new TextEncoder();
  const bundle = JSON.stringify({ key1, key2 });
  
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await subtle.encrypt(
    { name: ALGORITHM, iv: iv.buffer as ArrayBuffer, tagLength: TAG_LENGTH },
    derivedKey,
    encoder.encode(bundle)
  );

  // Combine salt + IV + ciphertext
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

// Decrypt key bundle with PIN
export async function decryptKeyBundleWithPin(
  encryptedBundle: string,
  pin: string
): Promise<{ key1: string; key2: string }> {
  const subtle = getSubtle();
  const encryptedBytes = Uint8Array.from(atob(encryptedBundle), c => c.charCodeAt(0));

  const salt = encryptedBytes.slice(0, 16);
  const iv = encryptedBytes.slice(16, 16 + IV_LENGTH);
  const ciphertext = encryptedBytes.slice(16 + IV_LENGTH);

  const derivedKey = await deriveKeyFromPin(pin, salt);

  const plaintext = await subtle.decrypt(
    { name: ALGORITHM, iv: iv.buffer as ArrayBuffer, tagLength: TAG_LENGTH },
    derivedKey,
    ciphertext.buffer as ArrayBuffer
  );

  const decoder = new TextDecoder();
  const bundle = JSON.parse(decoder.decode(plaintext));
  
  return { key1: bundle.key1, key2: bundle.key2 };
}

// Securely clear sensitive data from memory
export function clearSensitiveData(...arrays: (Uint8Array | string)[]): void {
  arrays.forEach(arr => {
    if (arr instanceof Uint8Array) {
      arr.fill(0);
    }
  });
}

// Validate PIN is exactly 12 characters
export function validatePin(pin: string): boolean {
  return pin.length === 12;
}
