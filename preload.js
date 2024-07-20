// All the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose ipcRenderer to the renderer process
contextBridge.exposeInMainWorld('api', {
  on: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
  },
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  }
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('Preload script loaded');
  console.log('ipcRenderer:', window.ipcRenderer);
    const replaceText = (selector, text) => {
      const element = document.getElementById(selector)
      if (element) element.innerText = text
    }

        // Expose global isPlaying variable
        ipcRenderer.invoke('get-is-playing').then(isPlaying => {
          window.isPlaying = isPlaying;
      });
  
    for (const dependency of ['chrome', 'node', 'electron']) {
      replaceText(`${dependency}-version`, process.versions[dependency])
    } 
})