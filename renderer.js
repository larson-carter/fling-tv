const { ipcRenderer } = require('electron');

// Initialize the Video.js player with VHS
var player = videojs('video', {
  html5: {
    vhs: {}
  }
});

ipcRenderer.on('pause-video', () => {
  player.pause();
  console.log('Video paused from API call');
});