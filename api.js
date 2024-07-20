const express = require('express');
const router = express.Router();

// In-memory storage for URLs
const urlStorage = [];

// Helper function to validate YouTube URLs
const isValidYouTubeUrl = (url) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    return youtubeRegex.test(url);
  };
  
  // Route to store YouTube URLs
  router.get('/fling', (req, res) => {
    const url = req.query.url;
    if (url) {
      if (isValidYouTubeUrl(url)) {
        urlStorage.push(url);
        res.json({ message: 'YouTube URL stored successfully', urls: urlStorage });
      } else {
        res.status(400).json({ message: 'Invalid YouTube URL' });
      }
    } else {
      res.status(400).json({ message: 'URL parameter is missing' });
    }
  });

// Route to retrieve all stored URLs
router.get('/fling/urls', (req, res) => {
  res.json({ urls: urlStorage });
});

module.exports = router;
