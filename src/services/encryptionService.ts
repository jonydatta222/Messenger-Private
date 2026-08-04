import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';

/**
 * Generates a new TweetNaCl Curve25519 Box KeyPair for End-to-End Encryption
 */
export const generateKeyPair = () => {
  try {
    const keyPair = nacl.box.keyPair();
    return {
      publicKey: encodeBase64(keyPair.publicKey),
      secretKey: encodeBase64(keyPair.secretKey),
    };
  } catch (err) {
    console.error('PRNG KeyPair generation error, using fallback random generator:', err);
    const secretSeed = new Uint8Array(32);
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(secretSeed);
    } else {
      for (let i = 0; i < 32; i++) {
        secretSeed[i] = Math.floor(Math.random() * 256);
      }
    }
    const keyPair = nacl.box.keyPair.fromSecretKey(secretSeed);
    return {
      publicKey: encodeBase64(keyPair.publicKey),
      secretKey: encodeBase64(keyPair.secretKey),
    };
  }
};

/**
 * Encrypts a plain string message with receiver's public key & sender's secret key
 */
export const encryptMessage = (
  secretMessage: string,
  receiverPublicKeyBase64: string,
  myPrivateKeyBase64: string
): string => {
  try {
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const messageUint8 = decodeUTF8(secretMessage);
    const receiverPublicKey = decodeBase64(receiverPublicKeyBase64);
    const myPrivateKey = decodeBase64(myPrivateKeyBase64);

    const encrypted = nacl.box(messageUint8, nonce, receiverPublicKey, myPrivateKey);

    const fullMessage = new Uint8Array(nonce.length + encrypted.length);
    fullMessage.set(nonce);
    fullMessage.set(encrypted, nonce.length);

    return encodeBase64(fullMessage);
  } catch (error) {
    console.error('Encryption failed:', error);
    return secretMessage;
  }
};

/**
 * Decrypts an encrypted base64 payload using sender's public key & my private key
 */
export const decryptMessage = (
  encryptedBase64: string,
  senderPublicKeyBase64: string,
  myPrivateKeyBase64: string
): string | null => {
  try {
    const encryptedData = decodeBase64(encryptedBase64);
    const nonce = encryptedData.slice(0, nacl.box.nonceLength);
    const ciphertext = encryptedData.slice(nacl.box.nonceLength);

    const senderPublicKey = decodeBase64(senderPublicKeyBase64);
    const myPrivateKey = decodeBase64(myPrivateKeyBase64);

    const decrypted = nacl.box.open(ciphertext, nonce, senderPublicKey, myPrivateKey);
    if (!decrypted) return null;

    return encodeUTF8(decrypted);
  } catch (err) {
    console.error('Decryption error:', err);
    return null;
  }
};
