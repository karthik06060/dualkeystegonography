// Steganography utilities using LSB (Least Significant Bit) technique with AES-256-GCM encryption
import { encryptAES, decryptAES } from './crypto';

// Seeded PRNG for deterministic position generation
class SeededPRNG {
  private seed: number;

  constructor(seedString: string) {
    // Convert seed string to number using hash
    this.seed = this.hashString(seedString);
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

  // LCG (Linear Congruential Generator)
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  // Generate array of unique positions
  generatePositions(count: number, maxPosition: number): number[] {
    const positions = new Set<number>();
    while (positions.size < count && positions.size < maxPosition) {
      const pos = Math.floor(this.next() * maxPosition);
      positions.add(pos);
    }
    return Array.from(positions).sort((a, b) => a - b);
  }
}

export const encodeMessageInImage = async (
  imageData: ImageData,
  message: string,
  key1: string, // Encryption key (AES-256-GCM)
  key2: string  // Latent position key (PRNG seed)
): Promise<ImageData> => {
  // Encrypt message with AES-256-GCM
  const encrypted = await encryptAES(message, key1);
  const messageWithLength = `${encrypted.length}:${encrypted}`;
  const messageBits = stringToBits(messageWithLength);

  // Generate deterministic positions using key2 as PRNG seed
  const prng = new SeededPRNG(key2);
  const maxPositions = imageData.data.length;
  
  if (messageBits.length > maxPositions) {
    throw new Error('Message too large for this image');
  }

  const positions = prng.generatePositions(messageBits.length, maxPositions);

  const newImageData = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  // Embed message bits into LSB at deterministic positions
  for (let i = 0; i < messageBits.length; i++) {
    const pos = positions[i];
    newImageData.data[pos] = (newImageData.data[pos] & 0xFE) | messageBits[i];
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

  // First, extract enough bits to find the length prefix
  // We need to read bits until we find the colon separator
  let lengthBits: number[] = [];
  let length = 0;
  let lengthFound = false;
  let bitsRead = 0;
  
  // Generate positions progressively
  const tempPositions = prng.generatePositions(10000, maxPositions); // Start with enough for length
  
  for (let i = 0; i < tempPositions.length && !lengthFound; i++) {
    const pos = tempPositions[i];
    lengthBits.push(imageData.data[pos] & 1);
    bitsRead++;
    
    if (lengthBits.length % 8 === 0) {
      const char = String.fromCharCode(bitsToNumber(lengthBits.slice(-8)));
      if (char === ':') {
        lengthFound = true;
        const lengthStr = bitsToString(lengthBits.slice(0, -8));
        length = parseInt(lengthStr, 10);
      }
    }
  }

  if (!lengthFound || isNaN(length)) {
    throw new Error('No hidden message found');
  }

  // Now generate all positions needed for the full message
  const prng2 = new SeededPRNG(key2);
  const totalBitsNeeded = bitsRead + (length * 8);
  const allPositions = prng2.generatePositions(totalBitsNeeded, maxPositions);

  // Extract all bits at the deterministic positions
  const allBits: number[] = [];
  for (let i = 0; i < allPositions.length; i++) {
    const pos = allPositions[i];
    allBits.push(imageData.data[pos] & 1);
  }

  // Extract the encrypted message (after the length prefix and colon)
  const encrypted = bitsToString(allBits.slice(bitsRead));
  
  // Decrypt with AES-256-GCM
  return await decryptAES(encrypted, key1);
};

const stringToBits = (str: string): number[] => {
  const bits: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const byte = str.charCodeAt(i);
    for (let j = 7; j >= 0; j--) {
      bits.push((byte >> j) & 1);
    }
  }
  return bits;
};

const bitsToString = (bits: number[]): string => {
  let str = '';
  for (let i = 0; i < bits.length; i += 8) {
    const byte = bitsToNumber(bits.slice(i, i + 8));
    if (byte > 0) {
      str += String.fromCharCode(byte);
    }
  }
  return str;
};

const bitsToNumber = (bits: number[]): number => {
  let num = 0;
  for (let i = 0; i < bits.length; i++) {
    num = (num << 1) | bits[i];
  }
  return num;
};
