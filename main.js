// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')

require('./mdns')
require('./server')

let mainWindow;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    }
  });

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  ipcMain.on('pause-video', () => {
    if (mainWindow) {
      mainWindow.webContents.send('pause-video');
    }
  });

  ipcMain.on('play-video', () => {
    if (mainWindow) {
      mainWindow.webContents.send('play-video');
    }
  });

  ipcMain.on('skip-video', (event, seconds) => {
    if (mainWindow) {
      mainWindow.webContents.send('skip-video', seconds);
    }
  });

    // Handle requests to get the current video status
    ipcMain.handle('get-is-playing', () => {
      return global.isPlaying;
    });

  global.mainWindow = mainWindow;

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  // HERE IS THE FLING STUFF:
  //mainWindow.loadURL('http://localhost')

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

console.log('Main window:', global.mainWindow);
