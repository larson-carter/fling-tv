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

// Function to clean up old files
function cleanUpFiles(callback) {
  fs.readdir(hlsDir, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      if (callback) callback(); // Call callback even if there was an error
      return;
    }
    
    let fileCount = files.length;
    if (fileCount === 0) {
      if (callback) callback(); // Call callback if there are no files to delete
      return;
    }

    files.forEach(file => {
      const filePath = path.join(hlsDir, file);
      fs.unlink(filePath, err => {
        if (err) {
          console.error(`Error deleting file ${filePath}:`, err);
        } else {
          console.log(`Deleted file ${filePath}`);
        }

        fileCount--;
        if (fileCount === 0) {
          if (callback) callback(); // Call callback after all files are deleted
        }
      });
    });
  });
}

// Function to play the next video
function playNextVideo() {
  if (urlStorage.length > 0) {
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
      return;
    }

    const outputDir = path.join(__dirname, 'hls');
    const outputPath = path.join(outputDir, 'video.m3u8');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Start processing the stream with ffmpeg
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

        // Notify the client to play the next video
        if (global.mainWindow) {
          global.mainWindow.webContents.send('play-next-video');
        }
      })
      .on('error', (err, stdout, stderr) => {
        console.error('Error streaming video:', err);
        console.error('ffmpeg stderr:', stderr);
      })
      .run();
  }
}

// Route to check if video is available
router.get('/fling/check-video', (req, res) => {
    const filePath = path.join(hlsDir, 'video.m3u8');
    console.log(filePath);
    
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            res.status(404).send('Video not available');
        } else {
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

      // Start playing the new video if no video is currently playing
      if (!isPlaying) {
        isPlaying = true;
        playNextVideo();
      }
      
      res.json({ message: 'YouTube URL stored successfully', urls: urlStorage });
    } else {
      res.status(400).json({ message: 'Invalid YouTube URL' });
    }
  } else {
    res.status(400).json({ message: 'URL parameter is missing' });
  }
});

// Route to retrieve all stored URLs with metadata
router.get('/fling/urls', async (req, res) => {
  try {
    const details = await Promise.all(urlStorage.map(async (url) => {
      const info = await ytdl.getInfo(url);
      return {
        title: info.videoDetails.title,
        url: url,
        thumbnail: info.videoDetails.thumbnails[0].url
      };
    }));

    res.json({ videos: details });
  } catch (error) {
    console.error('Error fetching video details:', error);
    res.status(500).json({ message: 'Error fetching video details' });
  }
});

// Route to stream video as HLS (M3U8)
router.get('/fling/play', async (req, res) => {
  if (urlStorage.length > 0) {
    isPlaying = true;
    playNextVideo();
    res.json({ message: 'Video streaming started' });
  } else {
    res.status(400).json({ message: 'No content' });
  }
});

// Serve HLS segments
router.get('/hls/:segment', (req, res) => {
  const segmentPath = path.join(hlsDir, req.params.segment);
  res.sendFile(segmentPath);
});

// Route to pause video
router.post('/fling/pause', (req, res) => {
  if (global.mainWindow) {
    global.mainWindow.webContents.send('pause-video');
    isPlaying = false; // Update isPlaying state
    res.json({ message: 'Video paused' });
  } else {
    res.status(500).json({ message: 'Main window not found' });
  }
});

// Route to play video
router.post('/fling/play', (req, res) => {
  if (global.mainWindow) {
    global.mainWindow.webContents.send('play-video');
    isPlaying = true; // Update isPlaying state
  }
  res.json({ message: 'Video playing' });
});

// Route to skip video
router.post('/fling/skip', (req, res) => {
  if (urlStorage.length > 0) {
    // Clean up existing files
    cleanUpFiles(() => {
      // Move to the next video
      currentIndex = (currentIndex + 1) % urlStorage.length;
      console.log(`Skipped to next video: ${urlStorage[currentIndex]}`);

      // Trigger playing the next video
      playNextVideo();
      res.json({ message: 'Skipped to next video', url: urlStorage[currentIndex] });
    });
  } else {
    res.status(400).json({ message: 'No content' });
  }
});

// Determine if any content is playing or if it is paused.
router.get('/fling/isPlaying', async (req, res) => {
  const isPlaying = await global.mainWindow.webContents.executeJavaScript('window.isPlaying');
  res.json({ isPlaying });
});

module.exports = router;
