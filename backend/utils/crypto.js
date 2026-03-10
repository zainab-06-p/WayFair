const EC = require('elliptic').ec;
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const ec = new EC('secp256k1');

class CryptoUtil {
  // Generate key pair for pseudonymous authentication
  generateKeyPair() {
    const keyPair = ec.genKeyPair();
    const publicKey = keyPair.getPublic('hex');
    const privateKey = keyPair.getPrivate('hex');
    
    return {
      publicKey,
      privateKey,
      pseudoID: this.hashPublicKey(publicKey)
    };
  }

  // Hash public key to create pseudonymous ID
  hashPublicKey(publicKey) {
    return crypto.createHash('sha256').update(publicKey).digest('hex');
  }

  // Sign a message with private key
  signMessage(message, privateKey) {
    const key = ec.keyFromPrivate(privateKey, 'hex');
    const msgHash = crypto.createHash('sha256').update(message).digest('hex');
    const signature = key.sign(msgHash);
    
    return {
      r: signature.r.toString('hex'),
      s: signature.s.toString('hex')
    };
  }

  // Verify signature
  verifySignature(message, signature, publicKey) {
    try {
      const key = ec.keyFromPublic(publicKey, 'hex');
      const msgHash = crypto.createHash('sha256').update(message).digest('hex');
      return key.verify(msgHash, signature);
    } catch (error) {
      return false;
    }
  }

  // Generate random challenge for authentication
  generateChallenge() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Hash password
  async hashPassword(password) {
    const salt = await bcrypt.genSalt(parseInt(process.env.SALT_ROUNDS) || 10);
    return bcrypt.hash(password, salt);
  }

  // Verify password
  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  // Generate unique ID
  generateUniqueID(prefix = '') {
    const timestamp = Date.now().toString(36);
    const randomStr = crypto.randomBytes(8).toString('hex');
    return `${prefix}${timestamp}${randomStr}`;
  }

  // Encrypt data
  encrypt(text, key) {
    const algorithm = 'aes-256-cbc';
    const keyBuffer = crypto.createHash('sha256').update(key).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  // Decrypt data
  decrypt(encryptedText, key) {
    const algorithm = 'aes-256-cbc';
    const keyBuffer = crypto.createHash('sha256').update(key).digest();
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

module.exports = new CryptoUtil();
