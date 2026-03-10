const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('./auth');
const ipfsClient = require('../utils/ipfsClient');

// Configure multer
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Upload file to IPFS
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await ipfsClient.uploadFile(
      req.file.path,
      req.file.originalname
    );

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      message: 'File uploaded to IPFS successfully',
      ipfsHash: result.ipfsHash,
      pinSize: result.pinSize,
      timestamp: result.timestamp,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${result.ipfsHash}`
    });

  } catch (error) {
    console.error('IPFS upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload to IPFS' });
  }
});

// Upload JSON to IPFS
router.post('/upload-json', authenticateToken, async (req, res) => {
  try {
    const { data, name } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'No data provided' });
    }

    const result = await ipfsClient.uploadJSON(data, name || 'data');

    res.json({
      message: 'JSON uploaded to IPFS successfully',
      ipfsHash: result.ipfsHash,
      pinSize: result.pinSize,
      timestamp: result.timestamp,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${result.ipfsHash}`
    });

  } catch (error) {
    console.error('IPFS JSON upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload JSON to IPFS' });
  }
});

// Retrieve file from IPFS
router.get('/:ipfsHash', authenticateToken, async (req, res) => {
  try {
    const { ipfsHash } = req.params;

    if (!ipfsHash) {
      return res.status(400).json({ error: 'Missing IPFS hash' });
    }

    const data = await ipfsClient.getFile(ipfsHash);

    res.json({
      message: 'File retrieved from IPFS successfully',
      data,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`
    });

  } catch (error) {
    console.error('IPFS retrieval error:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve from IPFS' });
  }
});

// Unpin file from IPFS
router.delete('/:ipfsHash', authenticateToken, async (req, res) => {
  try {
    const { ipfsHash } = req.params;

    if (!ipfsHash) {
      return res.status(400).json({ error: 'Missing IPFS hash' });
    }

    await ipfsClient.unpinFile(ipfsHash);

    res.json({
      message: 'File unpinned from IPFS successfully',
      ipfsHash
    });

  } catch (error) {
    console.error('IPFS unpin error:', error);
    res.status(500).json({ error: error.message || 'Failed to unpin from IPFS' });
  }
});

module.exports = router;
