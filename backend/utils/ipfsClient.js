const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class IPFSClient {
  constructor() {
    this.pinataApiKey = process.env.PINATA_API_KEY;
    this.pinataSecretKey = process.env.PINATA_SECRET_KEY;
    this.pinataJWT = process.env.PINATA_JWT;
    this.pinataBaseUrl = 'https://api.pinata.cloud';
  }

  // Returns true if Pinata credentials are configured
  hasCredentials() {
    return !!(this.pinataJWT || (this.pinataApiKey && this.pinataSecretKey));
  }

  async uploadFile(filePath, fileName) {
    if (!this.hasCredentials()) {
      console.warn('⚠️  IPFS: No Pinata credentials — using local fallback hash');
      return { success: false, ipfsHash: 'LOCAL_' + Date.now(), local: true };
    }
    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));

      const metadata = JSON.stringify({
        name: fileName,
        keyvalues: {
          app: 'rideshare',
          timestamp: new Date().toISOString()
        }
      });
      formData.append('pinataMetadata', metadata);

      const response = await axios.post(
        `${this.pinataBaseUrl}/pinning/pinFileToIPFS`,
        formData,
        {
          maxBodyLength: 'Infinity',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
            'Authorization': `Bearer ${this.pinataJWT}`
          }
        }
      );

      return {
        success: true,
        ipfsHash: response.data.IpfsHash,
        pinSize: response.data.PinSize,
        timestamp: response.data.Timestamp
      };
    } catch (error) {
      console.error('IPFS upload error:', error.response?.data || error.message);
      return { success: false, ipfsHash: 'LOCAL_' + Date.now(), local: true };
    }
  }

  async uploadJSON(jsonData, name) {
    if (!this.hasCredentials()) {
      console.warn('⚠️  IPFS: No Pinata credentials — using local fallback hash');
      return { success: false, ipfsHash: 'LOCAL_' + Date.now(), local: true };
    }
    try {
      const response = await axios.post(
        `${this.pinataBaseUrl}/pinning/pinJSONToIPFS`,
        {
          pinataContent: jsonData,
          pinataMetadata: {
            name: name,
            keyvalues: {
              app: 'rideshare',
              timestamp: new Date().toISOString()
            }
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.pinataJWT}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        ipfsHash: response.data.IpfsHash,
        pinSize: response.data.PinSize,
        timestamp: response.data.Timestamp
      };
    } catch (error) {
      console.error('IPFS JSON upload error:', error.response?.data || error.message);
      return { success: false, ipfsHash: 'LOCAL_' + Date.now(), local: true };
    }
  }

  async getFile(ipfsHash) {
    try {
      const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
      return response.data;
    } catch (error) {
      console.error('IPFS retrieval error:', error.message);
      throw new Error('Failed to retrieve from IPFS');
    }
  }

  // Alias for JSON data (same as getFile — Pinata serves JSON correctly)
  async getJSON(ipfsHash) {
    return this.getFile(ipfsHash);
  }

  async unpinFile(ipfsHash) {
    try {
      await axios.delete(
        `${this.pinataBaseUrl}/pinning/unpin/${ipfsHash}`,
        {
          headers: {
            'Authorization': `Bearer ${this.pinataJWT}`
          }
        }
      );
      return { success: true };
    } catch (error) {
      console.error('IPFS unpin error:', error.response?.data || error.message);
      throw new Error('Failed to unpin from IPFS');
    }
  }
}

module.exports = new IPFSClient();
