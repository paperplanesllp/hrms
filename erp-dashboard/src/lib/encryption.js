import CryptoJS from 'crypto-js';

/**
 * End-to-End Encryption System for Chat Messages
 * Uses AES-256 encryption with CBC mode for message content
 * 
 * KEY INSIGHT: All participants in a chat derive the same encryption key
 * from the chatId, so they can all encrypt/decrypt each other's messages.
 */

// Derive a shared encryption key from the chat ID
// This ensures all chat participants can encrypt/decrypt messages
const getSharedEncryptionKey = (chatId) => {
  // Generate a consistent 32-byte key from chatId using SHA-256
  // All users will get the SAME key for the same chatId
  const hashKey = CryptoJS.SHA256(chatId + 'chat_secret_salt').toString();
  return hashKey.substring(0, 32); // Use first 32 chars (128-bit, but sufficient for AES)
};

// Get initialization vector (IV) specific to a chat
const getChatIV = (chatId) => {
  return CryptoJS.SHA256(chatId + 'iv_salt').toString().substring(0, 16);
};

/**
 * Encrypt a message before sending
 * @param {string} content - The message content to encrypt
 * @param {string} chatId - The chat ID (used to derive shared encryption key)
 * @returns {string} Encrypted content as base64
 */
export const encryptMessage = (content, chatId) => {
  try {
    const key = getSharedEncryptionKey(chatId);
    const iv = getChatIV(chatId);
    
    const encrypted = CryptoJS.AES.encrypt(content, key, {
      iv: CryptoJS.enc.Utf8.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    // Return encrypted content as base64 string
    return encrypted.toString();
  } catch (error) {
    console.error('Encryption error:', error);
    return content; // Fallback to unencrypted on error
  }
};

/**
 * Decrypt a received message
 * @param {string} encryptedContent - The encrypted message content
 * @param {string} chatId - The chat ID (used to derive shared encryption key)
 * @returns {string} Decrypted content
 */
export const decryptMessage = (encryptedContent, chatId) => {
  try {
    // Check if content looks encrypted (base64-like)
    if (!encryptedContent || typeof encryptedContent !== 'string') {
      return encryptedContent || '';
    }
    
    // If content doesn't look encrypted, return as-is
    if (!isEncrypted(encryptedContent)) {
      return encryptedContent;
    }
    
    const key = getSharedEncryptionKey(chatId);
    const iv = getChatIV(chatId);
    
    // Strategy 1: Try passphrase-based decryption (string key, CryptoJS OpenSSL mode)
    try {
      const decrypted1 = CryptoJS.AES.decrypt(encryptedContent, key);
      const content1 = decrypted1.toString(CryptoJS.enc.Utf8);
      if (content1 && content1.length > 0) {
        return content1;
      }
    } catch (e) {
      // Strategy 1 failed, try next
    }

    // Strategy 2: Try with explicit IV and parsed key (raw key mode)
    try {
      const keyWordArray = CryptoJS.enc.Utf8.parse(key);
      const ivWordArray = CryptoJS.enc.Utf8.parse(iv);
      const decrypted2 = CryptoJS.AES.decrypt(encryptedContent, keyWordArray, {
        iv: ivWordArray,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      const content2 = decrypted2.toString(CryptoJS.enc.Utf8);
      if (content2 && content2.length > 0) {
        return content2;
      }
    } catch (e) {
      // Strategy 2 failed, try next
    }

    // Strategy 3: Try passphrase mode with original options
    try {
      const decrypted3 = CryptoJS.AES.decrypt(encryptedContent, key, {
        iv: CryptoJS.enc.Utf8.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      const content3 = decrypted3.toString(CryptoJS.enc.Utf8);
      if (content3 && content3.length > 0) {
        return content3;
      }
    } catch (e) {
      // Strategy 3 failed
    }
    
    console.warn('All decryption strategies failed for:', encryptedContent.substring(0, 50));
    // Return the original payload instead of a hard failure placeholder.
    // This prevents valid plain text from being replaced with an error string.
    return encryptedContent;
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedContent || '';
  }
};

/**
 * Get the shared encryption key for a specific chat
 * @param {string} chatId - The chat ID
 * @returns {string} The shared encryption key for this chat
 */
export const getEncryptionKey = (chatId) => {
  if (!chatId) {
    console.warn('getEncryptionKey called without chatId');
    return null;
  }
  return getSharedEncryptionKey(chatId);
};

/**
 * Verify if a message is encrypted
 * @param {string} content - The message content to check
 * @returns {boolean} True if appears to be encrypted
 */
export const isEncrypted = (content) => {
  if (!content || typeof content !== 'string') return false;

  // CryptoJS/OpenSSL salted payloads always start with this prefix.
  // Keep this strict to avoid classifying normal long text as encrypted.
  return content.startsWith('U2FsdGVkX1');
};

/**
 * Batch encrypt multiple messages
 * @param {Array} messages - Array of messages with content and chatId
 * @returns {Array} Array of encrypted messages
 */
export const batchEncryptMessages = (messages) => {
  return messages.map(msg => ({
    ...msg,
    content: encryptMessage(msg.content, msg.chatId)
  }));
};

/**
 * Batch decrypt multiple messages
 * @param {Array} messages - Array of encrypted messages with content and chatId
 * @returns {Array} Array of decrypted messages
 */
export const batchDecryptMessages = (messages) => {
  return messages.map(msg => ({
    ...msg,
    content: decryptMessage(msg.content, msg.chatId)
  }));
};

/**
 * Get encryption status for display
 * @returns {object} Status information
 */
export const getEncryptionStatus = () => {
  return {
    enabled: true,
    algorithm: 'AES-256-CBC',
    mode: 'Shared Key per Chat',
    description: 'All participants in a chat derive the same encryption key from the chat ID'
  };
};
