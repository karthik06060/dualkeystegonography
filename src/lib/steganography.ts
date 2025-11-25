// Steganography utilities using LSB (Least Significant Bit) technique with dual-key encryption

export const encryptWithDualKey = (message: string, key1: string, key2: string): string => {
  // Simple dual-key XOR encryption
  const combinedKey = key1 + key2;
  let encrypted = '';
  
  for (let i = 0; i < message.length; i++) {
    const charCode = message.charCodeAt(i);
    const keyChar = combinedKey.charCodeAt(i % combinedKey.length);
    encrypted += String.fromCharCode(charCode ^ keyChar);
  }
  
  return btoa(encrypted); // Base64 encode
};

export const decryptWithDualKey = (encryptedMessage: string, key1: string, key2: string): string => {
  try {
    const decoded = atob(encryptedMessage); // Base64 decode
    const combinedKey = key1 + key2;
    let decrypted = '';
    
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i);
      const keyChar = combinedKey.charCodeAt(i % combinedKey.length);
      decrypted += String.fromCharCode(charCode ^ keyChar);
    }
    
    return decrypted;
  } catch {
    throw new Error('Decryption failed. Check your keys.');
  }
};

export const encodeMessageInImage = (
  imageData: ImageData,
  message: string,
  key1: string,
  key2: string
): ImageData => {
  const encrypted = encryptWithDualKey(message, key1, key2);
  const messageWithLength = `${encrypted.length}:${encrypted}`;
  const messageBits = stringToBits(messageWithLength);
  
  if (messageBits.length > imageData.data.length) {
    throw new Error('Message too large for this image');
  }
  
  const newImageData = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
  
  // Embed message bits into LSB of image pixels
  for (let i = 0; i < messageBits.length; i++) {
    newImageData.data[i] = (newImageData.data[i] & 0xFE) | messageBits[i];
  }
  
  return newImageData;
};

export const decodeMessageFromImage = (
  imageData: ImageData,
  key1: string,
  key2: string
): string => {
  // Extract bits from LSB
  const bits: number[] = [];
  let length = 0;
  let lengthFound = false;
  let colonIndex = 0;
  
  // First, extract length
  for (let i = 0; i < imageData.data.length && !lengthFound; i++) {
    bits.push(imageData.data[i] & 1);
    
    if (bits.length % 8 === 0) {
      const char = String.fromCharCode(bitsToNumber(bits.slice(-8)));
      if (char === ':') {
        lengthFound = true;
        colonIndex = bits.length;
        const lengthStr = bitsToString(bits.slice(0, -8));
        length = parseInt(lengthStr, 10);
      }
    }
  }
  
  if (!lengthFound) {
    throw new Error('No hidden message found');
  }
  
  // Extract the encrypted message
  const totalBits = colonIndex + (length * 8);
  for (let i = colonIndex / 8; i < Math.ceil(totalBits / 8) * 8 && i < imageData.data.length; i++) {
    if (bits.length < totalBits) {
      bits.push(imageData.data[i] & 1);
    }
  }
  
  const encrypted = bitsToString(bits.slice(colonIndex));
  return decryptWithDualKey(encrypted, key1, key2);
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
    str += String.fromCharCode(byte);
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
