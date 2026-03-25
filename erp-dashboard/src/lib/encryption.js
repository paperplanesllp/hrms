import CryptoJS from 'crypto-js';

/**
 * End-to-End Encryption System for Chat Messages
 * Uses AES-256 encryption with CBC mode for message content
 */

// Generate or retrieve encryption key from localStorage
const getOrCreateEncryptionKey = () => {
  let key = localStorage.getItem('chat_encryption_key');
  
  if (!key) {
    // Generate a random 32-character key (256-bit for AES-256)
    key = CryptoJS.lib.WordArray.random(32).toString();
    localStorage.setItem('chat_encryption_key', key);
  }
  
  return key;
};

// Get initialization vector (IV) specific to a chat
const getChatIV = (chatId) => {
  return CryptoJS.SHA256(chatId).toString().substring(0, 16);
};

/**
 * Encrypt a message before sending
 * @param {string} content - The message content to encrypt
 * @param {string} chatId - The chat ID (used to derive IV)
 * @returns {string} Encrypted content as base64
 */
export const encryptMessage = (content, chatId) => {
  try {
    const key = getOrCreateEncryptionKey();
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
 * @param {string} chatId - The chat ID (used to derive IV)
 * @returns {string} Decrypted content
 */
export const decryptMessage = (encryptedContent, chatId) => {
  try {
    // Check if content looks encrypted (base64-like)
    if (!encryptedContent || typeof encryptedContent !== 'string') {
      return encryptedContent;
    }
    
    // If content doesn't look encrypted, return as-is
    if (!isEncrypted(encryptedContent)) {
      return encryptedContent;
    }
    
    const key = getOrCreateEncryptionKey();
    const iv = getChatIV(chatId);
    
    const decrypted = CryptoJS.AES.decrypt(encryptedContent, key, {
      iv: CryptoJS.enc.Utf8.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    // Convert from UTF-8 bytes to string
    const content = decrypted.toString(CryptoJS.enc.Utf8);
    
    // If decryption produced empty string, return original (decryption failed)
    if (!content || content.length === 0) {
      console.warn('Decryption resulted in empty string for encrypted content:', encryptedContent.substring(0, 50));
      return encryptedContent;
    }
    
    return content;
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedContent; // Fallback to encrypted content on error
  }
};

/**
 * Get the encryption key (for backup/sharing purposes)
 * @returns {string} The encryption key
 */
export const getEncryptionKey = () => {
  return getOrCreateEncryptionKey();
};

/**
 * Verify if a message is encrypted
 * @param {string} content - The message content to check
 * @returns {boolean} True if appears to be encrypted
 */
export const isEncrypted = (content) => {
  if (!content || typeof content !== 'string') return false;
  
  // Check for AES encryption header (CryptoJS adds "U2FsdGVkX1" to encrypted strings)
  // Also check if it looks like base64 encoded encrypted content
  const hasEncryptionHeader = content.includes('U2FsdGVkX1');
  const looksLikeBase64 = /^[A-Za-z0-9+/]+=*$/.test(content);
  const isLongEnough = content.length > 30;
  
  return hasEncryptionHeader || (looksLikeBase64 && isLongEnough);
};

/**
 * Set a custom encryption key (for multi-device support)
 * @param {string} key - The encryption key to set
 */
export const setEncryptionKey = (key) => {
  if (key && typeof key === 'string' && key.length > 0) {
    localStorage.setItem('chat_encryption_key', key);
  }
};

/**
 * Clear encryption key and generate new one
 * WARNING: This will make previously encrypted messages unreadable
 */
export const resetEncryptionKey = () => {
  localStorage.removeItem('chat_encryption_key');
  getOrCreateEncryptionKey(); // Generate new one
};

/**
 * Export encryption key for backup (user should store this safely)
 * @returns {string} The encryption key for backup
 */
export const exportEncryptionKey = () => {
  return getOrCreateEncryptionKey();
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
  const key = getOrCreateEncryptionKey();
  return {
    enabled: true,
    algorithm: 'AES-256-CBC',
    keyLength: key.length,
    keyExists: !!localStorage.getItem('chat_encryption_key'),
    lastUpdated: localStorage.getItem('chat_encryption_key_updated') || 'System start'
  };
};
