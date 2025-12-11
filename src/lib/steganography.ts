// Steganography utilities using LSB (Least Significant Bit) technique with AES-256-GCM encryption
import { encryptAES, decryptAES } from './crypto';

// Magic header to identify encoded images
const MAGIC_HEADER = 'STEG';

// Seeded PRNG for deterministic position generation
class SeededPRNG {
  private seed: number;
  private initialSeed: number;

  constructor(seedString: string) {
    // Convert seed string to number using hash
    this.seed = this.hashString(seedString);
    this.initialSeed = this.seed;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) || 1;
  }

  // Reset PRNG to initial state
  reset(): void {
    this.seed = this.initialSeed;
  }

  // LCG (Linear Congruential Generator)
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  // Generate array of unique positions in deterministic order
  generatePositions(count: number, maxPosition: number): number[] {
    const positions: number[] = [];
    const used = new Set<number>();
    
    while (positions.length < count && positions.length < maxPosition) {
      const pos = Math.floor(this.next() * maxPosition);
      if (!used.has(pos)) {
        used.add(pos);
        positions.push(pos);
      }
    }
    return positions;
  }
}

// Convert string to bytes (UTF-8)
const stringToBytes = (str: string): Uint8Array => {
  return new TextEncoder().encode(str);
};

// Convert bytes to string (UTF-8)
const bytesToString = (bytes: Uint8Array): string => {
  return new TextDecoder().decode(bytes);
};

// Convert bytes to bits
const bytesToBits = (bytes: Uint8Array): number[] => {
  const bits: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    for (let j = 7; j >= 0; j--) {
      bits.push((bytes[i] >> j) & 1);
    }
  }
  return bits;
};

// Convert bits to bytes
const bitsToBytes = (bits: number[]): Uint8Array => {
  const bytes = new Uint8Array(Math.ceil(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      const bitIndex = i * 8 + j;
      if (bitIndex < bits.length) {
        byte = (byte << 1) | bits[bitIndex];
      } else {
        byte = byte << 1;
      }
    }
    bytes[i] = byte;
  }
  return bytes;
};

export const encodeMessageInImage = async (
  imageData: ImageData,
  message: string,
  key1: string, // Encryption key (AES-256-GCM)
  key2: string  // Latent position key (PRNG seed)
): Promise<ImageData> => {
  // Encrypt message with AES-256-GCM
  const encrypted = await encryptAES(message, key1);
  const encryptedBytes = stringToBytes(encrypted);
  
  // Create payload: MAGIC(4) + LENGTH(4) + DATA
  const payloadLength = encryptedBytes.length;
  const header = new Uint8Array(8);
  
  // Write magic header
  const magicBytes = stringToBytes(MAGIC_HEADER);
  header.set(magicBytes, 0);
  
  // Write length as 4 bytes (big-endian)
  header[4] = (payloadLength >> 24) & 0xff;
  header[5] = (payloadLength >> 16) & 0xff;
  header[6] = (payloadLength >> 8) & 0xff;
  header[7] = payloadLength & 0xff;
  
  // Combine header + encrypted data
  const fullPayload = new Uint8Array(header.length + encryptedBytes.length);
  fullPayload.set(header, 0);
  fullPayload.set(encryptedBytes, header.length);
  
  const payloadBits = bytesToBits(fullPayload);

  // Generate deterministic positions using key2 as PRNG seed
  const prng = new SeededPRNG(key2);
  const maxPositions = imageData.data.length;
  
  if (payloadBits.length > maxPositions) {
    throw new Error('Message too large for this image');
  }

  const positions = prng.generatePositions(payloadBits.length, maxPositions);

  const newImageData = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  // Embed payload bits into LSB at deterministic positions
  for (let i = 0; i < payloadBits.length; i++) {
    const pos = positions[i];
    newImageData.data[pos] = (newImageData.data[pos] & 0xFE) | payloadBits[i];
  }

  return newImageData;
};

export const decodeMessageFromImage = async (
  imageData: ImageData,
  key1: string, // Encryption key (AES-256-GCM)
  key2: string  // Latent position key (PRNG seed)
): Promise<string> => {
  const prng = new SeededPRNG(key2);
  const maxPositions = imageData.data.length;

  // First read header (8 bytes = 64 bits)
  const headerBits = 64;
  const headerPositions = prng.generatePositions(headerBits, maxPositions);
  
  const extractedHeaderBits: number[] = [];
  for (let i = 0; i < headerPositions.length; i++) {
    const pos = headerPositions[i];
    extractedHeaderBits.push(imageData.data[pos] & 1);
  }
  
  const headerBytes = bitsToBytes(extractedHeaderBits);
  
  // Verify magic header
  const magic = bytesToString(headerBytes.slice(0, 4));
  if (magic !== MAGIC_HEADER) {
    throw new Error('No hidden message found - invalid header');
  }
  
  // Read length (4 bytes big-endian)
  const length = (headerBytes[4] << 24) | (headerBytes[5] << 16) | (headerBytes[6] << 8) | headerBytes[7];
  
  if (length <= 0 || length > maxPositions / 8) {
    throw new Error('Invalid message length');
  }

  // Reset PRNG and generate all positions needed
  prng.reset();
  const totalBitsNeeded = headerBits + (length * 8);
  const allPositions = prng.generatePositions(totalBitsNeeded, maxPositions);

  // Extract all bits at the deterministic positions
  const allBits: number[] = [];
  for (let i = 0; i < allPositions.length; i++) {
    const pos = allPositions[i];
    allBits.push(imageData.data[pos] & 1);
  }

  // Extract encrypted data (skip header)
  const dataBits = allBits.slice(headerBits);
  const encryptedBytes = bitsToBytes(dataBits);
  const encrypted = bytesToString(encryptedBytes.slice(0, length));
  
  // Decrypt with AES-256-GCM
  return await decryptAES(encrypted, key1);
};
