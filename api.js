const express = require('express');
const ytdl = require('@distube/ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');
const router = express.Router();

ffmpeg.setFfmpegPath(ffmpegPath);

// In-memory storage for URLs
const urlStorage = [];
let currentIndex = 0;
let isPlaying = false;

// Ensure HLS directory exists
const hlsDir = path.join(__dirname, 'hls');
if (!fs.existsSync(hlsDir)) {
  fs.mkdirSync(hlsDir);
}

router.get('/fling/check-video', (req, res) => {
    // Logic to check if the video file exists
    // For example, check if the m3u8 file exists
    //const fs = require('fs');
    const filePath = path.join(hlsDir, 'video.m3u8');
    console.log(filePath);
    
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            // File does not exist
            res.status(404).send('Video not available');
        } else {
            // File exists
            res.status(200).send('Video available');
        }
    });
});

// Route to store YouTube URLs
router.get('/fling', async (req, res) => {
  const url = req.query.url;
  if (url) {
    if (ytdl.validateURL(url)) {
      urlStorage.push(url);
      console.log(`New URL added: ${url}`);
      fetch('http://localhost/api/fling/play')
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

// Route to stream video as HLS (M3U8)
router.get('/fling/play', async (req, res) => {
  if (urlStorage.length > 0) {
    isPlaying = true;
    const url = urlStorage[currentIndex];
    console.log(`Streaming video from URL: ${url}`);

    let stream;
    try {
      stream = ytdl(url, {
        filter: 'audioandvideo',
        quality: 'highest',
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        },
      });
    } catch (error) {
      console.error('Error fetching stream:', error);
      res.status(500).send('Error fetching video stream');
      return;
    }

    const outputDir = path.join(__dirname, 'hls');
    const outputPath = path.join(outputDir, 'video.m3u8');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Clean up old segments and playlist
    fs.readdir(outputDir, (err, files) => {
      if (err) throw err;
      for (const file of files) {
        fs.unlink(path.join(outputDir, file), err => {
          if (err) throw err;
        });
      }
    });

    ffmpeg(stream)
      .outputOptions([
        '-preset veryfast',
        '-g 48',
        '-sc_threshold 0',
        '-map 0:0',
        '-map 0:1',
        '-c:v libx264',
        '-b:v 800k',
        '-c:a aac',
        '-ar 48000',
        '-b:a 128k',
        '-f hls',
        '-hls_time 4',
        '-hls_playlist_type event',
        '-hls_flags independent_segments',
        '-hls_segment_filename', path.join(outputDir, 'segment%d.ts')
      ])
      .output(outputPath)
      .on('start', commandLine => {
        console.log('Spawned Ffmpeg with command: ' + commandLine);
      })
      .on('progress', progress => {
        console.log('Processing: ' + progress.percent + '% done');
      })
      .on('end', () => {
        console.log('Streaming completed');
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.sendFile(outputPath);
      })
      .on('error', (err, stdout, stderr) => {
        console.error('Error streaming video:', err);
        console.error('ffmpeg stderr:', stderr);
        res.status(500).send('Error streaming video');
      })
      .run();
  } else {
    res.status(400).json({ message: 'No content' });
  }
});

// Serve HLS segments
router.get('/hls/:segment', (req, res) => {
  const segmentPath = path.join(hlsDir, req.params.segment);
  res.sendFile(segmentPath);
});

router.post('/fling/pause', (req, res) => {
  if (global.mainWindow) {
    global.mainWindow.webContents.send('pause-video');
    res.json({ message: 'Video paused' });
  } else {
    res.status(500).json({ message: 'Main window not found' });
  }
});

// Route to play video
router.post('/fling/play', (req, res) => {
  if (global.mainWindow) {
    global.mainWindow.webContents.send('play-video');
  }
  res.json({ message: 'Video playing' });
});

// Route to skip video
router.post('/fling/skip', (req, res) => {
  if (global.mainWindow) {
    global.mainWindow.webContents.send('skip-video');
  }
  res.json({ message: `Video skipped` });
});

// THIS IS THE OLD VERSION OF SKIP.
// // Route to skip to next video
// router.post('/fling/skip', (req, res) => {
//   if (urlStorage.length > 0) {
//     currentIndex = (currentIndex + 1) % urlStorage.length;
//     isPlaying = true;
//     res.json({ message: 'Skipped to next video', url: urlStorage[currentIndex] });
//   } else {
//     res.status(400).json({ message: 'No content' });
//   }
// });

module.exports = router;
